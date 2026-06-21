import React, { useState, useEffect } from "react";
import { 
  Play, Shield, Zap, RefreshCw, Cpu, AlertTriangle, CheckCircle2, 
  Activity, Flame, RotateCcw, Lock, Unlock, ShieldAlert, Cpu as CpuIcon,
  WifiOff, Key, Sparkles, Terminal
} from "lucide-react";

interface BreachSimulationProps {
  onAddLog: (component: string, message: string, level: "INFO" | "WARN" | "CRITICAL" | "SECURE" | "COUNTER") => void;
  onSetShieldHealth: (health: React.SetStateAction<number>) => void;
  onSetScenarioActive: (activeScenarioName: string | null) => void;
  isScenarioActive: boolean;
}

interface Scenario {
  id: string;
  name: string;
  codename: string;
  targetVulnerability: string;
  threatDescription: string;
  vulnerabilityOverview: string;
  logicalSteps: { title: string; desc: string; durationMs: number }[];
  defaultLegacyAlgo: string;
  defaultPqcAlgo: string;
}

const FAILURE_SCENARIOS: Scenario[] = [
  {
    id: "shors_retroactive",
    name: "Shor's Harvest-Now-Decrypt-Later Intercept",
    codename: "OP_HARVEST_SHOR",
    targetVulnerability: "Legacy Handshake Key Exchange (RSA / Diffie-Hellman)",
    vulnerabilityOverview: "Adversaries capture and record encrypted data tunnels today, intending to solve integer factorization utilizing Shor's algorithm on first scalable CRQC (Cryptanalytically Relevant Quantum Computer).",
    threatDescription: "Targeting legacy TLS buffers. Decrypting 1.8 TB of retroactive system storage captures in real-time.",
    defaultLegacyAlgo: "RSA-2048",
    defaultPqcAlgo: "ML-KEM-1024",
    logicalSteps: [
      { title: "Target Capture", desc: "Access session buffer. Sniffing and caching encrypted TLS handshakes from network gateways.", durationMs: 2500 },
      { title: "Shor's Factoring", desc: "Injecting modular residues into Shor's period-finding subroutine using 4,096 logical qubits.", durationMs: 3000 },
      { title: "Anomalous Timing", desc: "Aegis IDS correlates unexpected entropy decay and abnormal TLS pipeline latency (+154ms).", durationMs: 2500 },
      { title: "Self-Heal Rotation", desc: "Hot-patch active: Revoking legacy private keys. Forcing instant encapsulation upgrade using ML-KEM.", durationMs: 3000 },
      { title: "Lattice Verification", desc: "Refactor session endpoints. Verifying perfect forward secrecy via new post-quantum public matrix.", durationMs: 2000 }
    ]
  },
  {
    id: "grovers_forgery",
    name: "Grover's Preimage Signature Forgery",
    codename: "OP_GROVER_FORGE",
    targetVulnerability: "Legacy Code and File Validation Hashes (SHA-1 / MD5)",
    vulnerabilityOverview: "Adversary exploits Grover's quadratic search speedup to compute hash preimage collisions, faking authentic file hashes and bypassing digital signature verification safeguards.",
    threatDescription: "Attempting payload injection. Replacing active configuration binaries with malware-laden binaries.",
    defaultLegacyAlgo: "SHA-1",
    defaultPqcAlgo: "ML-DSA-87",
    logicalSteps: [
      { title: "Binary Modification", desc: "Creating forged config.bin package with altered machine instructions.", durationMs: 2200 },
      { title: "Grover Optimization", desc: "Iterating quantum search states to generate targeted collision signature for legacy hashes.", durationMs: 2800 },
      { title: "Firmware Checksum", desc: "IDS catches invalid metadata checksum. File system integrity watch alert is triggered.", durationMs: 2400 },
      { title: "Lattice Signature", desc: "Aegis wipes file namespace. Deploying ML-DSA lattice validation with strict quantum verification.", durationMs: 2800 },
      { title: "Binary Restoration", desc: "Restoring validated reference configuration image from secure hardware root of trust storage.", durationMs: 1800 }
    ]
  },
  {
    id: "handshake_downgrade",
    name: "MitM Cipher-Suite Handshake Downgrade",
    codename: "OP_DOWNGRADE_ECDSA",
    targetVulnerability: "Legacy Signature Schemas (ECDSA P-256 / RSA)",
    vulnerabilityOverview: "Active man-in-the-middle attacker blocks PQC handshakes, tricking remote servers and clients into negotiating weak classical curves (P-256) designed for easy factorization.",
    threatDescription: "Active MitM path spoofing. Intercepting root CA handshakes to enforce classical ECDSA curve negotiations.",
    defaultLegacyAlgo: "ECDSA P-256",
    defaultPqcAlgo: "Falcon-1024",
    logicalSteps: [
      { title: "Interception Point", desc: "Positioning active proxy in packet route and filtering TLS 'ClientHello' parameters.", durationMs: 2000 },
      { title: "Cipher Strike-out", desc: "Forcible removal of post-quantum lattice suite entries from negotiation proposal lists.", durationMs: 2200 },
      { title: "Downgrade Alarm", desc: "Aegis Zero-Trust module rejects non-lattice cipher suite selections on protected channels.", durationMs: 2400 },
      { title: "Tunnel Isolation", desc: "Isolating downgraded session container. Rerouting peer communication through peer-to-peer lattice tunnels.", durationMs: 3000 },
      { title: "Falcon Certification", desc: "Re-establishing trust via Falcon-1024 stateless digital sign guarantees on CA authority paths.", durationMs: 2000 }
    ]
  },
  {
    id: "entropy_leak",
    name: "State Superposition Side-Channel Attack",
    codename: "OP_ENTROPY_LEAK",
    targetVulnerability: "Entropy Seed / State Fluctuation side-channel",
    vulnerabilityOverview: "Adversary records system power and timing fluctuation signatures inside modular multi-tenant VMs to deduce seed parameters used for ephemeral key derivations.",
    threatDescription: "Side-channel extraction. Profiling microprocessor power dissipation anomalies during key loops.",
    defaultLegacyAlgo: "ECC P-256 (Timing)",
    defaultPqcAlgo: "ML-KEM-768/QRNG",
    logicalSteps: [
      { title: "Timing Profiling", desc: "Measuring power waveforms with micro-second accuracy on shared hypervisor threads.", durationMs: 2400 },
      { title: "Waveform Solvability", desc: "Using quantum-assisted tensor models to align timing patterns and rebuild key seed matrices.", durationMs: 2600 },
      { title: "Heuristic Flag", desc: "Aegis biometrics module detects hypervisor core timing jitter above maximum baseline thresholds.", durationMs: 2400 },
      { title: "QRNG Injection", desc: "Self-healing reconfigures entropy engines, instantly blending continuous quantum random generator noise.", durationMs: 2800 },
      { title: "Module Shielding", desc: "Hardening key derivation states and recycling timing vectors using secure randomized blinders.", durationMs: 2000 }
    ]
  }
];

export function BreachSimulation({ onAddLog, onSetShieldHealth, onSetScenarioActive, isScenarioActive }: BreachSimulationProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(FAILURE_SCENARIOS[0].id);
  const [legacyAlgo, setLegacyAlgo] = useState(FAILURE_SCENARIOS[0].defaultLegacyAlgo);
  const [pqcAlgo, setPqcAlgo] = useState(FAILURE_SCENARIOS[0].defaultPqcAlgo);
  
  // Simulation progressive states
  const [simStep, setSimStep] = useState<number>(-1);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simStatusMsg, setSimStatusMsg] = useState<string>("Simulation Lab is in STANDBY mode.");
  const [processingMetrics, setProcessingMetrics] = useState({
    qubitsNeeded: "0 qubits",
    quantumOpCount: "0",
    entropyRate: "0.000042 bits/sec",
    currentAction: "Ready"
  });

  const selectedScenario = FAILURE_SCENARIOS.find(s => s.id === selectedScenarioId) || FAILURE_SCENARIOS[0];

  // Adjust default algorithms when scenario changes
  useEffect(() => {
    if (!simRunning) {
      setLegacyAlgo(selectedScenario.defaultLegacyAlgo);
      setPqcAlgo(selectedScenario.defaultPqcAlgo);
    }
  }, [selectedScenarioId, selectedScenario, simRunning]);

  const launchSimulation = async () => {
    if (isScenarioActive || simRunning) return;

    setSimRunning(true);
    onSetScenarioActive(selectedScenario.name);
    setSimStep(0);
    onSetShieldHealth(100);

    // Initial logs
    onAddLog("BREACH-SIM", `⚠️ INITIATING BREACH VECTOR: ${selectedScenario.codename}`, "CRITICAL");
    onAddLog("BREACH-SIM", `🎯 Target System Vulnerability: ${selectedScenario.targetVulnerability}`, "WARN");
    onAddLog("BREACH-SIM", `⚔️ Deploying classical exploit parameters representing vulnerable algorithm: ${legacyAlgo}`, "WARN");

    // Dynamic state machine based on the logical steps of the selected scenario
    const runStep = (stepIdx: number) => {
      if (stepIdx >= selectedScenario.logicalSteps.length) {
        // Finalize simulation
        setTimeout(() => {
          setSimStatusMsg(`✨ System Security Restored. Quantum Shield fully hardened.`);
          onAddLog("SELF-HEAL", `🛡️ Automated recovery loop finished! Aegis successfully migrated live key exchanges to FIPS compliant ${pqcAlgo}.`, "SECURE");
          onAddLog("BREACH-SIM", `📶 Breach Vector ${selectedScenario.codename} completely neutralized and patched.`, "SECURE");
          
          setSimRunning(false);
          setSimStep(-1);
          onSetScenarioActive(null);
          onSetSetMetricsForStep(selectedScenarioId, -1);
          onSetShieldHealth(100);
        }, 800);
        return;
      }

      setSimStep(stepIdx);
      const step = selectedScenario.logicalSteps[stepIdx];
      setSimStatusMsg(`Phase ${stepIdx + 1}/${selectedScenario.logicalSteps.length}: ${step.title}`);
      onSetSetMetricsForStep(selectedScenarioId, stepIdx);

      // Log the specific step actions in Aegis Console
      let logLevel: "INFO" | "WARN" | "CRITICAL" | "SECURE" | "COUNTER" = "INFO";
      if (stepIdx === 0) logLevel = "WARN";
      if (stepIdx === 1) logLevel = "CRITICAL";
      if (stepIdx === 2) logLevel = "WARN";
      if (stepIdx === 3) logLevel = "COUNTER";
      if (stepIdx === 4) logLevel = "SECURE";

      onAddLog("BREACH-LAB", `⚡ [Step ${stepIdx + 1}/${selectedScenario.logicalSteps.length}] : ${step.title.toUpperCase()} :: ${step.desc}`, logLevel);

      // Dynamic Shield Health modifiers based on steps
      if (stepIdx === 0) {
        onSetShieldHealth(92);
      } else if (stepIdx === 1) {
        onSetShieldHealth(48); // Drop heavy under quantum computation
      } else if (stepIdx === 2) {
        onSetShieldHealth(32); // Vulnerability exposed
      } else if (stepIdx === 3) {
        onSetShieldHealth(75); // Recovering
      } else if (stepIdx === 4) {
        onSetShieldHealth(98); // Almost pristine
      }

      setTimeout(() => {
        runStep(stepIdx + 1);
      }, step.durationMs);
    };

    runStep(0);
  };

  const onSetSetMetricsForStep = (scenId: string, step: number) => {
    if (step === -1) {
      setProcessingMetrics({
        qubitsNeeded: "0 qubits",
        quantumOpCount: "0",
        entropyRate: "0.000042 bits/sec",
        currentAction: "Ready"
      });
      return;
    }

    const rates = {
      shors_retroactive: [
        { qubits: "4,096 logical", ops: "2.3 x 10^9 modular ops", entropy: "0.000042 bits/s", action: "Harvesting ciphertexts" },
        { qubits: "4,096 logical", ops: "8.5 x 10^11 modular ops", entropy: "0.000038 bits/s", action: "Solving integer periods" },
        { qubits: "4,096 logical", ops: "9.9 x 10^11 modular ops", entropy: "0.000031 bits/s", action: "Correlating latency spikes" },
        { qubits: "0 / Rotated", ops: "Decap overhead: 2.1ms", entropy: "1.240000 bits/s", action: "Injecting ML-KEM encapsulation" },
        { qubits: "Quantum Defended", ops: "Lattice modular dimension = 768", entropy: "0.999982 bits/s", action: "Trust re-established" }
      ],
      grovers_forgery: [
        { qubits: "1,500 logical", ops: "2^40 search iterations", entropy: "0.000042 bits/s", action: "Hashing checksum headers" },
        { qubits: "3,000 logical", ops: "2^80 Grover evaluations", entropy: "0.000040 bits/s", action: "Solving high-rank collision" },
        { qubits: "3,000 logical", ops: "Hash mismatch detected", entropy: "0.000033 bits/s", action: "Isolating namespace" },
        { qubits: "0 / Patched", ops: "Verification speed: 1.8ms", entropy: "1.150000 bits/s", action: "Generating ML-DSA signature" },
        { qubits: "Quantum Defended", ops: "Validated checksum hash: SHA3-512", entropy: "0.999991 bits/s", action: "Reference image restored" }
      ],
      handshake_downgrade: [
        { qubits: "2,200 logical", ops: "Route intercept loaded", entropy: "0.000042 bits/s", action: "Sniffing ClientHello TLS" },
        { qubits: "2,200 logical", ops: "Downgrading TLS properties", entropy: "0.000039 bits/s", action: "Enforcing classical algorithms" },
        { qubits: "2,200 logical", ops: "Rejecting classical fallback", entropy: "0.000035 bits/s", action: "Triggering API quarantine" },
        { qubits: "0 / Isolated", ops: "Tunnel rebuild: 3.5ms", entropy: "1.420000 bits/s", action: "Binding Falcon credentials" },
        { qubits: "Quantum Defended", ops: "Enforcing stateless signature validation", entropy: "0.999988 bits/s", action: "Secure peer links live" }
      ],
      entropy_leak: [
        { qubits: "1,200 logical", ops: "Timing profiling activated", entropy: "0.000042 bits/s", action: "Reconstructing power curves" },
        { qubits: "1,800 logical", ops: "Tensor system correlation", entropy: "0.000039 bits/s", action: "Solving state matrices" },
        { qubits: "1,800 logical", ops: "Jitter alert: Out of bounds", entropy: "0.000028 bits/s", action: "Locking ephemeral state" },
        { qubits: "0 / Rotated", ops: "Seed re-spin: < 1ms", entropy: "4.821000 bits/s", action: "Blending QRNG hardware noise" },
        { qubits: "Quantum Defended", ops: "Blinded power signatures: hardened", entropy: "0.999991 bits/s", action: "Entropy restored to pristine state" }
      ]
    };

    const currentKey = scenId as keyof typeof rates;
    if (rates[currentKey] && rates[currentKey][step]) {
      const data = rates[currentKey][step];
      setProcessingMetrics({
        qubitsNeeded: data.qubits,
        quantumOpCount: data.ops,
        entropyRate: data.entropy,
        currentAction: data.action
      });
    }
  };

  const forceReset = () => {
    setSimRunning(false);
    setSimStep(-1);
    onSetScenarioActive(null);
    onSetShieldHealth(100);
    setSimStatusMsg("Simulation Lab has been reset to default stand-by state.");
    setProcessingMetrics({
      qubitsNeeded: "0 qubits",
      quantumOpCount: "0",
      entropyRate: "0.000042 bits/sec",
      currentAction: "Ready"
    });
    onAddLog("BREACH-SIM", "⚠️ Manual override: Breach Simulator session aborted. Re-establishing pristine state.", "SECURE");
  };

  return (
    <div className="border border-blue-500/20 bg-[#0f172a]/20 rounded-xl p-5 shadow-2xl backdrop-blur-md font-mono text-xs text-[#94a3b8] space-y-5">
      {/* Simulation Lab Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Aegis Quantum Breach Simulator</h3>
        </div>
        <div className="flex items-center gap-2 font-sans">
          {simRunning ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold border border-red-800 uppercase tracking-widest text-[9px] animate-pulse">
              Simulation Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 uppercase tracking-widest text-[9px]">
              Ready - Lab Standby
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column: scenario selection */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <label className="block text-[10px] text-[#14f7ff] uppercase tracking-wider mb-1.5 font-bold">Select Offensive Vector</label>
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              disabled={simRunning}
              className="w-full bg-[#060a13] border border-blue-500/20 rounded-md p-2 text-white/90 focus:border-[#14f7ff]/60 outline-none cursor-pointer disabled:opacity-50"
            >
              {FAILURE_SCENARIOS.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>

          {/* Scenario Explainer */}
          <div className="bg-[#040813] border border-white/5 rounded-lg p-3 space-y-2 select-text text-[11px]">
            <div className="flex justify-between items-center text-[10px] text-red-400 font-bold uppercase tracking-widest">
              <span>Threat Payload</span>
              <span>{selectedScenario.codename}</span>
            </div>
            <p className="text-white/80 leading-relaxed font-sans">{selectedScenario.vulnerabilityOverview}</p>
            <p className="text-red-400/90 italic font-sans text-[10.5px]">“{selectedScenario.threatDescription}”</p>
          </div>

          {/* Configuration Inputs */}
          <div className="bg-[#050914] border border-blue-500/10 rounded-lg p-3 space-y-3">
            <h4 className="text-[9.5px] uppercase text-[#14f7ff] font-bold tracking-wider">Configure Parameters</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9.5px] text-slate-400 uppercase mb-1">Legacy Target</label>
                <select
                  value={legacyAlgo}
                  onChange={(e) => setLegacyAlgo(e.target.value)}
                  disabled={simRunning}
                  className="w-full bg-[#0d152a] border border-white/10 rounded-md p-1.5 text-white/90 text-[10.5px] outline-none disabled:opacity-50 cursor-pointer"
                >
                  <option value="RSA-1024">RSA-1024 (Vulnerable)</option>
                  <option value="RSA-2048">RSA-2048 (Compromised)</option>
                  <option value="ECDSA P-256">ECDSA P-256 (Fatal)</option>
                  <option value="Diffie-Hellman">DH-2048 (Exposed)</option>
                  <option value="SHA-1">SHA-1 (Collision)</option>
                  <option value="MD5">MD5 (Broken)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] text-slate-400 uppercase mb-1">Defense Guard</label>
                <select
                  value={pqcAlgo}
                  onChange={(e) => setPqcAlgo(e.target.value)}
                  disabled={simRunning}
                  className="w-full bg-[#0d152a] border border-white/10 rounded-md p-1.5 text-white/90 text-[10.5px] outline-none disabled:opacity-50 cursor-pointer"
                >
                  <option value="ML-KEM-768">ML-KEM-768 (Level 3)</option>
                  <option value="ML-KEM-1024">ML-KEM-1024 (Level 5)</option>
                  <option value="ML-DSA-65">ML-DSA-65 (Sig Level 3)</option>
                  <option value="ML-DSA-87">ML-DSA-87 (Sig Level 5)</option>
                  <option value="Falcon-1024">Falcon-1024 (Dense Sig)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!simRunning ? (
              <button
                onClick={launchSimulation}
                className="flex-1 bg-red-600/15 hover:bg-red-600/25 border border-red-500/50 hover:border-red-500 text-red-400 py-2.5 rounded-md font-bold text-center flex items-center justify-center gap-1.5 uppercase transition-all tracking-wider cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Launch Simulation
              </button>
            ) : (
              <button
                onClick={forceReset}
                className="flex-1 bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/50 hover:border-amber-500 text-amber-400 py-2.5 rounded-md font-bold text-center flex items-center justify-center gap-1.5 uppercase transition-all tracking-wider cursor-pointer animate-pulse"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Abort vector
              </button>
            )}
          </div>
        </div>

        {/* Right column: Interactive healing steps HUD */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          <div className="bg-[#050914] border border-white/5 rounded-lg p-3.5 flex-1 flex flex-col justify-between">
            {/* Steps execution flow */}
            <div className="space-y-3">
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Automated PQC Healing Loop Steps</span>
              
              <div className="grid grid-cols-1 gap-2">
                {selectedScenario.logicalSteps.map((step, idx) => {
                  const isActive = simStep === idx;
                  const isCompleted = simStep > idx;
                  let borderStyle = "border-white/5 bg-[#030611]/40 text-white/30";
                  let numLabelStyle = "bg-white/5 text-white/30 border-white/10";
                  let dotIcon = null;

                  if (isActive) {
                    if (idx === 1) {
                      borderStyle = "border-red-500/40 bg-red-950/20 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.1)]";
                      numLabelStyle = "bg-red-900/30 text-red-400 border-red-500/30 animate-pulse";
                      dotIcon = <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />;
                    } else if (idx === 3) {
                      borderStyle = "border-fuchsia-500/40 bg-fuchsia-950/20 text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.1)]Style";
                      borderStyle = "border-fuchsia-500/40 bg-fuchsia-950/20 text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.1)]";
                      numLabelStyle = "bg-fuchsia-900/30 text-fuchsia-400 border-fuchsia-500/30 animate-spin";
                      dotIcon = <RefreshCw className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />;
                    } else if (idx === 4) {
                      borderStyle = "border-emerald-500/40 bg-emerald-950/20 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.1)]";
                      numLabelStyle = "bg-emerald-900/30 text-emerald-400 border-emerald-500/30";
                      dotIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                    } else {
                      borderStyle = "border-amber-500/40 bg-amber-950/20 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.1)]";
                      numLabelStyle = "bg-amber-900/30 text-amber-400 border-amber-500/30";
                      dotIcon = <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
                    }
                  } else if (isCompleted) {
                    borderStyle = "border-emerald-500/10 bg-[#041113]/40 text-[#14f7ff]/50";
                    numLabelStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    dotIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`border p-2.5 rounded transition-all duration-300 flex items-start gap-2.5 ${borderStyle}`}
                    >
                      <div className={`w-5 h-5 rounded-full border text-[10px] flex items-center justify-center font-bold shrink-0 ${numLabelStyle}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold uppercase tracking-wider block leading-tight">{step.title}</span>
                          {dotIcon}
                        </div>
                        {isActive && <p className="text-[10.5px] mt-0.5 leading-normal opacity-90 select-text">{step.desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated Live Analytics HUD */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 bg-[#030611] p-2.5 rounded-lg border border-white/5 font-mono text-[10px] mt-3">
              <div>
                <span className="block text-slate-500 uppercase text-[8.5px]">Quantum Load</span>
                <span className="text-white font-bold block overflow-hidden text-ellipsis whitespace-nowrap">{processingMetrics.qubitsNeeded}</span>
              </div>
              <div>
                <span className="block text-slate-500 uppercase text-[8.5px]">Complexity Ops</span>
                <span className="text-white font-bold block overflow-hidden text-ellipsis whitespace-nowrap">{processingMetrics.quantumOpCount}</span>
              </div>
              <div>
                <span className="block text-slate-400 uppercase text-[8.5px]">System Entropy</span>
                <span className="text-[#14f7ff] font-bold block">{processingMetrics.entropyRate}</span>
              </div>
              <div>
                <span className="block text-slate-500 uppercase text-[8.5px]">Aegis State</span>
                <span className="text-amber-400 font-bold block overflow-hidden text-ellipsis whitespace-nowrap">{processingMetrics.currentAction}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
