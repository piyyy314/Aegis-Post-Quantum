import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, AlertTriangle, Play, RefreshCw, Radio, Terminal, Settings2, 
  Activity, CheckCircle2, Lock, Zap, FileSpreadsheet, EyeOff
} from "lucide-react";
import { LogEntry, ThreatScenarioType } from "../types";
import { BreachSimulation } from "./BreachSimulation";

export function ThreatMonitor() {
  const [activeMonitorTab, setActiveMonitorTab] = useState<"defenses" | "breachLab">("defenses");
  const [breachDetectionActive, setBreachDetectionActive] = useState(true);
  const [countermeasuresArmed, setCountermeasuresArmed] = useState(true);
  const [selfHealingEnabled, setSelfHealingEnabled] = useState(true);
  const [zeroTrustLevel, setZeroTrustLevel] = useState("MAXIMUM");
  const [deceptionTech, setDeceptionTech] = useState(true);
  
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [scenarioProgress, setScenarioProgress] = useState(0);
  const [activeThreats, setActiveThreats] = useState<string[]>([]);
  const [shieldHealth, setShieldHealth] = useState(100);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: new Date().toLocaleTimeString(),
      component: "AEGIS-IDS",
      message: "Suite Engine initialized. Framework Secure ID: AEGIS-ULTRA-" + Math.random().toString(16).substring(2, 10).toUpperCase(),
      level: "INFO"
    },
    {
      id: "2",
      timestamp: new Date().toLocaleTimeString(),
      component: "ZERO-TRUST",
      message: "Continuous validation model active. Enforcing maximum microsegmentation.",
      level: "SECURE"
    },
    {
      id: "3",
      timestamp: new Date().toLocaleTimeString(),
      component: "DECEPTION-ENG",
      message: "All 4 honeytoken decoy files loaded in root namespace.",
      level: "INFO"
    }
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Periodic simulated idle logs
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentScenario) return; // don't add generic logs during active attack
      
      const comp = ["AEGIS-IDS", "ZERO-TRUST", "BEHAVIORAL-BIOM", "SELF-HEAL"][Math.floor(Math.random() * 4)];
      const msgs = {
        "AEGIS-IDS": [
          "No anomalous network patterns detected in last 5000ms.",
          "Verifying packet signatures against post-quantum standards.",
          "Network packet drift score: 0.002% (perfectly stable)."
        ],
        "ZERO-TRUST": [
          "Re-authenticating ephemeral key exchanges on channel SIG-4.",
          "Validating least privilege access list for microservices.",
          "System integrity level verified as undamaged."
        ],
        "BEHAVIORAL-BIOM": [
          "Typing rhythm verification score: 98.4% pattern match.",
          "Keystroke telemetry normalized against reference matrix.",
          "Continuous user presence confirmed by biometrics."
        ],
        "SELF-HEAL": [
          "Running background diagnostic scan of core directories.",
          "System state snapshot matches reference SHA3-256 ledger.",
          "Configuration integrity validation: OK."
        ]
      }[comp];

      const chosenMsg = msgs[Math.floor(Math.random() * msgs.length)];

      addLog(comp, chosenMsg, "INFO");
    }, 7000);

    return () => clearInterval(interval);
  }, [currentScenario]);

  // Attack scenario simulation tick
  useEffect(() => {
    let timer: any;
    if (currentScenario) {
      timer = setInterval(() => {
        setScenarioProgress(prev => {
          const next = prev + 5;
          if (next >= 100) {
            clearInterval(timer);
            // Finish scenario
            setTimeout(() => {
              addLog("SELF-HEAL", `✨ Automatic system restoration COMPLETE. Mitigated: ${currentScenario}`, "SECURE");
              addLog("AEGIS-IDS", `🛡️ All core systems reported back to safe states. Threat cleared.`, "SECURE");
              setCurrentScenario(null);
              setActiveThreats([]);
              setShieldHealth(100);
            }, 800);
            return 100;
          }

          // Trigger midpoint restoration events
          if (next === 25) {
            addLog("AEGIS-IDS", `⚠️ Active penetration vector recognized. Threat type: ${currentScenario}`, "WARN");
            if (deceptionTech) {
              addLog("DECEPTION-ENG", "🪤 Deploying virtual honeypot redirects. Feeding attacker fake state registers.", "SECURE");
            }
          } else if (next === 50) {
            setShieldHealth(prevH => Math.max(prevH - 25, 45));
            addLog("AEGIS-IDS", "🚨 Core memory bounds breached! Core isolation protocols triggered.", "CRITICAL");
            if (selfHealingEnabled) {
              addLog("SELF-HEAL", "💫 Self-healing triggered: Isolating corrupted runtime namespaces, reloading reference image.", "COUNTER");
            } else {
              addLog("AEGIS-IDS", "❌ Warning: Self-healing disabled. Host structure is suffering sustained degradation.", "WARN");
            }
          } else if (next === 75) {
            if (selfHealingEnabled) {
              setShieldHealth(prevH => Math.min(prevH + 35, 90));
              addLog("SELF-HEAL", "🔄 Configuration repair active. Re-encrypting active buffers using ML-KEM-1024.", "COUNTER");
              addLog("ZERO-TRUST", "🔒 Session keys revoked and hard reset across all segmented boundaries.", "SECURE");
            }
            if (countermeasuresArmed) {
              addLog("COUNTER-OFF", "⚔️ Active retaliatory attribution: Correlating attacker node structure to AS-89912.", "COUNTER");
            }
          }

          return next;
        });
      }, 400);
    }
    return () => clearInterval(timer);
  }, [currentScenario, selfHealingEnabled, countermeasuresArmed, deceptionTech]);

  const addLog = (comp: string, msg: string, lvl: LogEntry["level"]) => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        component: comp,
        message: msg,
        level: lvl
      }
    ].slice(-50)); // Keep last 50
  };

  const launchAttack = (type: ThreatScenarioType, name: string) => {
    if (currentScenario) {
      alert("A threat simulation is already active. Let Aegis resolve it first!");
      return;
    }

    setCurrentScenario(name);
    setScenarioProgress(0);
    setActiveThreats([name]);
    setShieldHealth(100);

    addLog("AEGIS-IDS", `🔥 INTRUSION TRIGGERED: ${name}`, "CRITICAL");
    addLog("ZERO-TRUST", "🛑 Perimeter alert level set to RED. Restricting inter-container routing.", "WARN");

    if (type === "ZERO_DAY") {
      addLog("AEGIS-IDS", "🔍 Unrecognized zero-day stack payload incoming on Port 443.", "WARN");
    } else if (type === "APT_INTRUSION") {
      addLog("AEGIS-IDS", "🕵️ Correlating lateral server attempts. Threat actor tracks match persistent state indicators.", "WARN");
    } else if (type === "QUANTUM_DECRYPTION") {
      addLog("AEGIS-IDS", "💾 Detected packet store interception. Attackers are harvesting ciphertexts for offline quantum decryption.", "CRITICAL");
      addLog("AEGIS-IDS", "🔐 Defense Action: Switching live cryptographic context to ML-KEM-1024 standard.", "SECURE");
    } else if (type === "API_FUZZ_ATTACK") {
      addLog("AEGIS-IDS", "⚡ Automated API endpoint fuzzer detected. High volume malformed inputs on /api/v1/auth.", "WARN");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs inside ThreatMonitor */}
      <div className="flex bg-[#070c18] border border-white/5 rounded-lg p-1 gap-1 w-fit">
        <button
          onClick={() => setActiveMonitorTab("defenses")}
          className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider py-1.5 px-4 rounded-md font-bold transition-all ${
            activeMonitorTab === "defenses"
              ? "bg-[#14f7ff]/10 text-[#14f7ff] border border-[#14f7ff]/20 shadow-[0_0_8px_rgba(20,247,255,0.08)]"
              : "text-white/50 hover:text-white/85 border border-transparent cursor-pointer"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Defense Heuristics HUD
        </button>
        <button
          onClick={() => setActiveMonitorTab("breachLab")}
          className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider py-1.5 px-4 rounded-md font-bold transition-all ${
            activeMonitorTab === "breachLab"
              ? "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.08)]"
              : "text-white/50 hover:text-red-400 border border-transparent cursor-pointer"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          Quantum Breach Lab
        </button>
      </div>

      {activeMonitorTab === "defenses" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Simulation HUD Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border border-[#14f7ff]/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-5 h-5 text-[#14f7ff]" />
                <h3 className="font-mono text-base font-semibold text-white uppercase tracking-wider">Aegis Core Defense Knobs</h3>
              </div>

              <div className="space-y-4">
                {/* Zero Trust Auth Selector */}
                <div className="bg-[#0e162d] rounded-lg p-3 border border-[#14f7ff]/5">
                  <label className="block text-xs font-mono text-[#14f7ff] uppercase tracking-wider mb-2">Zero Trust Authorization Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["STANDARD", "STEALTH", "MAXIMUM"].map(level => (
                      <button
                        key={level}
                        onClick={() => {
                          setZeroTrustLevel(level);
                          addLog("ZERO-TRUST", `Security clearance parameter changed to: ${level}`, "SECURE");
                        }}
                        className={`font-mono text-[10px] py-1 px-1 rounded border transition-all cursor-pointer ${
                          zeroTrustLevel === level 
                            ? "bg-[#14f7ff]/20 text-[#14f7ff] border-[#14f7ff]/80" 
                            : "bg-[#060a13] text-[#14f7ff]/40 border-transparent hover:border-[#14f7ff]/20"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* IDS Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#0e162d] rounded-lg border border-[#14f7ff]/5">
                  <div>
                    <span className="block text-white font-semibold font-sans text-xs">Continuous IDS Monitoring</span>
                    <span className="block text-xs text-white/50 font-mono">Real-time heuristics</span>
                  </div>
                  <button 
                    onClick={() => {
                      setBreachDetectionActive(!breachDetectionActive);
                      addLog("AEGIS-IDS", `Core IDS telemetry scan is now ${!breachDetectionActive ? "ENABLED" : "SUSPENDED"}`, !breachDetectionActive ? "INFO" : "WARN");
                    }}
                    className={`py-1 px-3 rounded-md font-mono text-[10px] uppercase font-bold tracking-wider transition-all border cursor-pointer ${
                      breachDetectionActive 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold" 
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {breachDetectionActive ? "Telemetry Active" : "Suspended"}
                  </button>
                </div>

                {/* Self-Healing System Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#0e162d] rounded-lg border border-[#14f7ff]/5">
                  <div>
                    <span className="block text-white font-semibold font-sans text-xs">Autonomous Self-Healing</span>
                    <span className="block text-xs text-white/50 font-mono">Sub-second recovery repair</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelfHealingEnabled(!selfHealingEnabled);
                      addLog("SELF-HEAL", `Self healing configuration reset: ${!selfHealingEnabled ? "ACTIVE" : "INACTIVE"}`, !selfHealingEnabled ? "SECURE" : "WARN");
                    }}
                    className={`py-1 px-3 rounded-md font-mono text-[10px] uppercase font-bold tracking-wider transition-all border cursor-pointer ${
                      selfHealingEnabled 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold" 
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {selfHealingEnabled ? "Automated" : "Semi-Manual"}
                  </button>
                </div>

                {/* Countermeasures Armed Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#0e162d] rounded-lg border border-[#14f7ff]/5">
                  <div>
                    <span className="block text-white font-semibold font-sans text-xs">Attacker Countermeasures</span>
                    <span className="block text-xs text-white/50 font-mono">Attribution & Interruption</span>
                  </div>
                  <button 
                    onClick={() => {
                      setCountermeasuresArmed(!countermeasuresArmed);
                      addLog("COUNTER-OFF", `Active forensic response loop is ${!countermeasuresArmed ? "ARMED" : "DISARMED"}`, !countermeasuresArmed ? "SECURE" : "WARN");
                    }}
                    className={`py-1 px-3 rounded-md font-mono text-[10px] uppercase font-bold tracking-wider transition-all border cursor-pointer ${
                      countermeasuresArmed 
                        ? "bg-[#ff9500]/10 text-[#ff9500] border-[#ff9500]/30 font-semibold" 
                        : "bg-[#060a13] text-[#ffffff]/30 border-transparent"
                    }`}
                  >
                    {countermeasuresArmed ? "Armed" : "Halted"}
                  </button>
                </div>

                {/* Deception Technology */}
                <div className="flex items-center justify-between p-3 bg-[#0e162d] rounded-lg border border-[#14f7ff]/5">
                  <div>
                    <span className="block text-white font-semibold font-sans text-xs">Integrated Honeydecoys</span>
                    <span className="block text-xs text-white/50 font-mono">Simulated traps & redirects</span>
                  </div>
                  <button 
                    onClick={() => {
                      setDeceptionTech(!deceptionTech);
                      addLog("DECEPTION-ENG", `Interactive decoy routing ${!deceptionTech ? "LOADED" : "OFFLINE"}`, !deceptionTech ? "SECURE" : "WARN");
                    }}
                    className={`py-1 px-3 rounded-md font-mono text-[10px] uppercase font-bold tracking-wider transition-all border cursor-pointer ${
                      deceptionTech 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold" 
                        : "bg-[#060a13] text-[#ffffff]/30 border-transparent"
                    }`}
                  >
                    {deceptionTech ? "Traps Set" : "Bypassed"}
                  </button>
                </div>
              </div>
            </div>

            {/* Tactical Attack Triggers */}
            <div className="border border-red-500/20 bg-[#12080f]/80 rounded-xl p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                <h3 className="font-mono text-base font-semibold text-white uppercase tracking-wider">Simulate Offensive Breach</h3>
              </div>
              <p className="text-xs text-white/60 font-sans mb-4">
                Execute safe virtual penetration techniques to witness Aegis autonomous incident correlation and post-quantum mitigation steps in real time.
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => launchAttack("ZERO_DAY", "Zero-Day Exploit Attempt (Buffer/Syscall)")}
                  className="flex items-center justify-between p-3 bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/20 text-left transition-all group cursor-pointer"
                >
                  <div className="font-mono text-xs font-sans">
                    <span className="block text-red-400 font-semibold font-mono tracking-wider group-hover:text-red-300">01. Zero-Day Heap-Overflow</span>
                    <span className="block text-[10px] text-white/50 mt-0.5">Simulates EDR bypass & process swap</span>
                  </div>
                  <Play className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                <button 
                  onClick={() => launchAttack("APT_INTRUSION", "Advanced Persistent Threat (APT-41 Lateral)")}
                  className="flex items-center justify-between p-3 bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/20 text-left transition-all group cursor-pointer"
                >
                  <div className="font-mono text-xs font-sans">
                    <span className="block text-red-400 font-semibold font-mono tracking-wider group-hover:text-red-300">02. APT Lateral Intrusion</span>
                    <span className="block text-[10px] text-white/50 mt-0.5">Simulates Kerberos ticket extraction</span>
                  </div>
                  <Play className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                <button 
                  onClick={() => launchAttack("QUANTUM_DECRYPTION", "Shor's Quantum Harvest-Now-Decrypt-Later")}
                  className="flex items-center justify-between p-3 bg-[#e01bbf]/5 hover:bg-[#e01bbf]/10 rounded-lg border border-[#e01bbf]/30 text-left transition-all group cursor-pointer"
                >
                  <div className="font-mono text-xs font-sans">
                    <span className="block text-[#e01bbf] font-semibold font-mono tracking-wider group-hover:text-pink-300">03. Quantum Decryption Intercept</span>
                    <span className="block text-[10px] text-white/50 mt-0.5">Harvests RSA traffic to decode via Shor's</span>
                  </div>
                  <Play className="w-4 h-4 text-[#e01bbf] group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                <button 
                  onClick={() => launchAttack("API_FUZZ_ATTACK", "Automated Security API Fuzz & Bypass")}
                  className="flex items-center justify-between p-3 bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/20 text-left transition-all group cursor-pointer"
                >
                  <div className="font-mono text-xs font-sans">
                    <span className="block text-red-400 font-semibold font-mono tracking-wider group-hover:text-red-300">04. API Access Point Fuzzer</span>
                    <span className="block text-[10px] text-white/50 mt-0.5">Acyclic traversal & parameter injection</span>
                  </div>
                  <Play className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* Center Tactical Node Map & Active Shield Panel */}
          <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
            {/* Core Tactical HUD Map */}
            <div className="border border-[#14f7ff]/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl backdrop-blur-md flex-1 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#14f7ff]" />
                  <h3 className="font-mono text-sm font-semibold text-white uppercase tracking-wider">Visual Perimeter Shield Node Indicator</h3>
                </div>
                <div className="flex items-center gap-3">
                  {currentScenario ? (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-red-950 border border-red-800 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="font-mono text-[10px] text-red-400 font-bold tracking-wider">BREACH IN PROGRESS</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                      <span className="font-mono text-[9.5px] text-emerald-400 font-bold tracking-wider font-semibold">ALL SENSORS NORMAL</span>
                    </div>
                  )}
                  <span className="font-mono text-[11px] text-[#14f7ff]/60">Shield Integrity: <b className="text-[#14f7ff] font-bold">{shieldHealth}%</b></span>
                </div>
              </div>

              {/* Interactive CSS Shield Animation Grid */}
              <div className="flex-1 relative flex items-center justify-center p-6 bg-[#060914] rounded-lg border border-white/5 overflow-hidden">
                {/* Hologram Grid background */}
                <div className="absolute inset-0 bg-[radial-gradient(#14f7ff_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
                
                {/* Circular Shield Orb */}
                <div className="relative w-42 h-42 rounded-full border border-[#14f7ff]/20 flex items-center justify-center">
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    currentScenario 
                      ? "border-[3px] border-red-500/50 animate-ping" 
                      : "border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  }`} />

                  <div className={`w-32 h-32 rounded-full border border-dashed flex items-center justify-center transition-all ${
                    currentScenario ? "border-red-400/40 animate-spin" : "border-[#14f7ff]/30 animate-spin"
                  }`} style={{ animationDuration: "10s" }} />

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <Shield className={`w-10 h-10 transition-all ${
                      currentScenario ? "text-red-500 animate-bounce" : "text-[#14f7ff]"
                    }`} />
                    <span className="font-mono text-[11px] font-bold text-white uppercase tracking-wider mt-1.5">Aegis Core</span>
                    <span className="font-mono text-[9px] text-white/50">{zeroTrustLevel} Protect</span>
                  </div>

                  {/* Connected Active Nodes */}
                  <div className="absolute -top-10 flex flex-col items-center gap-0.5 bg-[#090e1f] py-1 px-2 border border-[#14f7ff]/20 rounded shadow-lg">
                    <Lock className="w-3 text-emerald-400" />
                    <span className="font-mono text-[8px] text-white/80 font-bold font-semibold">ML-KEM-1024</span>
                  </div>

                  <div className="absolute -bottom-10 flex flex-col items-center gap-0.5 bg-[#090e1f] py-1 px-2 border border-white/10 rounded">
                    <Radio className="w-3 h-3 text-[#14f7ff] animate-pulse" />
                    <span className="font-mono text-[8px] text-white/80">HONEYNET</span>
                  </div>

                  <div className="absolute -right-14 flex flex-col items-center gap-0.5 bg-[#090e1f] py-1 px-2 border border-pink-500/20 rounded">
                    <Zap className="w-3 h-3 text-pink-500" />
                    <span className="font-mono text-[8px] text-white/80 font-bold font-semibold">IDS PROX</span>
                  </div>
                </div>

                {/* Simulated attacking packages in state */}
                {currentScenario && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/4 top-1/4 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                    <div className="absolute right-1/4 bottom-1/4 w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
                    <div className="absolute left-1 border-t border-red-500/10 w-full top-1/2 animate-pulse"></div>
                  </div>
                )}
              </div>

              {/* Progress Timeline for Scenario */}
              {currentScenario && (
                <div className="mt-4 bg-[#080d1a] border border-red-500/20 rounded p-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[11px] text-red-400">Response & Repair Progress: <b>{scenarioProgress}%</b></span>
                    <span className="font-mono text-[9px] text-white/40">Step: {scenarioProgress < 40 ? "Containment" : scenarioProgress < 80 ? "Healing Patch" : "Verify Integrity"}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                    <div 
                      className="bg-red-500 h-1 rounded-full transition-all duration-300" 
                      style={{ width: `${scenarioProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <BreachSimulation 
          onAddLog={addLog}
          onSetShieldHealth={setShieldHealth}
          onSetScenarioActive={setCurrentScenario}
          isScenarioActive={!!currentScenario}
        />
      )}

      {/* Real-time Incident Terminal Logs */}
      <div className="border border-[#14f7ff]/20 bg-[#060a13] rounded-xl p-5 overflow-hidden flex flex-col h-[280px]">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#14f7ff]" />
            <span className="font-mono text-xs uppercase text-white font-bold tracking-wider">Aegis Continuous Log Terminal</span>
          </div>
          <button 
            onClick={() => {
              setLogs([]);
              addLog("TERMINAL", "Incident console outputs flushed by operator.", "INFO");
            }}
            className="font-mono text-[9px] text-[#14f7ff]/60 hover:text-[#14f7ff] uppercase border border-[#14f7ff]/20 hover:border-[#14f7ff]/40 py-0.5 px-2 rounded bg-transparent cursor-pointer transition-all"
          >
            Flush Console
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 font-mono text-[11px] text-slate-300 select-text">
          {logs.map(log => {
            const colorMap = {
              INFO: "text-[#14f7ff]/80",
              WARN: "text-amber-400 font-semibold",
              CRITICAL: "text-red-400 font-bold bg-red-500/10 px-1 rounded",
              SECURE: "text-emerald-400 py-0.5 px-0.5 rounded",
              COUNTER: "text-fuchsia-400 font-semibold italic"
            };

            return (
              <div key={log.id} className="flex items-start gap-2 hover:bg-white/5 p-0.5 rounded transition-all">
                <span className="text-white/30 text-[9px] select-none shrink-0">[{log.timestamp}]</span>
                <span className={`text-[9.5px] font-bold ${colorMap[log.level]} tracking-tight min-w-[90px] inline-block uppercase shrink-0`}>
                  🛡️ {log.component}:
                </span>
                <span className="flex-1 text-[10.5px] leading-relaxed select-text">{log.message}</span>
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
