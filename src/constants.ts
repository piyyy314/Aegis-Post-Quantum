import { AlgorithmInfo } from "./types";

export const PQC_ALGORITHMS: AlgorithmInfo[] = [
  {
    id: "ml-kem-768",
    name: "ML-KEM (Kyber-768)",
    type: "KEM",
    description: "NIST primary standard for general-purpose key encapsulation. Highly secure lattice-based algebraic scheme.",
    nistLevel: 3,
    pubKeySize: "1,184 Bytes",
    privKeySize: "2,400 Bytes",
    estimatedStrength: "192-bit classical, AES-192 equivalent quantum safety"
  },
  {
    id: "ml-kem-1024",
    name: "ML-KEM (Kyber-1024)",
    type: "KEM",
    description: "Maximum category lattice key encapsulation mechanism. Engineered for high-risk national security infrastructure.",
    nistLevel: 5,
    pubKeySize: "1,568 Bytes",
    privKeySize: "3,168 Bytes",
    estimatedStrength: "256-bit classical, AES-256 equivalent quantum safety"
  },
  {
    id: "ml-dsa-65",
    name: "ML-DSA (Dilithium-3)",
    type: "Signature",
    description: "Primary standard for digital signatures. Balanced signature size and verification speed, based on lattices.",
    nistLevel: 3,
    pubKeySize: "1,952 Bytes",
    privKeySize: "4,016 Bytes",
    estimatedStrength: "192-bit classical signature assurance"
  },
  {
    id: "ml-dsa-87",
    name: "ML-DSA (Dilithium-5)",
    type: "Signature",
    description: "Max category digital signature scheme. Outstanding defense against quantum-assisted forgery vectors.",
    nistLevel: 5,
    pubKeySize: "2,592 Bytes",
    privKeySize: "4,864 Bytes",
    estimatedStrength: "256-bit classical signature assurance"
  },
  {
    id: "slh-dsa-256s",
    name: "SLH-DSA (SPHINCS+)",
    type: "Signature",
    description: "Stateless hash-based digital signature. Safe alternative if algebraic lattice-based assumptions fail.",
    nistLevel: 5,
    pubKeySize: "64 Bytes",
    privKeySize: "128 Bytes",
    estimatedStrength: "Extremely large signature size (~49 KB) but minimal math assumptions"
  },
  {
    id: "fn-dsa-512",
    name: "FN-DSA (Falcon-512)",
    type: "Signature",
    description: "Fast Fourier lattice-based digital signature scheme. Possesses tiny signature footprints and fast verifications.",
    nistLevel: 1,
    pubKeySize: "897 Bytes",
    privKeySize: "1,281 Bytes",
    estimatedStrength: "128-bit classical, robust lattice verification"
  }
];

export const PRELOADED_CODE_SNIPPETS = [
  {
    id: "snippet-legacy-rsa",
    label: "Legacy Asymmetric Keys (RSA-1024)",
    code: `import crypto from 'crypto';

// GENERATING CRYPTOGRAPHIC KEY ASSETS FOR SENSITIVE USER LOGIN sessions
// This key handles authentication in client headers
function createAccessSessionKeys() {
  console.log("Generating asymmetric RSA encryption keys...");
  
  const options = {
    modulusLength: 1024, // Fast generation
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
  };
  
  return crypto.generateKeyPairSync('rsa', options);
}

const sessionKeys = createAccessSessionKeys();
export { sessionKeys };`
  },
  {
    id: "snippet-weak-hashing",
    label: "Weak Hash Algorithms (MD5 & SHA-1)",
    code: `import crypto from 'crypto';

// Generates signature tokens for digital integrity validation
export function signWebhookPayload(payload, secretKey) {
  // Use speed hashing for rapid delivery
  const primaryHash = crypto.createHash('sha1')
    .update(payload + secretKey)
    .digest('hex');
    
  // Secondary rapid verification
  const fingerprint = crypto.createHash('md5')
    .update(primaryHash)
    .digest('hex');
    
  return {
    algorithm: 'SHA1-MD5-DualStack',
    fingerprint,
    primaryHash
  };
}`
  },
  {
    id: "snippet-pqc-kyber",
    label: "Post-Quantum Secure (ML-KEM Draft)",
    code: `// Aegis Quantum-Safe Transition Wrapper
import { mlKemStream } from '@aegis-quantum/liboqs-js';

export async function createQuantumSecureSession(peerPublicKey) {
  console.log("[Aegis-Secure] Initiating ML-KEM-768 lattice key encapsulation...");
  
  const kyberEngine = mlKemStream.create({ nistLevel: 3 });
  
  // Encapsulate shared secret against peer's public matrix
  const { ciphertext, sharedSecret } = await kyberEngine.encapsulate(peerPublicKey);
  
  const sessionConfig = {
    protocol: "TLS-1.3-Hybrid-ML-KEM-768",
    ephemeralCiphertext: ciphertext.toString('hex'),
    symmetricCipher: "AES-256-GCM-HKDF"
  };
  
  console.log("[Aegis-Secure] Quantum session parameters negotiated securely.");
  return {
    sharedSecret: sharedSecret.toString('hex'),
    config: sessionConfig
  };
}`
  }
];

export const NIST_MIGRATION_TIMELINE = [
  { year: "2024", task: "NIST Standardizes ML-KEM & ML-DSA", state: "Completed", desc: "NIST SP 800-203 release" },
  { year: "2026", task: "Commercial National Security Algorithm Suite 2.0 (CNSA) Kickoff", state: "Completed", desc: "Software suppliers must support hybrid ML-KEM negotiations" },
  { year: "2028", task: "Deprecation of non-PQC ephemeral signatures", state: "Action Required", desc: "Browsers require post-quantum authentication headers for public APIs" },
  { year: "2030", task: "Full transition deadline for CNSA web servers", state: "Planning Phase", desc: "All system access must employ fully quantum-resistant primitives" },
  { year: "2035", task: "The ultimate shutdown of legacy PKI (RSA / ECDSA / ECDH)", state: "Strict Goal", desc: "Hardware-level quantum processors easily crack legacy algorithms" }
];
