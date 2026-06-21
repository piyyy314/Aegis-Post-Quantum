import React, { useState } from "react";
import { 
  Key, RefreshCw, Cpu, Database, Save, Copy, Check, Info, Lock
} from "lucide-react";
import { PQC_ALGORITHMS } from "../constants";
import { GeneratedKey } from "../types";

export function KeyGenerator({ onKeyGenerated }: { onKeyGenerated?: () => void }) {
  const [selectedAlgoId, setSelectedAlgoId] = useState("ml-kem-768");
  const [nistLevel, setNistLevel] = useState(3);
  const [seedBytes, setSeedBytes] = useState("AEGIS_ROOT_SEED_MATRIX_77A823B");
  const [isDeriving, setIsDeriving] = useState(false);
  const [derivationStep, setDerivationStep] = useState("");
  const [derivedKey, setDerivedKey] = useState<GeneratedKey | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const selectedAlgo = PQC_ALGORITHMS.find(a => a.id === selectedAlgoId) || PQC_ALGORITHMS[0];

  const triggerDerivation = () => {
    setIsDeriving(true);
    setDerivedKey(null);

    const steps = [
      "📡 Pulling high-entropy random sequence from hardware socket...",
      "🔢 Seed Expansion: Injecting seed into SHAKE-256 absorb function...",
      "📐 Solving Learning-with-Errors (LWE) coordinate polynomials in modular dimension...",
      "🧬 Fitting Gaussian error distributions into lattice matrices...",
      "📦 Formatting Post-Quantum certificate: Packaging Public Matrix (A) and Secret Vector (s)...",
      "🔒 Finalizing cryptographic container: Certifying PQC parameters with SHA3 checksum..."
    ];

    let current = 0;
    setDerivationStep(steps[0]);

    const interval = setInterval(() => {
      current++;
      if (current < steps.length) {
        setDerivationStep(steps[current]);
      } else {
        clearInterval(interval);
        finalizeKeypair();
      }
    }, 600);
  };

  const finalizeKeypair = () => {
    // Generate simulated keys
    const entropyBits = nistLevel === 1 ? 128 : nistLevel === 3 ? 192 : 256;
    const keySize = selectedAlgo.pubKeySize;
    const mockPubKeyHex = "-----BEGIN POST-QUANTUM PUBLIC KEY-----\n" +
      btoa(Array.from({ length: 48 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join("")) + "\n" +
      btoa(Array.from({ length: 48 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join("")) + "\n" +
      "-----END POST-QUANTUM PUBLIC KEY-----";

    const mockPrivKeyHex = "-----BEGIN POST-QUANTUM SECRET KEY-----\n" +
      btoa(Array.from({ length: 48 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join("")) + "\n" +
      btoa(Array.from({ length: 48 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join("")) + "\n" +
      btoa(Array.from({ length: 48 }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join("")) + "\n" +
      "-----END POST-QUANTUM SECRET KEY-----";

    const quantumLabels = {
      1: "Robust (NIST Level 1 - 128-bit security equivalent)",
      3: "Advanced (NIST Level 3 - 192-bit security equivalent)",
      5: "Impenetrable (NIST Level 5 - 256-bit security equivalent)"
    };

    setDerivedKey({
      id: "KEY-" + Math.random().toString(16).substring(2, 8).toUpperCase(),
      algorithmName: selectedAlgo.name,
      algorithmType: selectedAlgo.type,
      timestamp: new Date().toLocaleTimeString(),
      publicKeyHex: mockPubKeyHex,
      privateKeyHex: mockPrivKeyHex,
      keySizeBits: selectedAlgo.type === "KEM" ? nistLevel * 1024 : nistLevel * 2048,
      entropyBits,
      nistLevel,
      generationSpeedMs: Math.floor(Math.random() * 12) + 2,
      estimatedLifetime: nistLevel === 5 ? "50+ Years (Defeats CRQC/Shor's)" : "30 Years (Safe against standard Shor's algorithm)",
      quantumCrackResistance: quantumLabels[nistLevel as 1 | 3 | 5] || "Quantum Defended"
    });

    if (onKeyGenerated) {
      onKeyGenerated();
    }

    setIsDeriving(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Parameters configuration */}
      <div className="lg:col-span-4 space-y-6">
        <div className="border border-[#14f7ff]/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
            <Cpu className="w-5 h-5 text-[#14f7ff]" />
            <h3 className="font-mono text-base font-semibold text-white uppercase tracking-wider">PQC Sandbox Controls</h3>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Algorithm selector */}
            <div>
              <label className="block text-[#14f7ff] uppercase tracking-wider mb-2 font-bold text-[10px]">Select Post-Quantum Primitive</label>
              <select 
                value={selectedAlgoId}
                onChange={(e) => {
                  setSelectedAlgoId(e.target.value);
                  const algo = PQC_ALGORITHMS.find(a => a.id === e.target.value);
                  if (algo) setNistLevel(algo.nistLevel);
                }}
                className="w-full bg-[#060a13] border border-[#14f7ff]/20 rounded-md p-2.5 text-white/90 focus:border-[#14f7ff]/60"
              >
                {PQC_ALGORITHMS.map(algo => (
                  <option key={algo.id} value={algo.id}>{algo.name} ({algo.type})</option>
                ))}
              </select>
            </div>

            {/* NIST level */}
            <div>
              <label className="block text-[#14f7ff] uppercase tracking-wider mb-2 font-bold text-[10px]">NIST Security Strengths Level</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 5].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setNistLevel(lvl)}
                    className={`py-1.5 rounded text-[10.5px] border transition-all ${
                      nistLevel === lvl 
                        ? "bg-[#14f7ff]/20 text-[#14f7ff] border-[#14f7ff]/80 font-bold" 
                        : "bg-[#060a13] text-[#ffffff]/30 border-transparent hover:border-[#14f7ff]/20"
                    }`}
                  >
                    Level {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/50 mt-1.5 leading-relaxed">
                {nistLevel === 1 && "Level 1: Secure equivalent of AES-128 classical exhaustion."}
                {nistLevel === 3 && "Level 3: Secure equivalent of AES-192 classical exhaustion."}
                {nistLevel === 5 && "Level 5: Supreme standard. Deploys maximum classical matrix ranks safely."}
              </p>
            </div>

            {/* Custom Seed Context */}
            <div>
              <label className="block text-[#14f7ff] uppercase tracking-wider mb-2 font-bold text-[10px]">Root Entropy Seed Input</label>
              <input
                type="text"
                value={seedBytes}
                onChange={(e) => setSeedBytes(e.target.value)}
                placeholder="Hex/String initialization seed"
                className="w-full bg-[#060a13] border border-white/10 rounded-md p-2 text-white/90 placeholder-white/20 select-text"
              />
            </div>

            {/* Derive Trigger */}
            <button
              onClick={triggerDerivation}
              disabled={isDeriving}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-[#14f7ff]/10 hover:bg-[#14f7ff]/25 border border-[#14f7ff]/50 hover:border-[#14f7ff] text-[#14f7ff] py-3 rounded-md font-bold text-sm tracking-wider uppercase cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              {isDeriving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#14f7ff]" />
                  Solving Lattices...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Derive Quantum Keypair
                </>
              )}
            </button>
          </div>
        </div>

        {/* Algorithm detail card */}
        <div className="border border-white/5 bg-[#090e1f] rounded-xl p-5 text-sans">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Info className="w-4.5 h-4.5 text-[#14f7ff]" />
            <h4 className="font-mono text-xs text-[#14f7ff] uppercase tracking-wider font-bold">Lattice Mathematics Context</h4>
          </div>
          <p className="text-white/80 font-semibold text-xs mb-2 uppercase">{selectedAlgo.name}</p>
          <p className="text-[11.5px] text-white/60 leading-relaxed mb-4">{selectedAlgo.description}</p>
          
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/5 pt-3 font-mono">
            <div>
              <span className="block text-white/40 text-[9.5px] uppercase">PubKey Bytesize</span>
              <span className="text-white font-bold">{selectedAlgo.pubKeySize}</span>
            </div>
            <div>
              <span className="block text-white/40 text-[9.5px] uppercase">PrivKey Bytesize</span>
              <span className="text-white font-bold">{selectedAlgo.privKeySize}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key derivation loading and final key outputs */}
      <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
        {isDeriving && (
          <div className="flex-1 border border-[#14f7ff]/20 bg-[#060914] rounded-xl p-8 flex flex-col items-center justify-center min-h-[350px]">
            <div className="w-16 h-16 rounded-full border-4 border-dashed border-[#14f7ff] flex items-center justify-center animate-spin mb-6">
              <Cpu className="w-8 h-8 text-[#14f7ff]" />
            </div>
            <h4 className="font-mono text-sm text-[#14f7ff] uppercase tracking-widest animate-pulse mb-3">Solvability Search Active</h4>
            <div className="bg-[#0e162d] py-3 px-6 rounded-lg text-center max-w-lg border border-[#14f7ff]/10">
              <span className="font-mono text-xs text-slate-300 leading-relaxed block">{derivationStep}</span>
            </div>
          </div>
        )}

        {!isDeriving && !derivedKey && (
          <div className="flex-1 border border-dashed border-white/10 bg-transparent rounded-xl flex flex-col items-center justify-center p-8 min-h-[350px] text-center">
            <Lock className="w-12 h-12 text-white/10 mb-4" />
            <p className="font-mono text-sm text-white/40 uppercase tracking-widest">Awaiting Key Generation Directive</p>
            <p className="text-xs text-white/50 max-w-md leading-relaxed mt-2 font-sans">
              Adjust variables like NIST Category or Seed source vector on the left side and request dynamic lattice generation sequence.
            </p>
          </div>
        )}

        {!isDeriving && derivedKey && (
          <div className="flex-1 border border-[#14f7ff]/20 bg-[#0a2035]/15 rounded-xl p-6 shadow-2xl flex flex-col justify-between gap-6 min-h-[350px]">
            {/* Metadata Header */}
            <div className="border-b border-white/5 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-mono text-sm text-lime-400 font-bold uppercase tracking-wider">{derivedKey.algorithmName} Derived Successfully</h4>
                  <p className="text-[11px] text-white/50 font-mono mt-1">Generated: {derivedKey.timestamp} | Registry ID: {derivedKey.id}</p>
                </div>
                <div className="bg-lime-950 text-lime-400 text-[10px] font-mono border border-lime-800 py-1 px-2.5 rounded">
                  QUANTUM SAFE
                </div>
              </div>

              {/* Real World size compared to RSA explanation */}
              <div className="bg-[#060a13] p-3 rounded mt-3.5 border border-white/5 flex flex-col md:flex-row items-start justify-between gap-4 font-mono text-[11px]">
                <div className="flex-1">
                  <span className="text-slate-400 block font-sans font-bold uppercase text-[10px] text-[#14f7ff]">Engineering Challenge Explainer</span>
                  <span className="text-white/70 block leading-relaxed pr-2">
                    Notice the public key block size of <b className="text-white font-bold">{selectedAlgo.pubKeySize}</b>. Normal RSA values are only 256 bytes! This dramatic payload jump frequently causes IP fragmentation in standard UDP handshake channels—requiring state-of-the-art hybrid encapsulation strategies.
                  </span>
                </div>
                <div className="bg-[#0e172a] p-3.5 rounded border border-[#14f7ff]/15 font-mono text-center flex flex-col justify-center shrink-0 w-full md:w-44">
                  <span className="block text-[10px] text-white/40 uppercase">Generation Time</span>
                  <span className="block text-lg font-bold text-[#14f7ff] my-0.5">{derivedKey.generationSpeedMs}ms</span>
                  <span className="block text-[9px] text-[#14f7ff]/60 uppercase leading-snug">Lattice solving delay</span>
                </div>
              </div>
            </div>

            {/* Split Keys Display Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {/* Public key hex */}
              <div className="bg-[#060a13] rounded-lg p-3.5 border border-white/5 flex flex-col select-text">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[10px] text-semibold text-[#14f7ff] uppercase">Post-Quantum Public Key Matrix(A)</span>
                  <button 
                    onClick={() => copyToClipboard(derivedKey.publicKeyHex, "pub")}
                    className="text-white/50 hover:text-white cursor-pointer transition-all"
                  >
                    {copiedText === "pub" ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <textarea 
                  readOnly 
                  value={derivedKey.publicKeyHex}
                  className="w-full flex-1 bg-transparent font-mono text-[10px] leading-relaxed text-slate-300 resize-none outline-none focus:outline-none border-transparent font-medium border-none h-24 select-text"
                />
              </div>

              {/* Private key hex */}
              <div className="bg-[#060a13] rounded-lg p-3.5 border border-white/5 flex flex-col select-text">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-[10px] text-semibold text-rose-400 uppercase">Secret Verification Vector(s)</span>
                  <button 
                    onClick={() => copyToClipboard(derivedKey.privateKeyHex, "priv")}
                    className="text-white/50 hover:text-white cursor-pointer transition-all"
                  >
                    {copiedText === "priv" ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <textarea 
                  readOnly 
                  value={derivedKey.privateKeyHex}
                  className="w-full flex-1 bg-transparent font-mono text-[10px] leading-relaxed text-rose-300/80 resize-none outline-none focus:outline-none border-transparent font-medium border-none h-24 select-text"
                />
              </div>
            </div>

            {/* Technical Parameters grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#090f1d] p-3.5 border border-white/5 rounded-lg text-xs font-mono">
              <div>
                <span className="block text-slate-400 text-[9px] uppercase">Quantum Risk Resistance</span>
                <span className="text-lime-400 font-bold">{derivedKey.quantumCrackResistance}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[9px] uppercase">Estimated Safe Lifetime</span>
                <span className="text-white font-semibold">{derivedKey.estimatedLifetime}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[9px] uppercase">Entropy Rigor Strength</span>
                <span className="text-white font-semibold">{derivedKey.entropyBits} Bits</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[9px] uppercase">Encoded Byte Sizes</span>
                <span className="text-[#14f7ff] font-semibold font-bold">{selectedAlgo.pubKeySize}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
