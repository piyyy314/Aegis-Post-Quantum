/**
 * Cybersecurity Threat Datasets for Custom Quantum AI Models
 * Grounded in post-quantum cryptography, quantum cryptanalysis,
 * and high-entropy telemetry signatures.
 */

import { QuantumDatasetSample } from "../models/types";

export interface CyberScenarioConfig {
  id: string;
  name: string;
  threatType: string;
  featureLabels: string[];
  description: string;
  samples: QuantumDatasetSample[];
}

export const CYBER_SECURITY_DATASETS: CyberScenarioConfig[] = [
  {
    id: "shor_precompute",
    name: "Shor's Factorization & Discrete Log Pre-Computation",
    threatType: "CRQC Quantum Cryptanalysis",
    featureLabels: [
      "Modular Exponentiation Fourier Entropy",
      "Continued Fraction Period Frequency",
      "Order-Finding Quantum Coherence Rate",
      "GCD Modulus Factor Residue",
    ],
    description: "Detects quantum adversary clusters running Shor's quantum phase estimation and modular order-finding pre-computations targeting stored RSA-4096 / ECC certificates.",
    samples: [
      {
        id: "shor_01",
        features: [2.85, 2.92, 3.01, 2.74],
        label: 1,
        category: "Hostile Quantum Threat",
        description: "Active modular period search detected with high constructive interference peaks."
      },
      {
        id: "shor_02",
        features: [0.32, 0.45, 0.28, 0.51],
        label: 0,
        category: "Benign TLS Traffic",
        description: "Standard pseudorandom session token exchange with flat classical frequency response."
      },
      {
        id: "shor_03",
        features: [2.98, 3.10, 2.87, 2.95],
        label: 1,
        category: "Hostile Quantum Threat",
        description: "High-density QFT interference spectrum observed in external certificate queries."
      },
      {
        id: "shor_04",
        features: [0.41, 0.38, 0.52, 0.33],
        label: 0,
        category: "Benign TLS Traffic",
        description: "Random ECDH key derivation packets adhering to uniform noise profile."
      },
      {
        id: "shor_05",
        features: [2.71, 2.84, 3.05, 2.68],
        label: 1,
        category: "Hostile Quantum Threat",
        description: "Shor's quantum register entanglement trace detected in remote API call sequence."
      },
      {
        id: "shor_06",
        features: [0.55, 0.62, 0.48, 0.59],
        label: 0,
        category: "Benign TLS Traffic",
        description: "Encrypted AES-GCM-256 payload stream without quantum periodicity."
      }
    ]
  },
  {
    id: "lattice_sidechannel",
    name: "ML-KEM / Kyber Lattice Side-Channel Leakage",
    threatType: "Physical & Electromagnetic Eavesdropping",
    featureLabels: [
      "Number Theoretic Transform (NTT) Power Variance",
      "Polynomial Decapsulation Timing Delta",
      "High-Frequency EM Trace Spike",
      "Rejection Sampling Clock Jitter",
    ],
    description: "Monitors hardware cryptographic accelerators executing Kyber-768/1024 polynomial multiplications to intercept side-channel power and timing leakage before secret key recovery.",
    samples: [
      {
        id: "lat_01",
        features: [2.90, 2.75, 3.12, 2.88],
        label: 1,
        category: "Physical Side-Channel Attack",
        description: "Correlated power trace leakage detected during NTT polynomial ring coefficient reduction."
      },
      {
        id: "lat_02",
        features: [0.25, 0.31, 0.19, 0.28],
        label: 0,
        category: "Protected PQC Operation",
        description: "Constant-time masked polynomial multiplication with uniform power dissipation."
      },
      {
        id: "lat_03",
        features: [3.05, 2.98, 2.85, 3.10],
        label: 1,
        category: "Physical Side-Channel Attack",
        description: "EM probe localization detected near high-speed post-quantum co-processor."
      },
      {
        id: "lat_04",
        features: [0.42, 0.39, 0.45, 0.37],
        label: 0,
        category: "Protected PQC Operation",
        description: "Stateless Dilithium signature generation within nominal thermal and EM thresholds."
      }
    ]
  },
  {
    id: "hndl_exfil",
    name: "Harvest-Now-Decrypt-Later (HNDL) Data Interception",
    threatType: "Nation-State Passive Eavesdropping",
    featureLabels: [
      "Bulk Encrypted Ciphertext Exfiltration Volume",
      "Payload Longevity Risk Index",
      "Anomalous Route Divergence Angle",
      "Key Exchange Negotiation Downgrade Flag",
    ],
    description: "Identifies strategic state-sponsored interception nodes hoarding encrypted TLS sessions for future quantum decryption once cryptanalytically capable quantum computers arrive.",
    samples: [
      {
        id: "hndl_01",
        features: [2.95, 3.14, 2.80, 3.05],
        label: 1,
        category: "HNDL Interception Active",
        description: "Massive telemetry capture stream redirected through unauthorized autonomous system."
      },
      {
        id: "hndl_02",
        features: [0.35, 0.22, 0.41, 0.18],
        label: 0,
        category: "Authentic Multi-Cloud Route",
        description: "Standard hybrid PQC tunnel with short ephemeral key rotation and no route tap."
      },
      {
        id: "hndl_03",
        features: [3.11, 2.89, 2.96, 2.78],
        label: 1,
        category: "HNDL Interception Active",
        description: "Ciphertext mirroring detected at submarine cable interconnect gateway."
      },
      {
        id: "hndl_04",
        features: [0.49, 0.52, 0.38, 0.44],
        label: 0,
        category: "Authentic Multi-Cloud Route",
        description: "Nominal packet dispersion across verified Zero Trust software-defined mesh."
      }
    ]
  },
  {
    id: "qkd_eavesdrop",
    name: "Satellite Optical QKD Photon Eavesdropping",
    threatType: "Quantum Channel Interception",
    featureLabels: [
      "Quantum Bit Error Rate (QBER)",
      "Multi-Photon State Probability",
      "Polarization Drift Deviation",
      "Visibility Phase Contrast Degradation",
    ],
    description: "Real-time verification of BB84 / decoy-state satellite quantum key distribution channels, detecting Photon Number Splitting (PNS) attacks and beam-splitting intercepts.",
    samples: [
      {
        id: "qkd_01",
        features: [3.02, 2.94, 3.11, 2.89],
        label: 1,
        category: "Quantum Eavesdropper (Eve) Detected",
        description: "QBER elevated to 14.8% exceeding the 11% Shor-Preskill security bound!"
      },
      {
        id: "qkd_02",
        features: [0.18, 0.24, 0.15, 0.29],
        label: 0,
        category: "Secure Quantum Key Channel",
        description: "QBER stable at 2.4%, well below threshold; genuine single-photon transmission."
      },
      {
        id: "qkd_03",
        features: [2.88, 3.08, 2.99, 3.01],
        label: 1,
        category: "Quantum Eavesdropper (Eve) Detected",
        description: "Decoy-state photon statistics indicate active Photon Number Splitting attack."
      },
      {
        id: "qkd_04",
        features: [0.33, 0.29, 0.37, 0.25],
        label: 0,
        category: "Secure Quantum Key Channel",
        description: "Unperturbed optical quantum link with high Bell-state entanglement fidelity."
      }
    ]
  }
];
