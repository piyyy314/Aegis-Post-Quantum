import React, { useState, useEffect } from "react";
import { 
  Shield, Activity, Cpu, Zap, Lock, Settings2, Terminal, ArrowRight, 
  Bug, Clock, Radio, FileText, CheckCircle2, AlertOctagon, Loader2, Play, 
  Trash2, ShieldAlert, Award, AlertTriangle, Key, BookOpen, Download, X,
  Compass, Wifi
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ThreatMonitor } from "./components/ThreatMonitor";
import { KeyGenerator } from "./components/KeyGenerator";
import { PalantirDashboard } from "./components/PalantirDashboard";
import { AuditHistory } from "./components/AuditHistory";
import { SyntaxHighlightedEditor } from "./components/SyntaxHighlightedEditor";
import { LinkBudgetCalculator } from "./components/LinkBudgetCalculator";
import { PQC_ALGORITHMS, PRELOADED_CODE_SNIPPETS, NIST_MIGRATION_TIMELINE } from "./constants";
import { AuditResult, AuditVulnerability, AuditHistoryEntry } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"command" | "pqc" | "audit" | "roadmap" | "palantir" | "link-budget">("command");
  const [totalKeysGenerated, setTotalKeysGenerated] = useState(0);
  
  // Header telemetry live variables
  const [systemEntropy, setSystemEntropy] = useState(0.000042);
  const [currentUTCTime, setCurrentUTCTime] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Auditing Interactive Panel states
  const [auditCode, setAuditCode] = useState(PRELOADED_CODE_SNIPPETS[0].code);
  const [selectedSnippetId, setSelectedSnippetId] = useState(PRELOADED_CODE_SNIPPETS[0].id);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isQuickAuditing, setIsQuickAuditing] = useState(false);
  const [lastScanWasQuick, setLastScanWasQuick] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [originalRiskScore, setOriginalRiskScore] = useState<number>(0);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [autoRemediation, setAutoRemediation] = useState(false);

  // Automated background audit sweep states
  const [backgroundSweepActive, setBackgroundSweepActive] = useState<boolean>(true);
  const [backgroundSweepInterval, setBackgroundSweepInterval] = useState<number>(30); // in seconds
  const [isBackgroundAuditing, setIsBackgroundAuditing] = useState<boolean>(false);
  const [lastBackgroundSweepTime, setLastBackgroundSweepTime] = useState<string>("");
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  // Sub tab tracking inside audit workspace
  const [auditSubTab, setAuditSubTab] = useState<"scanner" | "history">("scanner");
  const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  // Restore history state from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("aegis_audit_history");
    if (saved) {
      try {
        setAuditHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to restore history from localStorage", e);
      }
    }
  }, []);

  // Toast Alert system state for Breach Simulation alerts
  interface SimulatorNotification {
    id: string;
    component: string;
    message: string;
    level: string;
    timestamp: string;
  }
  const [simulatorAlerts, setSimulatorAlerts] = useState<SimulatorNotification[]>([]);

  // Listen for simulator alerts
  useEffect(() => {
    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const newAlert: SimulatorNotification = {
          id: customEvent.detail.id || Math.random().toString(),
          component: customEvent.detail.component,
          message: customEvent.detail.message,
          level: customEvent.detail.level,
          timestamp: customEvent.detail.timestamp || new Date().toLocaleTimeString()
        };

        setSimulatorAlerts(prev => {
          // Keep only the most recent 3 alerts to prevent clutter at the top-right
          return [newAlert, ...prev].slice(0, 3);
        });

        // Trigger automatic dismissal after 5 seconds
        setTimeout(() => {
          setSimulatorAlerts(prev => prev.filter(alert => alert.id !== newAlert.id));
        }, 5000);
      }
    };

    window.addEventListener("breach-simulation-alert", handleAlert);
    return () => window.removeEventListener("breach-simulation-alert", handleAlert);
  }, []);

  const dismissAlert = (id: string) => {
    setSimulatorAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const handleApplyFix = (vulnIndex: number) => {
    if (!auditResult) return;
    const vuln = auditResult.vulnerabilities[vulnIndex];
    if (!vuln) return;

    const target = vuln.lineMatch;
    const replacement = vuln.pqcReplacementCode || vuln.pqcReplacement;

    if (!auditCode.includes(target)) {
      console.warn("Target code line match not found in code editor.");
      return;
    }

    const newCode = auditCode.replace(target, replacement);
    setAuditCode(newCode);

    // Mark the vulnerability as remediated in state
    const updatedVulnerabilities = auditResult.vulnerabilities.map((v, idx) => {
      if (idx === vulnIndex) {
        return { ...v, isRemediated: true };
      }
      return v;
    });

    const activeRisksCount = updatedVulnerabilities.filter(v => !v.isRemediated).length;
    const totalCount = updatedVulnerabilities.length;
    let newScore = 0;
    if (totalCount > 0) {
      newScore = Math.round((activeRisksCount / totalCount) * (originalRiskScore || auditResult.overallRiskScore || 0));
    }

    setAuditResult({
      ...auditResult,
      vulnerabilities: updatedVulnerabilities,
      isVulnerable: activeRisksCount > 0,
      overallRiskScore: newScore
    });

    // Synchronize the remediation details inside local storage audit records
    if (activeScanId) {
      const updatedHistory = auditHistory.map(entry => {
        if (entry.id === activeScanId) {
          const updatedVulns = entry.vulnerabilities.map((v, idx) => {
            if (idx === vulnIndex) {
              return { ...v, isRemediated: true };
            }
            return v;
          });

          const repairMessage = `Exchanged weak algorithm "${vuln.algorithm}" with Post-Quantum ${vuln.pqcReplacement}`;
          const isLoggedAlready = entry.remediationsPerformed.includes(repairMessage);
          const ledger = isLoggedAlready 
            ? entry.remediationsPerformed 
            : [...entry.remediationsPerformed, repairMessage];

          // Compute healed score
          const activeRisksCount = updatedVulns.filter(v => !v.isRemediated).length;
          let newScore = 0;
          if (entry.initialVulnerabilitiesCount > 0) {
            newScore = Math.round((activeRisksCount / entry.initialVulnerabilitiesCount) * entry.overallRiskScore);
          }

          return {
            ...entry,
            vulnerabilities: updatedVulns,
            remediationsPerformed: ledger,
            overallRiskScore: newScore,
            isVulnerable: activeRisksCount > 0
          };
        }
        return entry;
      });
      setAuditHistory(updatedHistory);
      localStorage.setItem("aegis_audit_history", JSON.stringify(updatedHistory));
    }
  };

  const handleRemoveHistoryEntry = (id: string) => {
    const updated = auditHistory.filter(item => item.id !== id);
    setAuditHistory(updated);
    localStorage.setItem("aegis_audit_history", JSON.stringify(updated));
    if (activeScanId === id) {
      setActiveScanId(null);
    }
  };

  const handleClearHistory = () => {
    setAuditHistory([]);
    localStorage.removeItem("aegis_audit_history");
    setActiveScanId(null);
  };

  const handleRestoreCodeSegment = (dummyCode: string, snippetName: string) => {
    const matched = PRELOADED_CODE_SNIPPETS.find(s => s.label === snippetName || snippetName.includes(s.label));
    if (matched) {
      setAuditCode(matched.code);
      setSelectedSnippetId(matched.id);
    } else {
      setAuditCode(dummyCode);
      setSelectedSnippetId("custom");
    }
    setAuditSubTab("scanner");
  };

  // Shor's Quantum Threat Calculator state
  const [calcKeyType, setCalcKeyType] = useState<"rsa" | "ecc" | "dh">("rsa");
  const [calcKeySize, setCalcKeySize] = useState<number>(2048);

  // Live Clock & Jittery Entropy effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentUTCTime(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    const entropyInterval = setInterval(() => {
      setSystemEntropy(prev => {
        const delta = (Math.random() - 0.5) * 0.000005;
        return parseFloat(Math.max(0.000020, prev + delta).toFixed(6));
      });
    }, 4000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(entropyInterval);
    };
  }, []);

  const handleSnippetChange = (id: string) => {
    setSelectedSnippetId(id);
    const snippet = PRELOADED_CODE_SNIPPETS.find(s => s.id === id);
    if (snippet) {
      setAuditCode(snippet.code);
    }
  };

  const autoRemediateResult = (result: any, currentCode: string) => {
    let newCode = currentCode;
    const updatedVulns = result.vulnerabilities.map((v: any) => {
      const target = v.lineMatch;
      const replacement = v.pqcReplacementCode || v.pqcReplacement;
      if (newCode.includes(target)) {
        newCode = newCode.replace(target, replacement);
        return { ...v, isRemediated: true };
      }
      return v;
    });
    return { newCode, updatedVulns };
  };

  const handleAuditSubmit = async () => {
    setIsAuditing(true);
    setLastScanWasQuick(false);
    setAuditError(null);
    setAuditResult(null);

    try {
      const response = await fetch("/api/audit-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: auditCode })
      });

      if (!response.ok) {
        throw new Error(`Audit agent responded with status ${response.status}`);
      }

      const result = await response.json();
      setOriginalRiskScore(result.overallRiskScore);
      
      let finalResult = result;
      if (autoRemediation && result.vulnerabilities && result.vulnerabilities.length > 0) {
        const { newCode, updatedVulns } = autoRemediateResult(result, auditCode);
        setAuditCode(newCode);
        finalResult = {
          ...result,
          vulnerabilities: updatedVulns,
          isVulnerable: updatedVulns.some((v: any) => !v.isRemediated)
        };
      }
      setAuditResult(finalResult);

      // Save this run into persistent local history trace
      const matchedSnippet = PRELOADED_CODE_SNIPPETS.find(s => s.id === selectedSnippetId);
      const snippetName = matchedSnippet ? matchedSnippet.label : `Custom Code Segment`;
      const scanId = "scan_" + Date.now();

      const newHistoryEntry: AuditHistoryEntry = {
        id: scanId,
        timestamp: new Date().toLocaleString(),
        rawTimestamp: Date.now(),
        overallRiskScore: finalResult.overallRiskScore,
        isVulnerable: finalResult.isVulnerable,
        snippetName: snippetName,
        remediationsPerformed: autoRemediation 
          ? finalResult.vulnerabilities.filter((v: any) => v.isRemediated).map((v: any) => `Exchanged weak algorithm "${v.algorithm}" with Post-Quantum ${v.pqcReplacement}`)
          : [],
        initialVulnerabilitiesCount: finalResult.vulnerabilities.length,
        vulnerabilities: finalResult.vulnerabilities.map((v: any) => ({ ...v, isRemediated: !!v.isRemediated }))
      };

      const updatedHistory = [newHistoryEntry, ...auditHistory];
      setAuditHistory(updatedHistory);
      localStorage.setItem("aegis_audit_history", JSON.stringify(updatedHistory));
      setActiveScanId(scanId);
    } catch (err: any) {
      console.error(err);
      setAuditError(err.message || String(err));
    } finally {
      setIsAuditing(false);
    }
  };

  const handleQuickAudit = async () => {
    setIsQuickAuditing(true);
    setLastScanWasQuick(true);
    setAuditError(null);
    setAuditResult(null);
    setActiveScanId("quick_audit_temp"); // transient non-history scan marker

    try {
      const response = await fetch("/api/audit-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: auditCode })
      });

      if (!response.ok) {
        throw new Error(`Audit agent responded with status ${response.status}`);
      }

      const result = await response.json();
      setOriginalRiskScore(result.overallRiskScore);
      
      let finalResult = result;
      if (autoRemediation && result.vulnerabilities && result.vulnerabilities.length > 0) {
        const { newCode, updatedVulns } = autoRemediateResult(result, auditCode);
        setAuditCode(newCode);
        finalResult = {
          ...result,
          vulnerabilities: updatedVulns,
          isVulnerable: updatedVulns.some((v: any) => !v.isRemediated)
        };
      }
      setAuditResult(finalResult);
      // Skip history logging entirely per requirements
    } catch (err: any) {
      console.error(err);
      setAuditError(err.message || String(err));
    } finally {
      setIsQuickAuditing(false);
    }
  };

  // Periodic background audit sweep
  useEffect(() => {
    if (!backgroundSweepActive) return;

    const intervalId = setInterval(async () => {
      // Avoid running if a manual audit or another background scan is active, or if code is empty
      if (isAuditing || isQuickAuditing || isBackgroundAuditing || !auditCode.trim()) {
        return;
      }

      setIsBackgroundAuditing(true);
      try {
        const response = await fetch("/api/audit-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: auditCode })
        });

        if (!response.ok) {
          throw new Error(`Background sweep returned status ${response.status}`);
        }

        const result = await response.json();
        setOriginalRiskScore(result.overallRiskScore);
        
        let finalResult = result;
        let finalCode = auditCode;
        if (autoRemediation && result.vulnerabilities && result.vulnerabilities.length > 0) {
          const { newCode, updatedVulns } = autoRemediateResult(result, auditCode);
          finalCode = newCode;
          setAuditCode(newCode);
          finalResult = {
            ...result,
            vulnerabilities: updatedVulns,
            isVulnerable: updatedVulns.some((v: any) => !v.isRemediated)
          };
        }
        setAuditResult(finalResult);

        const matchedSnippet = PRELOADED_CODE_SNIPPETS.find(s => s.id === selectedSnippetId);
        const snippetName = matchedSnippet ? `${matchedSnippet.label} (Auto Sweep)` : `Custom Code Segment (Auto Sweep)`;
        const scanId = "autosweep_" + Date.now();

        const newHistoryEntry: AuditHistoryEntry = {
          id: scanId,
          timestamp: new Date().toLocaleTimeString() + " [Background Sweep]",
          rawTimestamp: Date.now(),
          overallRiskScore: finalResult.overallRiskScore,
          isVulnerable: finalResult.isVulnerable,
          snippetName: snippetName,
          remediationsPerformed: autoRemediation 
            ? finalResult.vulnerabilities.filter((v: any) => v.isRemediated).map((v: any) => `Exchanged weak algorithm "${v.algorithm}" with Post-Quantum ${v.pqcReplacement}`)
            : [],
          initialVulnerabilitiesCount: finalResult.vulnerabilities.length,
          vulnerabilities: finalResult.vulnerabilities.map((v: any) => ({ ...v, isRemediated: !!v.isRemediated }))
        };

        setAuditHistory(prev => {
          const updated = [newHistoryEntry, ...prev].slice(0, 50);
          localStorage.setItem("aegis_audit_history", JSON.stringify(updated));
          return updated;
        });

        setActiveScanId(scanId);
        setLastBackgroundSweepTime(new Date().toLocaleTimeString());

        // Desktop Notification Trigger - ONLY if user is navigated to a different tab
        if (document.hidden || document.visibilityState !== "visible") {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            const statusMessage = finalResult.isVulnerable 
              ? `⚠️ DEGRADED STATE - ${finalResult.vulnerabilities.filter((v: any) => !v.isRemediated).length} quantum vulnerabilities detected!` 
              : `✅ COMPLIANT - No quantum vulnerabilities identified.`;
            
            new Notification("🛡️ Aegis Automated PQC Sweep Complete", {
              body: `Background audit finished with overall risk score of ${finalResult.overallRiskScore}/100.\nStatus: ${statusMessage}`,
              icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2314f7ff'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/></svg>",
              tag: "aegis-pqc-sweep"
            });
          }
        }
      } catch (err: any) {
        if (err && (err.message === "Failed to fetch" || err.name === "TypeError")) {
          console.warn("Background audit sweep: network connection unavailable or server restarting.", err.message || err);
        } else {
          console.error("Background audit sweep failed:", err);
        }
      } finally {
        setIsBackgroundAuditing(false);
      }
    }, backgroundSweepInterval * 1000);

    return () => clearInterval(intervalId);
  }, [backgroundSweepActive, backgroundSweepInterval, auditCode, selectedSnippetId, isAuditing, isQuickAuditing, isBackgroundAuditing, autoRemediation]);

  const requestNotificationPermission = () => {
    if (typeof Notification !== "undefined") {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === "granted") {
          new Notification("🛡️ Aegis Desktop Alerts Enabled", {
            body: "Aegis background sweep reports will now notify you when you are in other tabs.",
            icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2314f7ff'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/></svg>"
          });
        }
      });
    }
  };

  const handleExportReport = () => {
    if (!auditResult) return;

    let report = `======================================================================
AEGIS CYBERSECURITY SUITE - POST-QUANTUM CRYPTOGRAPHY AUDIT REPORT
======================================================================
Generated on       : ${new Date().toLocaleString()} (Local Time)
Overall Risk Score : ${auditResult.overallRiskScore}/100 [${auditResult.isVulnerable ? "VULNERABLE (DEGRADED STATE)" : "SECURE (COMPLIANT)"}]

----------------------------------------------------------------------
REMEDIATION SUMMARY:
----------------------------------------------------------------------
${auditResult.remediationSummary}

----------------------------------------------------------------------
VULNERABILITY DETAILS LEDGER (${auditResult.vulnerabilities.length} issues detected)
----------------------------------------------------------------------
`;

    if (auditResult.vulnerabilities.length === 0) {
      report += `No post-quantum cryptographic vulnerabilities detected in this namespace.\n`;
    } else {
      auditResult.vulnerabilities.forEach((vuln, index) => {
        report += `${index + 1}. [${vuln.severity} RISK] ALGORITHM: ${vuln.algorithm}
   • Failure Channel  : ${vuln.threat}
   • Target Code Line : "${vuln.lineMatch}"
   • PQC Replacement  : ${vuln.pqcReplacement}
   • Action Plan      : ${vuln.mitigationSteps}
----------------------------------------------------------------------\n`;
      });
    }

    report += `======================================================================
End of Aegis Autonomous Audit Report.
======================================================================\n`;

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Aegis_PQC_Audit_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!auditResult) return;

    const dataStr = JSON.stringify(auditResult, null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Aegis_PQC_Audit_Report_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerRecalibration = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1800);
  };

  // Shor's Threat Calculations
  const getCrackMetrics = () => {
    if (calcKeyType === "rsa") {
      if (calcKeySize <= 1024) {
        return {
          time: "0.02 seconds",
          logicalQubits: "2,048 qubits",
          risk: "IMMEDIATE FAILURE",
          color: "text-red-500",
          desc: "Already breakable in laboratory simulations. Extremely unsafe for any standard web handshake."
        };
      } else if (calcKeySize <= 2048) {
        return {
          time: "0.15 seconds",
          logicalQubits: "4,096 qubits",
          risk: "HIGH EXPOSURE",
          color: "text-red-400 font-bold",
          desc: "Targeted by Harvest-Now-Decrypt-Later state campaigns. High vulnerable exposure index."
        };
      } else {
        return {
          time: "0.85 seconds",
          logicalQubits: "8,192 qubits",
          risk: "STANDBY THREAT",
          color: "text-amber-500",
          desc: "Will be factored instantly upon execution of Shor's algorithm on first scalable CRQC."
        };
      }
    } else if (calcKeyType === "ecc") {
      if (calcKeySize <= 256) {
        return {
          time: "0.01 seconds",
          logicalQubits: "1,500 qubits",
          risk: "CRITICAL FAILURE",
          color: "text-red-500 font-extrabold",
          desc: "ECC keys possess smaller algebra structures than RSA, providing faster quantum factorization profiles!"
        };
      } else {
        return {
          time: "0.08 seconds",
          logicalQubits: "3,000 qubits",
          risk: "HIGH EXPOSURE",
          color: "text-amber-400 font-bold",
          desc: "Advanced curves (P-384 / Ed25519) offer zero safety margin against Shor's modular lattice operations."
        };
      }
    } else {
      return {
        time: "0.04 seconds",
        logicalQubits: "2,200 qubits",
        risk: "IMMEDIATE EXPLOIT",
        color: "text-red-500",
        desc: "Diffie-Hellman modulus schemes fail directly against quantum discrete log algorithms."
      };
    }
  };

  const crackMetrics = getCrackMetrics();

  return (
    <div className="w-full min-h-screen bg-[#020617] text-[#94a3b8] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#14f7ff]/30 selection:text-white">
      
      {/* Immersive Global Header Bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-blue-500/20 bg-[#020617] relative select-none">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center bg-blue-600/20 border border-blue-400 rounded-lg shadow-[0_0_12px_rgba(96,165,250,0.3)] animate-pulse">
            <div className="w-4 h-4 border-2 border-[#14f7ff] rotate-45"></div>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-mono font-bold tracking-widest text-white leading-none">AEGIS ULTIMATE</h1>
            <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#14f7ff]">Autonomous Defense Framework v4.0.2</p>
          </div>
        </div>
        
        {/* Dynamic header specs */}
        <div className="hidden md:flex items-center gap-8 text-[11px] font-mono">
          <div className="flex flex-col items-end">
            <span className="text-blue-400/70 uppercase text-[9px] tracking-wider">System Entropy</span>
            <span className="text-white font-semibold">{systemEntropy} bits/sec</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-blue-400/70 uppercase text-[9px] tracking-wider">Quantum Sync</span>
            <span className="text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              Synchronized
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-blue-400/70 uppercase text-[9px] tracking-wider">Current Cycle</span>
            <span className="text-white font-semibold">{currentUTCTime || "09:41:04 UTC"}</span>
          </div>
        </div>
      </header>

      {/* Primary Immersive Navigation Terminal Tab Buttons */}
      <nav className="border-b border-blue-500/10 bg-[#070b1a] px-6 py-2.5 flex flex-wrap gap-2 select-none">
        <button
          onClick={() => setActiveTab("command")}
          className={`font-mono text-xs uppercase tracking-widest py-1.5 px-4 rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "command"
              ? "bg-blue-500/15 text-[#14f7ff] border-[#14f7ff]/70 shadow-[0_0_10px_rgba(20,247,255,0.15)] font-bold"
              : "bg-transparent text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Tactical Perimeter Guard
        </button>

        <button
          onClick={() => setActiveTab("pqc")}
          className={`font-mono text-xs uppercase tracking-widest py-1.5 px-4 rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "pqc"
              ? "bg-blue-500/15 text-[#14f7ff] border-[#14f7ff]/70 shadow-[0_0_10px_rgba(20,247,255,0.15)] font-bold"
              : "bg-transparent text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Lattice PQC Sandbox
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`font-mono text-xs uppercase tracking-widest py-1.5 px-4 rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "audit"
              ? "bg-blue-500/15 text-[#14f7ff] border-[#14f7ff]/70 shadow-[0_0_10px_rgba(20,247,255,0.15)] font-bold"
              : "bg-transparent text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse text-[#14f7ff]" />
          AI Cryptographic Audit
        </button>

        <button
          onClick={() => setActiveTab("roadmap")}
          className={`font-mono text-xs uppercase tracking-widest py-1.5 px-4 rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "roadmap"
              ? "bg-blue-500/15 text-[#14f7ff] border-[#14f7ff]/70 shadow-[0_0_10px_rgba(20,247,255,0.15)] font-bold"
              : "bg-transparent text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          NIST Standard Timeline
        </button>

        <button
          onClick={() => setActiveTab("palantir")}
          className={`font-mono text-xs uppercase tracking-widest py-1.5 px-4 rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "palantir"
              ? "bg-blue-500/15 text-[#14f7ff] border-[#14f7ff]/75 shadow-[0_0_10px_rgba(20,247,255,0.2)] font-bold"
              : "bg-transparent text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
          }`}
        >
          <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          Palantir Live Telemetry
        </button>

        <button
          onClick={() => setActiveTab("link-budget")}
          className={`font-mono text-xs uppercase tracking-widest py-1.5 px-4 rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "link-budget"
              ? "bg-blue-500/15 text-[#14f7ff] border-[#14f7ff]/75 shadow-[0_0_10px_rgba(20,247,255,0.2)] font-bold"
              : "bg-transparent text-slate-400 border-transparent hover:border-slate-800 hover:text-white"
          }`}
        >
          <Compass className="w-3.5 h-3.5 animate-spin-slow text-[#14f7ff]" />
          Satellite Link Budget
        </button>
      </nav>

      {/* Main Command View Grid */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 items-stretch">
        
        {/* Left Sidebar: Security Posture indicators (Immersive UI Layout Rule) */}
        <section className="col-span-12 xl:col-span-3 flex flex-col gap-6">
          
          {/* Layer Status Container */}
          <div className="bg-[#0f172a]/40 border border-blue-500/20 p-5 rounded-lg shadow-xl backdrop-blur-sm">
            <h2 className="text-xs font-mono font-bold text-blue-300 uppercase mb-4 tracking-wider border-l-2 border-[#14f7ff] pl-2.5">
              Aegis Security Posture
            </h2>
            <div className="space-y-4 font-mono text-[11px]">
              <div className="flex justify-between items-center bg-[#070b1a] p-2.5 rounded border border-white/5">
                <span className="text-white/80">Zero Trust Gateway</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                  Verified
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#070b1a] p-2.5 rounded border border-white/5">
                <span className="text-white/80">Kyber Lattice Link</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                  Secure
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#070b1a] p-2.5 rounded border border-white/5">
                <span className="text-white/80">Behavioral Matrix</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                  Active
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#070b1a] p-2.5 rounded border border-white/5">
                <span className="text-amber-500 uppercase font-bold">Heuristic Breach Tracker</span>
                <span className="flex items-center gap-1.5 text-amber-500 font-bold uppercase tracking-wider">
                  Polling
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                </span>
              </div>
            </div>
          </div>

          {/* Real Intelligence Feed */}
          <div className="flex-1 bg-[#0f172a]/40 border border-blue-500/20 p-5 rounded-lg shadow-xl backdrop-blur-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-mono font-bold text-blue-300 uppercase mb-4 tracking-wider border-l-2 border-[#14f7ff] pl-2.5">
                Live Post-Quantum Feeds
              </h2>
              <div className="space-y-3 font-mono text-[11px]">
                <div className="p-3 bg-red-950/20 border-l-2 border-red-500 rounded-r">
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Quantum Cryptanalysis threat</p>
                  <p className="text-slate-300 leading-snug">Harvesting of active user session packages recorded. Transition recommended.</p>
                  <p className="text-[9px] text-red-400/70 mt-1 uppercase">IMPACTS: RSA-2048 exchanges</p>
                </div>
                <div className="p-3 bg-blue-900/10 border-l-2 border-blue-500 rounded-r">
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">NIST standard standards</p>
                  <p className="text-slate-300 leading-snug">NIST publishes ultimate SP-203 with primary draft guidelines for Kyber-1024 parameters.</p>
                </div>
                <div className="p-3 bg-emerald-900/10 border-l-2 border-emerald-500 rounded-r">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Compliance Action</p>
                  <p className="text-slate-300 leading-snug">Self-healing suite rotated all session keys to stateless Falcon signature arrays.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/5 pt-4">
              <span className="block text-[10px] uppercase text-[#14f7ff]/60 tracking-wider mb-1">Local Audit Endpoint</span>
              <p className="text-xs text-white/90">/api/audit-code (Online)</p>
            </div>
          </div>
        </section>

        {/* Center Dynamic Command Tab Panel (col-span-12 or col-span-9 depending on layout) */}
        <section className="col-span-12 xl:col-span-9 flex flex-col justify-between gap-6">

          {/* Active Rendering area depending on activeTab */}
          <div className="flex-1">
            {activeTab === "command" && (
              <div className="animate-fade-in">
                <div className="mb-4 bg-[#0a0f1d] border border-blue-500/15 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Perimeter Guard Control Cabin</h2>
                    <p className="text-xs text-slate-400">Launch simulated attacks on modular environments to inspect automated state preservation protocols.</p>
                  </div>
                  <span className="bg-blue-950 text-blue-400 text-[10px] font-mono py-1 px-3 border border-blue-800 rounded uppercase">
                    Red-Team Evaluator
                  </span>
                </div>
                <ThreatMonitor />
              </div>
            )}

            {activeTab === "pqc" && (
              <div className="animate-fade-in">
                <div className="mb-4 bg-[#0a0f1d] border border-blue-500/15 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Quantum-Safe Key Derivation Center</h2>
                    <p className="text-xs text-slate-400">Solve learning-with-errors equations and calculate public polynomial matrix parameters.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-lime-950 text-emerald-400 text-[10px] font-mono py-1 px-3 border border-emerald-800 rounded uppercase font-bold text-right">
                      Derived: {totalKeysGenerated} Pairs
                    </span>
                  </div>
                </div>
                {/* Embedded KeyGenerator passing custom session tracking logic */}
                <KeyGenerator onKeyGenerated={() => setTotalKeysGenerated(prev => prev + 1)} />
              </div>
            )}

            {activeTab === "audit" && (
              <div className="space-y-6">
                {/* Audit workspace tabs header */}
                <div className="border border-blue-500/15 bg-[#0a0f1d] px-4 py-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">NIST Cryptographic Compliance Suite</h2>
                    <p className="text-xs text-slate-400">Scan legacy repositories or review historical posture traces over persistent storage pools.</p>
                  </div>
                  
                  {/* Selector tabs */}
                  <div className="flex bg-[#040810] border border-white/5 rounded-lg p-1 shrink-0 select-none font-mono">
                    <button
                      onClick={() => setAuditSubTab("scanner")}
                      className={`font-mono text-[10px] uppercase font-bold px-3 py-1.5 rounded transition-all cursor-pointer ${
                        auditSubTab === "scanner"
                          ? "bg-blue-500/15 border border-[#14f7ff]/30 text-[#14f7ff]"
                          : "text-slate-400 border border-transparent hover:text-white"
                      }`}
                    >
                      Code Scanner
                    </button>
                    <button
                      onClick={() => setAuditSubTab("history")}
                      className={`font-mono text-[10px] uppercase font-bold px-3 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                        auditSubTab === "history"
                          ? "bg-blue-500/15 border border-[#14f7ff]/30 text-[#14f7ff]"
                          : "text-slate-400 border border-transparent hover:text-white"
                      }`}
                    >
                      Audit History ({auditHistory.length})
                    </button>
                  </div>
                </div>

                {auditSubTab === "scanner" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                    
                    {/* Code audit console left panel */}
                    <div className="lg:col-span-5 border border-blue-500/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-[#14f7ff]" />
                        <h3 className="font-mono text-base font-semibold text-white uppercase tracking-wider">Target Vault Audit</h3>
                      </div>
                      <ShieldAlert className="w-4 h-4 text-[#14f7ff] animate-pulse" />
                    </div>

                    <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                      Select a standard preloaded crypto configuration, or load/paste your operational source code (JS, TS, Python, Go, or Rust) to test vulnerability level against quantum factorization.
                    </p>

                    {/* Preloaded Snippet Selectors */}
                    <div className="space-y-2 mb-4">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#14f7ff] font-bold">Crypto Templates</label>
                      <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px]">
                        {PRELOADED_CODE_SNIPPETS.map(snip => (
                          <button
                            key={snip.id}
                            onClick={() => handleSnippetChange(snip.id)}
                            className={`w-full text-left py-2 px-3 rounded border transition-all ${
                              selectedSnippetId === snip.id
                                ? "bg-blue-500/15 text-[#14f7ff] border-[#14f7ff]/60"
                                : "bg-[#060a13] text-white/50 border-white/5 hover:border-white/10"
                            }`}
                          >
                            📁 {snip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Code Editor */}
                    <div className="relative border border-white/5 rounded-lg overflow-hidden bg-[#060a13] p-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-2">
                        <span className="font-mono text-[9px] text-white/30 uppercase">source_file.tsx</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setAuditCode("")}
                            className="font-mono text-[9px] text-[#ff4c4c]/70 hover:text-[#ff4c4c] flex items-center gap-1 bg-transparent border-none cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Clear
                          </button>
                        </div>
                      </div>
                      
                      <SyntaxHighlightedEditor
                        value={auditCode}
                        onChange={(val) => {
                          setAuditCode(val);
                          setSelectedSnippetId(""); // customized
                        }}
                        placeholder="// Enter your source code here for NIST compliance checks..."
                        className="w-full h-80 pb-12"
                      />

                      {/* Floating 'Quick Audit' button */}
                      <div className="absolute bottom-3 right-3 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleQuickAudit();
                          }}
                          disabled={isAuditing || isQuickAuditing || !auditCode.trim()}
                          className="bg-[#14f7ff]/10 hover:bg-[#14f7ff]/20 active:bg-[#14f7ff]/30 border border-[#14f7ff]/40 hover:border-[#14f7ff] text-[#14f7ff] disabled:opacity-40 disabled:cursor-not-allowed text-[10.5px] uppercase font-mono tracking-wider font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(20,247,255,0.25)] backdrop-blur-md cursor-pointer group"
                        >
                          {isQuickAuditing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 animate-pulse group-hover:scale-110 transition-transform" />
                              Quick Audit
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Automated Remediation Toggle */}
                    <div className="mt-4 space-y-3">
                      {/* Remediation Toggle */}
                      <div className="flex items-center justify-between p-3.5 bg-[#060a13] border border-white/5 rounded-lg select-none">
                        <div className="flex items-center gap-2.5">
                          <Cpu className={`w-4 h-4 transition-colors ${autoRemediation ? "text-[#14f7ff]" : "text-white/30"}`} />
                          <div>
                            <span className="block text-xs font-mono font-bold text-white uppercase tracking-wider">Automated Remediation</span>
                            <span className="block text-[10px] text-slate-400 font-sans">Enable instant classical-to-PQC replacement overrides</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setAutoRemediation(!autoRemediation)}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none flex items-center shrink-0 cursor-pointer ${
                            autoRemediation ? "bg-cyan-500" : "bg-slate-800"
                          }`}
                        >
                          <div
                            className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${
                              autoRemediation ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Automated Background Sweep Toggle */}
                      <div className="p-3.5 bg-[#060a13] border border-white/5 rounded-lg space-y-3 select-none">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Radio className={`w-4 h-4 transition-colors ${backgroundSweepActive ? "text-emerald-400 animate-pulse" : "text-white/30"}`} />
                            <div>
                              <span className="block text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                Automated Background Sweep
                                {isBackgroundAuditing && (
                                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                )}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-sans">
                                Run compliance sweep in background periodically
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setBackgroundSweepActive(!backgroundSweepActive)}
                            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none flex items-center shrink-0 cursor-pointer ${
                              backgroundSweepActive ? "bg-emerald-500" : "bg-slate-800"
                            }`}
                          >
                            <div
                              className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${
                                backgroundSweepActive ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        {backgroundSweepActive && (
                          <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-1">
                            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#14f7ff]/70" /> Interval Cycle
                            </span>
                            <div className="flex gap-1.5 bg-[#030611] p-0.5 rounded border border-white/10">
                              {[15, 30, 60].map(sec => (
                                <button
                                  key={sec}
                                  onClick={() => setBackgroundSweepInterval(sec)}
                                  className={`text-[9px] font-mono font-bold px-2 py-1 rounded transition-all cursor-pointer ${
                                    backgroundSweepInterval === sec
                                      ? "bg-[#14f7ff]/15 text-[#14f7ff] border border-[#14f7ff]/20"
                                      : "text-white/30 hover:text-white/60 border border-transparent"
                                  }`}
                                >
                                  {sec}s
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {lastBackgroundSweepTime && backgroundSweepActive && (
                          <div className="text-[9px] font-mono text-emerald-400/80 flex items-center justify-between bg-emerald-950/10 border border-emerald-500/10 p-1.5 rounded">
                            <span>⚡ Last background sweep completed:</span>
                            <span className="font-bold">{lastBackgroundSweepTime}</span>
                          </div>
                        )}
                      </div>

                      {/* Desktop Notifications Setup */}
                      <div className="p-3.5 bg-[#060a13] border border-white/5 rounded-lg flex items-center justify-between select-none">
                        <div className="flex items-center gap-2.5">
                          <Radio className={`w-4 h-4 ${notificationPermission === "granted" ? "text-cyan-400" : "text-white/30"}`} />
                          <div>
                            <span className="block text-xs font-mono font-bold text-white uppercase tracking-wider">
                              Desktop Alerts Status
                            </span>
                            <span className="block text-[10px] text-slate-400 font-sans">
                              {notificationPermission === "granted" 
                                ? "Notifications allowed. Ready to alert you on other tabs."
                                : notificationPermission === "denied"
                                ? "Notification permission denied. Enable in browser site settings."
                                : "Aegis needs browser permission to send background alerts."}
                            </span>
                          </div>
                        </div>

                        {notificationPermission !== "granted" ? (
                          <button
                            onClick={requestNotificationPermission}
                            disabled={notificationPermission === "denied"}
                            className="bg-[#14f7ff]/10 hover:bg-[#14f7ff]/20 border border-[#14f7ff]/30 hover:border-[#14f7ff] text-[#14f7ff] font-mono text-[9px] font-bold uppercase py-1.5 px-3 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            Grant Permission
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 py-1 px-2.5 rounded uppercase font-bold tracking-wider">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Audit trigger CTA */}
                  <button
                    onClick={handleAuditSubmit}
                    disabled={isAuditing || isQuickAuditing || !auditCode.trim()}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-[#14f7ff]/10 hover:bg-[#14f7ff]/20 border border-[#14f7ff]/50 hover:border-[#14f7ff] text-[#14f7ff] py-3.5 rounded-lg font-mono font-bold text-sm tracking-wider uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_12px_rgba(20,247,255,0.1)]"
                  >
                    {isAuditing ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin text-[#14f7ff]" />
                        Running Quantum Compliance sweep...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4.5 h-4.5" />
                        Execute PQC Audit Sweep
                      </>
                    )}
                  </button>
                </div>

                {/* Outcomes panel right */}
                <div className="lg:col-span-7 border border-blue-500/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl flex flex-col justify-between min-h-[500px]">
                  
                  {!isAuditing && !isQuickAuditing && !auditResult && !auditError && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                      <Cpu className="w-12 h-12 text-[#14f7ff]/20 mb-4 animate-pulse" />
                      <p className="font-mono text-sm text-[#14f7ff]/50 uppercase tracking-widest font-semibold">Ready for Compliance Directive</p>
                      <p className="text-xs text-slate-500 max-w-sm leading-relaxed mt-2 font-sans">
                        Request a compliance sweep on the left interface. Aegis-AI will inspect legacy cryptographic hashes, signature mechanisms, and public structures for Shor's and Grover's algorithm resilience.
                      </p>
                    </div>
                  )}

                  {(isAuditing || isQuickAuditing) && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                      <div className="w-16 h-16 rounded-full border-4 border-dashed border-[#14f7ff]/50 border-t-[#14f7ff] animate-spin flex items-center justify-center mb-6">
                        <Shield className="w-8 h-8 text-[#14f7ff]" />
                      </div>
                      <h4 className="font-mono text-sm text-white uppercase tracking-widest mb-2 animate-pulse">Scanning Code Segments</h4>
                      <p className="font-mono text-[11px] text-[#14f7ff]/70 max-w-xs leading-relaxed">
                        Comparing syntax trees against standardized parameters in NIST Special Publication 800-224...
                      </p>
                    </div>
                  )}

                  {auditError && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-red-950/10 border border-red-500/30 rounded-lg">
                      <AlertOctagon className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
                      <h4 className="font-mono text-sm text-red-400 uppercase tracking-wider">Analysis Vector Intact</h4>
                      <p className="text-xs text-white/70 max-w-sm leading-relaxed mt-2">{auditError}</p>
                    </div>
                  )}

                  {!isAuditing && !isQuickAuditing && auditResult && (
                    <div className="flex-1 flex flex-col justify-between gap-5 animate-fade-in pr-1 overflow-x-hidden">
                      {/* Metric summary metadata card */}
                      <div className="border border-[#14f7ff]/20 bg-[#060a13] rounded-lg p-4 flex flex-col md:flex-row items-stretch justify-between gap-4 font-mono">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            <span className="text-[11px] font-bold uppercase text-[#14f7ff] mr-1">AI Compliance Appraisal</span>
                            {lastScanWasQuick && (
                              <span className="bg-[#14f7ff]/10 text-[#14f7ff] text-[9px] font-bold border border-[#14f7ff]/30 py-0.5 px-2 rounded uppercase tracking-wider animate-pulse">
                                ⚡ MINIMAL SCAN (UNLOGGED)
                              </span>
                            )}
                            {auditResult.isVulnerable ? (
                              <span className="bg-red-950 text-red-400 text-[9px] font-bold border border-red-800 py-0.5 px-2 rounded uppercase tracking-wider">
                                DEGRADED STATE
                              </span>
                            ) : (
                              <span className="bg-emerald-950 text-emerald-400 text-[9px] font-bold border border-emerald-800 py-0.5 px-2 rounded uppercase tracking-wider">
                                COMPLIANT
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-white/70 leading-relaxed font-sans">{auditResult.remediationSummary}</p>
                        </div>

                        {/* Visual Circular Risk rating */}
                        <div className="w-full md:w-36 flex flex-col items-center justify-center bg-[#070b1a] rounded p-3 border border-white/5 shrink-0 text-center">
                          <span className="text-[9px] uppercase text-white/40 tracking-wider">Risk Score</span>
                          <span className={`text-4xl font-extrabold my-1 ${
                            auditResult.overallRiskScore > 75 
                              ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]" 
                              : auditResult.overallRiskScore > 35 
                              ? "text-amber-500" 
                              : "text-emerald-400"
                          }`}>
                            {auditResult.overallRiskScore}
                          </span>
                          <span className="text-[8.5px] text-white/50 uppercase leading-none">Vulnerability level</span>
                        </div>
                      </div>

                      {/* Score description bar */}
                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-2">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/5 pb-1 gap-2">
                          <h4 className="font-mono text-xs uppercase text-[#14f7ff]/70 font-bold">vulnerability details ledger ({auditResult.vulnerabilities.length})</h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleExportReport}
                              className="flex items-center gap-1.5 bg-[#14f7ff]/10 hover:bg-[#14f7ff]/20 border border-[#14f7ff]/40 hover:border-[#14f7ff] text-[#14f7ff] py-1 px-2.5 rounded text-[10px] font-mono tracking-wider uppercase transition-all shadow-[0_0_8px_rgba(20,247,255,0.05)] cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Export Report
                            </button>
                            <button
                              onClick={handleExportJson}
                              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500 text-emerald-400 py-1 px-2.5 rounded text-[10px] font-mono tracking-wider uppercase transition-all shadow-[0_0_8px_rgba(16,185,129,0.05)] cursor-pointer"
                              title="Download full audit scan details as a structured JSON file"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Export to JSON
                            </button>
                          </div>
                        </div>
                        {auditResult.vulnerabilities.length === 0 ? (
                          <div className="py-8 text-center bg-[#070b1a] rounded border border-white/5">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                            <p className="font-mono text-xs text-slate-400">Zero cryptographic vulnerabilities detected in this namespace!</p>
                          </div>
                        ) : (
                          auditResult.vulnerabilities.map((vuln, index) => (
                            <div key={index} className="bg-[#050811] border border-white/5 rounded-lg p-3.5 space-y-2.5 font-mono text-[11px] relative overflow-hidden">
                              <div className={`absolute top-0 left-0 w-1.5 h-full ${vuln.isRemediated ? "bg-emerald-500" : "bg-red-500"}`} />
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 pl-2.5">
                                <span className="font-bold text-white text-xs uppercase">{vuln.algorithm}</span>
                                {vuln.isRemediated ? (
                                  <span className="bg-emerald-950 text-emerald-400 text-[9px] font-bold font-mono py-0.5 px-2 rounded border border-emerald-800 self-start animate-fade-in">
                                    REMEDIATED & PQC COMPLIANT
                                  </span>
                                ) : (
                                  <span className="bg-red-950 text-red-400 text-[9px] font-bold font-mono py-0.5 px-2 rounded border border-red-800 self-start">
                                    {vuln.severity} RISK
                                  </span>
                                )}
                              </div>

                              <div className="pl-2.5 space-y-1 text-slate-300">
                                <p className="font-sans text-[11.5px] leading-relaxed select-text"><b className="text-[#14f7ff]">Failure Channel:</b> {vuln.threat}</p>
                                <p className="text-[11px] flex items-center overflow-x-auto whitespace-nowrap bg-black/40 py-1.5 px-2.5 rounded text-rose-300 font-mono select-text">
                                  <code className="text-[11px]">{vuln.lineMatch}</code>
                                </p>
                              </div>

                              <div className="bg-[#0a1824] p-2.5 rounded-md border border-emerald-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 ml-2.5">
                                <div className="flex-1">
                                  <span className="text-[#14f7ff] block text-[9.5px] uppercase font-bold">Post-Quantum Remediation Selection</span>
                                  <span className="text-white font-sans text-[11.5px] leading-relaxed block inline">{vuln.mitigationSteps}</span>
                                </div>
                                <div className="flex flex-row md:flex-col items-end gap-2 shrink-0">
                                  <div className="text-right">
                                    <span className="text-[8.5px] uppercase text-white/30 block">NIST Alternative</span>
                                    <span className="text-emerald-400 font-bold text-[11.5px] uppercase tracking-wider block">{vuln.pqcReplacement}</span>
                                  </div>
                                  {!vuln.isRemediated && (
                                    <button
                                      onClick={() => handleApplyFix(index)}
                                      disabled={!auditCode.includes(vuln.lineMatch)}
                                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500 disabled:opacity-45 disabled:hover:bg-emerald-500/5 disabled:hover:border-emerald-500/20 text-emerald-400 rounded text-[9.5px] font-mono uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer font-bold shrink-0 mt-1 md:mt-2"
                                      title={auditCode.includes(vuln.lineMatch) ? "Automatically replace weak code segment with the PQC alternative" : "Legacy code segment not found in the editor"}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Apply Fix
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
                <div className="animate-fade-in text-slate-300">
                  <AuditHistory 
                    history={auditHistory}
                    onRemoveEntry={handleRemoveHistoryEntry}
                    onClearAll={handleClearHistory}
                    onRestoreCode={handleRestoreCodeSegment}
                    onViewActiveScan={() => setAuditSubTab("scanner")}
                  />
                </div>
              )}
            </div>
          )}

            {activeTab === "roadmap" && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Mathematical selector explaining standard algorithms */}
                <div className="border border-blue-500/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl">
                  <div className="flex items-center gap-1.5 mb-2 border-b border-white/5 pb-2">
                    <Award className="w-5 h-5 text-[#14f7ff]" />
                    <h3 className="font-mono text-base font-semibold text-white uppercase tracking-wider">Standardized Algorithmic Specifications</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    NIST formally finalized its standardized post-quantum schemes in August 2024. These represent the global state transition vector against Shor's cracking logic.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PQC_ALGORITHMS.map(algo => (
                      <div key={algo.id} className="bg-[#060a13] border border-white/5 p-4 rounded-lg flex flex-col justify-between font-mono text-xs">
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-white font-bold">{algo.name}</span>
                            <span className="bg-[#14f7ff]/10 text-[#14f7ff] rounded py-0.5 px-2 text-[9px] uppercase tracking-wider font-bold">
                              {algo.type}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 font-sans leading-normal mb-3">{algo.description}</p>
                        </div>

                        <div className="border-t border-white/5 pt-2 space-y-1 text-[10px] text-slate-300">
                          <p><b className="text-white">NIST Level:</b> Category {algo.nistLevel}</p>
                          <p><b className="text-white">Security Strength:</b> {algo.estimatedStrength}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NIST Migration timeline and calculator grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* PQC Roadmap */}
                  <div className="lg:col-span-7 border border-blue-500/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl">
                    <div className="flex items-center gap-1.5 mb-4 font-mono select-none">
                      <Clock className="w-4.5 h-4.5 text-[#14f7ff]" />
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wider">NIST Strategic Deployment Timeline (2024-2035)</h4>
                    </div>

                    <div className="space-y-4 relative pl-5 border-l border-blue-500/25">
                      {NIST_MIGRATION_TIMELINE.map((time, index) => (
                        <div key={index} className="relative font-mono text-xs text-slate-300">
                          {/* Chronological dots */}
                          <div className="absolute -left-[25.5px] top-1.5 w-2.5 h-2.5 rounded-full border border-blue-500 bg-[#020617]" />
                          
                          <div className="bg-[#050811] border border-white/5 p-3 rounded-lg flex justify-between items-start gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-extrabold text-sm text-[#14f7ff]">{time.year}</span>
                                <span className="text-white font-bold opacity-90">— {time.task}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{time.desc}</p>
                            </div>

                            <span className={`text-[9px] font-bold py-0.5 px-2 rounded uppercase border tracking-wider shrink-0 ${
                              time.state === "Completed" 
                                ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/30" 
                                : time.state === "Action Required"
                                ? "bg-red-950/20 text-red-500 border-red-800/30 animate-pulse font-bold"
                                : time.state === "Planning Phase"
                                ? "bg-sky-950/20 text-sky-450 border-sky-800/30"
                                : "bg-pink-950/20 text-pink-400 border-pink-800/30 font-bold"
                            }`}>
                              {time.state}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shor's calculator */}
                  <div className="lg:col-span-5 border border-blue-500/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl flex flex-col justify-between">
                    <div className="font-mono">
                      <div className="flex items-center gap-1.5 mb-3">
                        <AlertTriangle className="w-4.5 h-4.5 text-[#14f7ff]" />
                        <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Shor's Threat Estimator Simulator</h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Input classical public key parameters used in your current infrastructure namespaces below to evaluate Shor's factoring vulnerability levels dynamically.
                      </p>

                      <div className="space-y-4 text-xs font-mono">
                        {/* Algorithm select */}
                        <div>
                          <label className="block text-slate-400 uppercase text-[9px] tracking-wider mb-1.5">Key exchange structure</label>
                          <div className="grid grid-cols-3 gap-2">
                            {["rsa", "ecc", "dh"].map(type => (
                              <button
                                key={type}
                                onClick={() => {
                                  setCalcKeyType(type as any);
                                  setCalcKeySize(type === "rsa" ? 2048 : type === "ecc" ? 256 : 2048);
                                }}
                                className={`py-1.5 rounded text-[10.5px] border uppercase transition-all font-bold ${
                                  calcKeyType === type 
                                    ? "bg-blue-500/10 text-[#14f7ff] border-[#14f7ff]/70" 
                                    : "bg-[#060a13] text-white/40 border-transparent hover:border-white/10"
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bit size input/slider slider */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-slate-400 uppercase text-[9px] tracking-wider">Asymmetric Parameter Size (Bit length)</label>
                            <span className="text-[#14f7ff] font-bold">{calcKeySize} Bits</span>
                          </div>
                          
                          {calcKeyType === "rsa" && (
                            <input 
                              type="range" 
                              min="1024" 
                              max="4096" 
                              step="1024" 
                              value={calcKeySize} 
                              onChange={(e) => setCalcKeySize(Number(e.target.value))}
                              className="w-full accent-[#14f7ff] bg-slate-800 rounded h-1 cursor-pointer"
                            />
                          )}

                          {calcKeyType === "ecc" && (
                            <input 
                              type="range" 
                              min="256" 
                              max="384" 
                              step="128" 
                              value={calcKeySize} 
                              onChange={(e) => setCalcKeySize(Number(e.target.value))}
                              className="w-full accent-[#14f7ff] bg-slate-800 rounded h-1 cursor-pointer"
                            />
                          )}

                          {calcKeyType === "dh" && (
                            <input 
                              type="range" 
                              min="2048" 
                              max="4096" 
                              step="2048" 
                              value={calcKeySize} 
                              onChange={(e) => setCalcKeySize(Number(e.target.value))}
                              className="w-full accent-[#14f7ff] bg-slate-800 rounded h-1 cursor-pointer"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Calculator Results display */}
                    <div className="bg-[#050811] p-4 rounded-lg border border-white/5 space-y-3 font-mono text-[11px] mt-6">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400 uppercase text-[9px]">Shor's Factoring Velocity</span>
                        <span className={`font-mono text-white font-extrabold ${crackMetrics.color}`}>{crackMetrics.time}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400 uppercase text-[9px]">Required Quantum Computer Size</span>
                        <span className="text-white font-bold">{crackMetrics.logicalQubits}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400 uppercase text-[9px]">Security Vulnerability status</span>
                        <span className={`font-bold ${crackMetrics.color}`}>{crackMetrics.risk}</span>
                      </div>
                      
                      <p className="text-[10px] leading-relaxed text-slate-400 font-sans italic pr-1 pt-1">
                        * {crackMetrics.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "palantir" && (
              <div className="animate-fade-in">
                <div className="mb-4 bg-[#0a0f1d] border border-blue-500/15 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Palantir Telemetry Dashboard</h2>
                    <p className="text-xs text-slate-400">Secure WebSocket real-time telemetry stream from underlying post-quantum Aegis nodes.</p>
                  </div>
                  <span className="bg-emerald-950 text-emerald-400 text-[10px] font-mono py-1 px-3 border border-emerald-800/50 rounded uppercase font-bold text-center animate-pulse shrink-0">
                    Live Socket.IO Node
                  </span>
                </div>
                <PalantirDashboard />
              </div>
            )}

            {activeTab === "link-budget" && (
              <div className="animate-fade-in">
                <div className="mb-4 bg-[#0a0f1d] border border-blue-500/15 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Satellite Link Budget Analyzer</h2>
                    <p className="text-xs text-slate-400">STIA Tactical utility calculating Free Space Path Loss, Antenna Gain, and G/T metrics for Telstar 11N slots.</p>
                  </div>
                  <span className="bg-blue-950 text-[#14f7ff] text-[10px] font-mono py-1 px-3 border border-blue-800/50 rounded uppercase font-bold text-center animate-pulse shrink-0">
                    STIA LOG: 8842-DELTA
                  </span>
                </div>
                <LinkBudgetCalculator />
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Immersive Footer HUD (Immersive UI Layout Rule) */}
      <footer className="h-12 bg-blue-950/20 border-t border-blue-500/20 px-6 flex items-center justify-between text-[9px] md:text-[10px] text-blue-400/80 font-mono tracking-widest select-none overflow-x-auto gap-4">
        <div className="flex gap-6 uppercase shrink-0">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> 
            Secure Control Engine: <span className="text-white font-semibold">10.0.8.1</span>
          </span>
          <span className="hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> 
            Decoy Honeynets: <span className="text-emerald-400 font-bold font-semibold">ONLINE</span>
          </span>
        </div>
        <div className="flex gap-4 shrink-0 font-mono">
          <span className="bg-blue-500/10 px-2 py-0.5 border border-blue-500/20 text-[#14f7ff] uppercase">Cluster Safety: 99.8%</span>
          <span className="bg-blue-500/10 px-2 py-0.5 border border-blue-500/20 text-white font-bold">UTC CLOCK: ACTIVE</span>
        </div>
      </footer>

      {/* Toast Warning Notifications Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {simulatorAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-[#0a060a]/95 border border-red-500/40 hover:border-red-500/80 rounded-lg p-3.5 shadow-[0_0_20px_rgba(239,68,68,0.25)] flex items-start gap-3 backdrop-blur-md transition-shadow relative overflow-hidden group font-mono text-[11px]"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />

              <div className="bg-red-500/10 p-1.5 rounded border border-red-500/25 shrink-0 mt-0.5">
                <AlertOctagon className="w-4 h-4 text-red-500 animate-bounce" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2.5 mb-1">
                  <span className="text-[9.5px] font-extrabold text-red-400 tracking-wider uppercase flex items-center gap-1">
                    ⚠️ SIMULATOR VECTOR WARNING
                  </span>
                  <span className="text-[8.5px] text-white/30 font-bold">
                    {alert.timestamp}
                  </span>
                </div>
                <p className="text-white font-sans text-xs font-semibold leading-relaxed mb-1 pr-4">
                  {alert.message}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold py-0.5 px-1.5 rounded uppercase tracking-widest">
                    {alert.component}
                  </span>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold py-0.5 px-1.5 rounded uppercase font-bold">
                    {alert.level} RISK
                  </span>
                </div>
              </div>

              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-white/20 hover:text-white/85 transition-colors p-1 rounded hover:bg-white/5 cursor-pointer shrink-0 absolute top-2 right-2"
                title="Dismiss Alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
