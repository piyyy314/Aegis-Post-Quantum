/**
 * AegisQGAN: Quantum Generative Adversarial Network for PQC Stress-Testing
 * Quantum Generator produces synthetic quantum noise & lattice perturbation vectors,
 * while the Discriminator evaluates adversarial evasion potential in Post-Quantum Cryptography.
 */

import { QuantumCircuit } from "../core/QuantumCircuit";
import { QuantumState } from "../core/QuantumState";
import { TrainingEpochMetric } from "./types";

export class AegisQGAN {
  readonly numQubits: number;
  readonly layers: number;

  // Generator parameters (quantum circuit rotations)
  genParams: number[];
  // Discriminator parameters (weights and bias)
  discWeights: number[];
  discBias: number;

  private lrGen: number = 0.05;
  private lrDisc: number = 0.05;

  constructor(numQubits: number = 4, layers: number = 2) {
    this.numQubits = numQubits;
    this.layers = layers;

    // Generator has 2 rotation parameters per qubit per layer
    const totalGenParams = layers * numQubits * 2;
    this.genParams = Array.from({ length: totalGenParams }, () => (Math.random() - 0.5) * Math.PI);

    // Discriminator takes numQubits expectation features
    this.discWeights = Array.from({ length: numQubits }, () => (Math.random() - 0.5) * 0.5);
    this.discBias = 0;
  }

  /**
   * Build Quantum Generator Circuit:
   * Maps |0...0> -> H^n -> [Ry(theta) -> Rz(phi) -> CNOT-ring]^L
   */
  buildGeneratorCircuit(params: number[] = this.genParams): QuantumCircuit {
    const circuit = new QuantumCircuit(this.numQubits);

    // Latent quantum superposition
    for (let q = 0; q < this.numQubits; q++) {
      circuit.h(q);
    }

    let pIdx = 0;
    for (let l = 0; l < this.layers; l++) {
      for (let q = 0; q < this.numQubits; q++) {
        circuit.ry(q, params[pIdx++]);
        circuit.rz(q, params[pIdx++]);
      }
      for (let q = 0; q < this.numQubits; q++) {
        circuit.cnot(q, (q + 1) % this.numQubits);
      }
    }

    return circuit;
  }

  /**
   * Generate synthetic quantum noise / perturbation vector from Generator:
   * Extracts Pauli Z expectations from generated quantum state
   */
  generate(): {
    syntheticVector: number[];
    state: QuantumState;
  } {
    const circ = this.buildGeneratorCircuit();
    const state = circ.execute();

    const vector: number[] = [];
    for (let q = 0; q < this.numQubits; q++) {
      // Scale Pauli Z expectation [-1, 1] to normalized perturbation in [-pi, pi]
      vector.push(state.expectationPauliZ(q) * Math.PI);
    }

    return { syntheticVector: vector, state };
  }

  /**
   * Discriminator forward evaluation: D(x) in [0, 1]
   */
  discriminator(x: number[]): number {
    let logit = this.discBias;
    for (let i = 0; i < this.numQubits; i++) {
      const val = (x[i % x.length] ?? 0) / Math.PI; // normalize to [-1, 1]
      logit += val * this.discWeights[i];
    }
    return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, logit))));
  }

  /**
   * Train one adversarial epoch with real authentic lattice noise samples
   */
  trainEpoch(realSamples: number[][], epochNum: number): TrainingEpochMetric {
    let dLossTotal = 0;
    let gLossTotal = 0;
    let entropyTotal = 0;

    for (const realVec of realSamples) {
      // 1. Train Discriminator on Real Sample
      const dReal = this.discriminator(realVec);
      const dRealLoss = -Math.log(Math.max(1e-7, dReal));

      // 2. Generate Synthetic Fake Sample
      const { syntheticVector, state } = this.generate();
      entropyTotal += state.getEntanglementEntropy(0);

      const dFake = this.discriminator(syntheticVector);
      const dFakeLoss = -Math.log(Math.max(1e-7, 1 - dFake));

      // Discriminator Loss = -(log(D(real)) + log(1 - D(fake)))
      const dLoss = (dRealLoss + dFakeLoss) / 2;
      dLossTotal += dLoss;

      // Update Discriminator weights (gradient ascent on D log likelihood)
      const gradReal = (1 - dReal);
      const gradFake = -dFake;

      for (let i = 0; i < this.numQubits; i++) {
        const xReal = (realVec[i % realVec.length] ?? 0) / Math.PI;
        const xFake = (syntheticVector[i] ?? 0) / Math.PI;
        const dw = 0.5 * (gradReal * xReal + gradFake * xFake);
        this.discWeights[i] += this.lrDisc * dw;
      }
      this.discBias += this.lrDisc * 0.5 * (gradReal + gradFake);

      // 3. Train Quantum Generator (fool the discriminator)
      // Loss_G = -log(D(G(z)))
      const dFakeAfter = this.discriminator(syntheticVector);
      const gLoss = -Math.log(Math.max(1e-7, dFakeAfter));
      gLossTotal += gLoss;

      // Parameter shift update on Generator parameters
      const shift = Math.PI / 2;
      for (let p = 0; p < this.genParams.length; p++) {
        const orig = this.genParams[p];

        this.genParams[p] = orig + shift;
        const plusVec = this.generate().syntheticVector;
        const dPlus = this.discriminator(plusVec);

        this.genParams[p] = orig - shift;
        const minusVec = this.generate().syntheticVector;
        const dMinus = this.discriminator(minusVec);

        this.genParams[p] = orig;

        // Gradient of D(G(z)) w.r.t generator parameter
        const dD_dTheta = (dPlus - dMinus) / 2;
        // dLoss_G / dTheta = -(1 / D) * dD/dTheta
        const gradG = -(1 / Math.max(1e-5, dFakeAfter)) * dD_dTheta;

        this.genParams[p] -= this.lrGen * Math.max(-1.0, Math.min(1.0, gradG));
      }
    }

    const n = realSamples.length;
    return {
      epoch: epochNum,
      loss: (dLossTotal + gLossTotal) / (2 * n),
      accuracy: Math.max(50, Math.min(100, (1 - Math.abs(dLossTotal / n - 0.693)) * 100)),
      entanglementEntropy: entropyTotal / n,
      gradientNorm: Math.sqrt(this.discWeights.reduce((acc, w) => acc + w * w, 0)),
    };
  }
}
