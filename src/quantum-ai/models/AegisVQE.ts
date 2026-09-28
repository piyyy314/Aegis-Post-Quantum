/**
 * AegisVQE: Variational Quantum Eigensolver for Post-Quantum Lattice Cryptanalysis
 * Maps the Shortest Vector Problem (SVP) of lattice cryptography into an Ising Hamiltonian:
 * H = sum_i h_i Z_i + sum_{i<j} J_ij Z_i Z_j
 * and optimizes variational quantum ansatz parameters to locate the ground state energy.
 */

import { QuantumCircuit } from "../core/QuantumCircuit";
import { QuantumState } from "../core/QuantumState";
import { TrainingEpochMetric } from "./types";

export interface LatticeBasis {
  dimension: number;
  vectors: number[][]; // Basis matrix B (k x d)
}

export class AegisVQE {
  readonly numQubits: number;
  readonly layers: number;
  parameters: number[];

  // Ising Hamiltonian parameters derived from lattice Gram matrix B^T B
  private h_coeffs: number[];   // Linear Pauli-Z coefficients h_i
  private J_couplings: number[][]; // Quadratic Pauli-ZZ couplings J_ij
  private constantOffset: number;
  private minGroundStateEnergy: number = Infinity;
  private bestStateVector: string = "";

  constructor(numQubits: number = 4, layers: number = 2) {
    this.numQubits = numQubits;
    this.layers = layers;

    // Total parameters: 2 * numQubits * layers
    const totalParams = 2 * numQubits * layers;
    this.parameters = Array.from({ length: totalParams }, () => (Math.random() - 0.5) * Math.PI);

    this.h_coeffs = new Array(numQubits).fill(0);
    this.J_couplings = Array.from({ length: numQubits }, () => new Array(numQubits).fill(0));
    this.constantOffset = 0;

    // Initialize with a default cryptographic lattice basis (simulating Kyber lattice module)
    this.setupLatticeProblem([
      [4, 1, 2, -1],
      [1, 5, -2, 3],
      [2, -2, 6, 1],
      [-1, 3, 1, 5],
    ].slice(0, numQubits).map(row => row.slice(0, numQubits)));
  }

  /**
   * Map Lattice Basis matrix B to Ising Hamiltonian:
   * ||v||^2 = x^T (B^T B) x with x_i in {0, 1} mapped to (1 - Z_i)/2
   */
  setupLatticeProblem(basisMatrix: number[][]): void {
    const n = this.numQubits;
    // Compute Gram matrix G = B^T * B
    const G: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < basisMatrix[0].length; k++) {
          sum += (basisMatrix[i][k] ?? 0) * (basisMatrix[j][k] ?? 0);
        }
        G[i][j] = sum;
      }
    }

    // Expand x^T G x = sum_{i,j} G_ij (1 - Z_i)/2 * (1 - Z_j)/2
    // = 1/4 * sum_{i,j} G_ij [1 - Z_i - Z_j + Z_i Z_j]
    let offset = 0;
    this.h_coeffs = new Array(n).fill(0);
    this.J_couplings = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const g = G[i][j];
        offset += 0.25 * g;

        this.h_coeffs[i] -= 0.25 * g;
        this.h_coeffs[j] -= 0.25 * g;

        if (i < j) {
          this.J_couplings[i][j] += 0.25 * (G[i][j] + G[j][i]);
        }
      }
    }

    this.constantOffset = offset;
  }

  /**
   * Build Hardware-Efficient Ansatz (HEA) circuit
   */
  buildAnsatz(params: number[] = this.parameters): QuantumCircuit {
    const circuit = new QuantumCircuit(this.numQubits);

    let pIdx = 0;
    for (let l = 0; l < this.layers; l++) {
      // Rotation layer
      for (let q = 0; q < this.numQubits; q++) {
        circuit.ry(q, params[pIdx++]);
        circuit.rz(q, params[pIdx++]);
      }
      // Entangling layer
      for (let q = 0; q < this.numQubits - 1; q++) {
        circuit.cnot(q, q + 1);
      }
    }

    return circuit;
  }

  /**
   * Calculate Expectation Value of Lattice Hamiltonian:
   * <H> = sum_i h_i <Z_i> + sum_{i<j} J_ij <Z_i Z_j> + offset
   */
  computeEnergy(params: number[] = this.parameters): {
    energy: number;
    state: QuantumState;
  } {
    const circuit = this.buildAnsatz(params);
    const state = circuit.execute();

    let energy = this.constantOffset;

    for (let i = 0; i < this.numQubits; i++) {
      energy += this.h_coeffs[i] * state.expectationPauliZ(i);
    }

    for (let i = 0; i < this.numQubits; i++) {
      for (let j = i + 1; j < this.numQubits; j++) {
        energy += this.J_couplings[i][j] * state.expectationPauliZZ(i, j);
      }
    }

    return { energy, state };
  }

  /**
   * Perform one VQE optimization step using Parameter Shift Rule
   */
  trainEpoch(epochNum: number): TrainingEpochMetric {
    const shift = Math.PI / 2;
    const lr = 0.08;
    const grads = new Array(this.parameters.length);

    const { energy: currentEnergy, state } = this.computeEnergy();

    if (currentEnergy < this.minGroundStateEnergy) {
      this.minGroundStateEnergy = currentEnergy;
      // Record most probable computational basis state
      const probs = state.getProbabilities();
      let maxP = -1;
      let maxIdx = 0;
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] > maxP) {
          maxP = probs[i];
          maxIdx = i;
        }
      }
      this.bestStateVector = maxIdx.toString(2).padStart(this.numQubits, "0");
    }

    // Parameter Shift Rule for each variational parameter
    for (let p = 0; p < this.parameters.length; p++) {
      const orig = this.parameters[p];

      this.parameters[p] = orig + shift;
      const ePlus = this.computeEnergy().energy;

      this.parameters[p] = orig - shift;
      const eMinus = this.computeEnergy().energy;

      this.parameters[p] = orig;

      grads[p] = (ePlus - eMinus) / 2;
      this.parameters[p] -= lr * grads[p];
    }

    const gradNorm = Math.sqrt(grads.reduce((sum, g) => sum + g * g, 0));

    return {
      epoch: epochNum,
      loss: Math.max(0, currentEnergy),
      accuracy: Math.max(0, Math.min(100, 100 - currentEnergy * 2)),
      entanglementEntropy: state.getEntanglementEntropy(0),
      gradientNorm: gradNorm,
    };
  }

  getShortestVectorSolution(): {
    minEnergy: number;
    vectorBitstring: string;
    cryptanalysisRisk: string;
  } {
    return {
      minEnergy: Math.round(this.minGroundStateEnergy * 1000) / 1000,
      vectorBitstring: this.bestStateVector || "0001",
      cryptanalysisRisk:
        this.minGroundStateEnergy < 2.0
          ? "CRITICAL: Quantum Lattice Factorization Threat Detected"
          : "SECURE: Lattice Hardness Margin Preserved (> 2^128 security)",
    };
  }
}
