/**
 * AegisQRC: Quantum Reservoir Computing Architecture
 * Uses a disordered Transverse-Field Ising spin network to provide
 * high-dimensional quantum recurrent dynamics and instantaneous Ridge regression readout.
 */

import { QuantumCircuit } from "../core/QuantumCircuit";
import { QuantumState } from "../core/QuantumState";
import { QuantumGates } from "../core/QuantumGates";
import { QuantumDatasetSample, QuantumInferenceResult } from "./types";

export class AegisQRC {
  readonly numQubits: number;
  readonly evolutionSteps: number;
  private couplingMatrix: number[][]; // J_ij
  private transverseFields: number[]; // h_i
  private readoutWeights: number[] = [];
  private lambdaReg: number = 1e-4; // Ridge regularization parameter

  constructor(numQubits: number = 4, evolutionSteps: number = 3) {
    this.numQubits = numQubits;
    this.evolutionSteps = evolutionSteps;

    // Initialize disordered spin-spin couplings J_ij ~ Normal(0, 1)
    this.couplingMatrix = Array.from({ length: numQubits }, () =>
      Array.from({ length: numQubits }, () => (Math.random() - 0.5) * 1.5)
    );
    // Symmetrize coupling
    for (let i = 0; i < numQubits; i++) {
      this.couplingMatrix[i][i] = 0;
      for (let j = i + 1; j < numQubits; j++) {
        const val = this.couplingMatrix[i][j];
        this.couplingMatrix[j][i] = val;
      }
    }

    // Initialize transverse fields h_i
    this.transverseFields = Array.from({ length: numQubits }, () => (Math.random() - 0.5) * 2.0);
  }

  /**
   * Evolve quantum reservoir with injected feature vector u
   * Returns high-dimensional observable expectation vector
   */
  processSample(features: number[]): {
    stateVector: number[];
    quantumState: QuantumState;
  } {
    const circuit = new QuantumCircuit(this.numQubits);

    // Initial state preparation with input injection
    for (let q = 0; q < this.numQubits; q++) {
      circuit.h(q);
      const val = features[q % features.length] ?? 0;
      circuit.ry(q, val);
    }

    // Unitary Time Evolution under Ising Hamiltonian H = sum J_ij Z_i Z_j + sum h_i X_i
    // Suzuki-Trotter decomposition steps
    for (let step = 0; step < this.evolutionSteps; step++) {
      const dt = 0.4;

      // 1. Two-body Ising ZZ interactions: exp(-i * J_ij * dt * Z_i Z_j)
      for (let i = 0; i < this.numQubits; i++) {
        for (let j = i + 1; j < this.numQubits; j++) {
          const J_ij = this.couplingMatrix[i][j];
          const angle = 2 * J_ij * dt;
          circuit.cnot(i, j);
          circuit.rz(j, angle);
          circuit.cnot(i, j);
        }
      }

      // 2. Transverse field X rotations: exp(-i * h_i * dt * X_i)
      for (let i = 0; i < this.numQubits; i++) {
        const h_i = this.transverseFields[i];
        circuit.rx(i, 2 * h_i * dt);
      }
    }

    const finalState = circuit.execute();

    // Extract reservoir observable state vector S(t):
    // 1. Bias term: 1.0
    // 2. Single-qubit Pauli Z expectations: <Z_i>
    // 3. Single-qubit Pauli X expectations: <X_i>
    // 4. Two-qubit correlation expectations: <Z_i Z_j>
    const reservoirState: number[] = [1.0];

    for (let i = 0; i < this.numQubits; i++) {
      reservoirState.push(finalState.expectationPauliZ(i));
      reservoirState.push(finalState.expectationPauliX(i));
    }

    for (let i = 0; i < this.numQubits; i++) {
      for (let j = i + 1; j < this.numQubits; j++) {
        reservoirState.push(finalState.expectationPauliZZ(i, j));
      }
    }

    return {
      stateVector: reservoirState,
      quantumState: finalState,
    };
  }

  /**
   * Train readout weights in closed-form via Tikhonov-regularized Ridge Regression:
   * W = (S^T S + lambda * I)^(-1) S^T Y
   */
  train(dataset: QuantumDatasetSample[]): {
    accuracy: number;
    trainingTimeMs: number;
    featureDimension: number;
  } {
    const t0 = performance.now();
    const S: number[][] = [];
    const Y: number[] = [];

    for (const sample of dataset) {
      const { stateVector } = this.processSample(sample.features);
      S.push(stateVector);
      Y.push(sample.label === 1 ? 1 : -1);
    }

    const n = S.length;
    const d = S[0].length; // Feature dimension

    // Compute S^T S (d x d matrix)
    const StS: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += S[k][i] * S[k][j];
        }
        StS[i][j] = sum;
      }
      // Add Tikhonov ridge regularization
      StS[i][i] += this.lambdaReg;
    }

    // Compute S^T Y (d x 1 vector)
    const StY: number[] = new Array(d).fill(0);
    for (let i = 0; i < d; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += S[k][i] * Y[k];
      }
      StY[i] = sum;
    }

    // Solve linear system: StS * W = StY using Gauss-Jordan elimination
    this.readoutWeights = this.solveLinearSystem(StS, StY);

    // Compute training accuracy
    let correct = 0;
    for (let k = 0; k < n; k++) {
      let predVal = 0;
      for (let i = 0; i < d; i++) {
        predVal += S[k][i] * this.readoutWeights[i];
      }
      const pred = predVal >= 0 ? 1 : 0;
      if (pred === dataset[k].label) correct++;
    }

    const t1 = performance.now();

    return {
      accuracy: (correct / n) * 100,
      trainingTimeMs: Math.round((t1 - t0) * 100) / 100,
      featureDimension: d,
    };
  }

  predict(features: number[]): QuantumInferenceResult {
    const t0 = performance.now();
    const { stateVector, quantumState } = this.processSample(features);

    let predVal = 0;
    for (let i = 0; i < this.readoutWeights.length; i++) {
      predVal += stateVector[i] * this.readoutWeights[i];
    }
    const t1 = performance.now();

    const predictedClass = predVal >= 0 ? 1 : 0;
    const prob = 1 / (1 + Math.exp(-Math.max(-8, Math.min(8, predVal * 2))));
    const confidence = predictedClass === 1 ? prob : 1 - prob;

    return {
      predictedClass,
      confidence: Math.round(confidence * 1000) / 1000,
      quantumExpectation: Math.round(predVal * 1000) / 1000,
      probabilities: quantumState.getProbabilities().slice(0, 16),
      entanglementEntropy: quantumState.getEntanglementEntropy(0),
      purity: quantumState.getBlochCoordinates(0).purity,
      inferenceTimeMs: Math.round((t1 - t0) * 100) / 100,
      quantumAdvantageRatio: Math.pow(2, this.numQubits) * 2,
    };
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    // Augmented matrix
    const M: number[][] = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      // Swap rows
      for (let k = i; k < n + 1; k++) {
        const tmp = M[maxRow][k];
        M[maxRow][k] = M[i][k];
        M[i][k] = tmp;
      }

      // Pivot normalization
      const pivot = M[i][i];
      if (Math.abs(pivot) < 1e-12) continue;
      for (let k = i; k < n + 1; k++) {
        M[i][k] /= pivot;
      }

      // Eliminate other rows
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = M[k][i];
          for (let j = i; j < n + 1; j++) {
            M[k][j] -= factor * M[i][j];
          }
        }
      }
    }

    return M.map(row => row[n]);
  }
}
