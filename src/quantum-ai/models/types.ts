/**
 * Quantum AI Models - Common Type Definitions
 */

export type QuantumModelId = "vqc" | "qsvm" | "qrc" | "qgan" | "vqe";

export interface QuantumModelDescriptor {
  id: QuantumModelId;
  name: string;
  tagline: string;
  architecture: string;
  quantumFeatureMap: string;
  mathematicalFoundation: string;
  cyberUseCases: string[];
  theoreticalAdvantage: string;
  defaultQubits: number;
  maxQubits: number;
  defaultLayers: number;
}

export interface TrainingEpochMetric {
  epoch: number;
  loss: number;
  accuracy: number;
  entanglementEntropy: number;
  gradientNorm: number;
  fidelity?: number;
}

export interface QuantumDatasetSample {
  id: string;
  features: number[]; // normalized [0, pi]
  label: number;      // 0 or 1
  category: string;
  description: string;
}

export interface QuantumInferenceResult {
  predictedClass: number; // 0 or 1
  confidence: number;     // 0 to 1
  quantumExpectation: number; // [-1, 1]
  probabilities: number[];
  entanglementEntropy: number;
  purity: number;
  shotsDistribution?: Record<string, number>;
  inferenceTimeMs: number;
  quantumAdvantageRatio: number; // Theoretical Hilbert space scaling ratio
}

export interface QuantumBenchmarkRow {
  modelId: QuantumModelId;
  modelName: string;
  accuracy: number;
  circuitDepth: number;
  parameterCount: number;
  meanEntanglementEntropy: number;
  quantumKernelRank: number;
  classicalFlopsEquivalent: string;
  cryptanalysisResistance: string;
}
