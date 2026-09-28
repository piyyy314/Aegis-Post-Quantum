/**
 * AegisVQC: Variational Quantum Classifier (Quantum Neural Network)
 * Built from scratch with exact Parameter Shift Rule gradients,
 * Quantum Adam optimizer, multi-qubit entanglement topologies,
 * and Hilbert space projection for zero-day threat classification.
 */

import { QuantumCircuit } from "../core/QuantumCircuit";
import { QuantumState } from "../core/QuantumState";
import { QuantumGates } from "../core/QuantumGates";
import { QuantumDatasetSample, TrainingEpochMetric, QuantumInferenceResult } from "./types";

export type EntanglementTopology = "linear" | "ring" | "all-to-all";

export interface VQCHyperparameters {
  numQubits: number;
  layers: number;
  learningRate: number;
  topology: EntanglementTopology;
  noiseRate: number;
}

export class AegisVQC {
  readonly numQubits: number;
  readonly layers: number;
  readonly topology: EntanglementTopology;
  learningRate: number;
  noiseRate: number;

  // Variational parameter vectors: 2 parameters per qubit per layer (Ry and Rz)
  // Total parameters = layers * numQubits * 2 + numQubits (final readout rotations)
  parameters: number[];
  
  // Quantum Adam optimizer states
  private m: number[];
  private v: number[];
  private beta1: number = 0.9;
  private beta2: number = 0.999;
  private epsilon: number = 1e-8;
  private t: number = 0;

  constructor(config: Partial<VQCHyperparameters> = {}) {
    this.numQubits = config.numQubits ?? 4;
    this.layers = config.layers ?? 2;
    this.learningRate = config.learningRate ?? 0.08;
    this.topology = config.topology ?? "ring";
    this.noiseRate = config.noiseRate ?? 0.0;

    const totalParams = this.layers * this.numQubits * 2 + this.numQubits;
    // Initialize parameters with standard random normal distribution scaled by pi
    this.parameters = Array.from({ length: totalParams }, () => (Math.random() - 0.5) * Math.PI);
    this.m = new Array(totalParams).fill(0);
    this.v = new Array(totalParams).fill(0);
  }

  /**
   * Build the complete parameterized quantum circuit given input features and parameter array
   */
  buildCircuit(features: number[], params: number[] = this.parameters): QuantumCircuit {
    const circuit = new QuantumCircuit(this.numQubits);

    // 1. Quantum State Preparation (Angle & Superposition Embedding)
    for (let q = 0; q < this.numQubits; q++) {
      circuit.h(q);
      const featVal = features[q % features.length] ?? 0;
      circuit.ry(q, featVal);
      circuit.rz(q, featVal * 0.5);
    }

    // 2. Variational Layers with Entanglement
    let pIdx = 0;
    for (let l = 0; l < this.layers; l++) {
      // Parameterized Single-Qubit Rotations
      for (let q = 0; q < this.numQubits; q++) {
        circuit.ry(q, params[pIdx++]);
        circuit.rz(q, params[pIdx++]);
      }

      // Entanglement Block
      if (this.topology === "linear") {
        for (let q = 0; q < this.numQubits - 1; q++) {
          circuit.cnot(q, q + 1);
        }
      } else if (this.topology === "ring") {
        for (let q = 0; q < this.numQubits; q++) {
          circuit.cnot(q, (q + 1) % this.numQubits);
        }
      } else if (this.topology === "all-to-all") {
        for (let i = 0; i < this.numQubits; i++) {
          for (let j = i + 1; j < this.numQubits; j++) {
            circuit.cnot(i, j);
          }
        }
      }
    }

    // 3. Final Readout Pre-Rotation Layer
    for (let q = 0; q < this.numQubits; q++) {
      circuit.ry(q, params[pIdx++]);
    }

    return circuit;
  }

  /**
   * Forward Pass: Computes total Hamiltonian expectation <H> = 1/N * sum_q <Z_q>
   * Returns a value in [-1, 1], mapped to probability in [0, 1]
   */
  forward(features: number[], params: number[] = this.parameters): {
    expectation: number;
    state: QuantumState;
    probability: number;
  } {
    const circuit = this.buildCircuit(features, params);
    const noise = this.noiseRate > 0 ? { errorRate: this.noiseRate, type: "depolarizing" as const } : undefined;
    const finalState = circuit.execute(undefined, noise);

    let sumZ = 0;
    for (let q = 0; q < this.numQubits; q++) {
      sumZ += finalState.expectationPauliZ(q);
    }
    const expectation = sumZ / this.numQubits;
    // Map expectation [-1, 1] to class probability [0, 1] via sigmoid-like transformation
    const probability = (expectation + 1) / 2;

    return { expectation, state: finalState, probability };
  }

  /**
   * Parameter Shift Rule for exact Quantum Analytic Gradient:
   * d<H>/d theta_j = ( <H>(theta_j + pi/2) - <H>(theta_j - pi/2) ) / 2
   */
  computeGradients(sample: QuantumDatasetSample): number[] {
    const shift = Math.PI / 2;
    const gradients = new Array(this.parameters.length);
    const yTarget = sample.label; // 0 or 1

    // Precompute forward output
    const { probability } = this.forward(sample.features);
    // Binary cross-entropy loss derivative w.r.t probability p: (p - y) / (p * (1 - p))
    // We use mean squared error loss for smooth quantum landscapes: Loss = (p - y)^2
    // dLoss/dp = 2 * (p - y), and dp/d<H> = 0.5 -> dLoss/d<H> = p - y
    const dLoss_dExp = probability - yTarget;

    for (let j = 0; j < this.parameters.length; j++) {
      const origVal = this.parameters[j];

      // Shift + pi/2
      this.parameters[j] = origVal + shift;
      const expPlus = this.forward(sample.features).expectation;

      // Shift - pi/2
      this.parameters[j] = origVal - shift;
      const expMinus = this.forward(sample.features).expectation;

      // Restore original parameter
      this.parameters[j] = origVal;

      // Parameter Shift exact gradient
      const dExp_dTheta = (expPlus - expMinus) / 2.0;
      gradients[j] = dLoss_dExp * dExp_dTheta;
    }

    return gradients;
  }

  /**
   * Train one full epoch on the dataset using Quantum Adam optimization
   */
  trainEpoch(dataset: QuantumDatasetSample[], epochNum: number): TrainingEpochMetric {
    this.t++;
    let totalLoss = 0;
    let correctCount = 0;
    let totalEntropy = 0;

    const accumGradients = new Array(this.parameters.length).fill(0);

    for (const sample of dataset) {
      const { expectation, state, probability } = this.forward(sample.features);
      const loss = Math.pow(probability - sample.label, 2);
      totalLoss += loss;

      const pred = probability >= 0.5 ? 1 : 0;
      if (pred === sample.label) correctCount++;

      totalEntropy += state.getEntanglementEntropy(0);

      // Compute sample gradients
      const sampleGrads = this.computeGradients(sample);
      for (let j = 0; j < this.parameters.length; j++) {
        accumGradients[j] += sampleGrads[j] / dataset.length;
      }
    }

    // Apply Quantum Adam update to parameters
    let gradNormSq = 0;
    for (let j = 0; j < this.parameters.length; j++) {
      const g = accumGradients[j];
      gradNormSq += g * g;

      this.m[j] = this.beta1 * this.m[j] + (1 - this.beta1) * g;
      this.v[j] = this.beta2 * this.v[j] + (1 - this.beta2) * (g * g);

      const mHat = this.m[j] / (1 - Math.pow(this.beta1, this.t));
      const vHat = this.v[j] / (1 - Math.pow(this.beta2, this.t));

      this.parameters[j] -= (this.learningRate * mHat) / (Math.sqrt(vHat) + this.epsilon);
    }

    return {
      epoch: epochNum,
      loss: totalLoss / dataset.length,
      accuracy: (correctCount / dataset.length) * 100,
      entanglementEntropy: totalEntropy / dataset.length,
      gradientNorm: Math.sqrt(gradNormSq),
    };
  }

  /**
   * Run inference on unseen feature vector
   */
  predict(features: number[], shots: number = 0): QuantumInferenceResult {
    const t0 = performance.now();
    const { expectation, state, probability } = this.forward(features);
    const t1 = performance.now();

    const predictedClass = probability >= 0.5 ? 1 : 0;
    const confidence = predictedClass === 1 ? probability : 1 - probability;

    const shotsDist = shots > 0 ? state.sampleMeasurements(shots) : undefined;
    const bloch = state.getBlochCoordinates(0);

    return {
      predictedClass,
      confidence: Math.round(confidence * 1000) / 1000,
      quantumExpectation: Math.round(expectation * 1000) / 1000,
      probabilities: state.getProbabilities().slice(0, 16),
      entanglementEntropy: state.getEntanglementEntropy(0),
      purity: bloch.purity,
      shotsDistribution: shotsDist,
      inferenceTimeMs: Math.round((t1 - t0) * 100) / 100,
      quantumAdvantageRatio: Math.pow(2, this.numQubits),
    };
  }
}
