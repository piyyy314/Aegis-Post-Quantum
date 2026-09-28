import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Server,
  Terminal,
  Radio,
  Lock,
  Unlock,
  AlertTriangle,
  Flame,
  Zap,
  Play,
  RefreshCw,
  Trash2,
  Download,
  Filter,
  Eye,
  CheckCircle2,
  Crosshair,
  Wifi,
  Globe,
  Layers,
  Cpu,
  ArrowRight
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { HoneypotLogEntry, FirewallRule, HoneypotStatus } from "../types";
import { NetworkPacketInspector } from "./NetworkPacketInspector";

export function HoneypotFirewall() {
  const [logs, setLogs] = useState<HoneypotLogEntry[]>([]);
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  const [status, setStatus] = useState<HoneypotStatus>({
    sshOnline: true,
    sshPort: 2222,
    telnetOnline: true,
    telnetPort: 2323,
    webTrapsOnline: true,
    totalConnectionsCaught: 0,
    totalCredentialsHarvested: 0,
    totalMaliciousCommands: 0,
    bannedIpsCount: 0,
    autoBlockEnabled: true
  });
  const [loading, setLoading] = useState(false);
  const [filterService, setFilterService] = useState<string>("ALL");
  const [activeSubTab, setActiveSubTab] = useState<"feed" | "firewall" | "simulator" | "inspection">("inspection");

  // Custom Ban Form state
  const [customIp, setCustomIp] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [customTool, setCustomTool] = useState<"iptables" | "ufw" | "ip-route">("iptables");
  const [banLoading, setBanLoading] = useState(false);

  // Custom Simulation Form state
  const [simService, setSimService] = useState<"ssh" | "telnet" | "web" | "satcom">("ssh");
  const [simIp, setSimIp] = useState("");
  const [simUser, setSimUser] = useState("");
  const [simPass, setSimPass] = useState("");
  const [simCommand, setSimCommand] = useState("");
  const [simRunning, setSimRunning] = useState(false);

  // Action status message toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "warn" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "warn" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes, rulesRes] = await Promise.all([
        fetch("/api/honeypot/status").then((r) => r.json()),
        fetch("/api/honeypot/logs").then((r) => r.json()),
        fetch("/api/firewall/rules").then((r) => r.json())
      ]);

      if (statusRes) setStatus(statusRes);
      if (Array.isArray(logsRes)) setLogs(logsRes);
      if (Array.isArray(rulesRes)) setFirewallRules(rulesRes);
    } catch (err: any) {
      console.error("Failed to load honeypot data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Setup Socket.IO listener for live honeypot intercepts & firewall drops
    const socket: Socket = io();

    socket.on("honeypot_log", (entry: HoneypotLogEntry) => {
      setLogs((prev) => [entry, ...prev.filter((l) => l.id !== entry.id)].slice(0, 150));
      setStatus((prev) => ({
        ...prev,
        totalConnectionsCaught: prev.totalConnectionsCaught + 1,
        totalCredentialsHarvested: entry.credentials ? prev.totalCredentialsHarvested + 1 : prev.totalCredentialsHarvested,
        totalMaliciousCommands: entry.command ? prev.totalMaliciousCommands + 1 : prev.totalMaliciousCommands
      }));
    });

    socket.on("firewall_blocked", (rule: FirewallRule) => {
      setFirewallRules((prev) => [rule, ...prev.filter((r) => r.ip !== rule.ip)]);
      setStatus((prev) => ({ ...prev, bannedIpsCount: prev.bannedIpsCount + 1 }));
      showToast(`🔥 Firewall Block Enforced on ${rule.ip} via ${rule.firewallTool.toUpperCase()}`, "warn");
    });

    socket.on("firewall_unbanned", (data: { ip: string }) => {
      setFirewallRules((prev) => prev.filter((r) => r.ip !== data.ip));
      setStatus((prev) => ({ ...prev, bannedIpsCount: Math.max(0, prev.bannedIpsCount - 1) }));
      showToast(`Rule revoked for IP ${data.ip}`, "success");
    });

    socket.on("firewall_rules_cleared", () => {
      setFirewallRules([]);
      setStatus((prev) => ({ ...prev, bannedIpsCount: 0 }));
      showToast("All firewall rules cleared", "success");
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  // Handle Manual Ban
  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIp.trim()) return;

    try {
      setBanLoading(true);
      const res = await fetch("/api/firewall/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: customIp.trim(),
          reason: customReason.trim() || "Manual Operator Ban via Aegis Console",
          tool: customTool
        })
      });

      const data = await res.json();
      if (data.success && data.rule) {
        setFirewallRules((prev) => [data.rule, ...prev.filter((r) => r.ip !== data.rule.ip)]);
        setCustomIp("");
        setCustomReason("");
        showToast(`Rule enforced: ${data.rule.commandExecuted}`, "success");
      }
    } catch (err: any) {
      showToast(`Failed to ban IP: ${err.message}`, "error");
    } finally {
      setBanLoading(false);
    }
  };

  // Handle Quick Ban from log row
  const handleQuickBan = async (ip: string, service: string, port: number) => {
    try {
      const res = await fetch("/api/firewall/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip,
          reason: `Honeypot Intercept (${service} :${port})`,
          tool: "iptables"
        })
      });
      const data = await res.json();
      if (data.success && data.rule) {
        setFirewallRules((prev) => [data.rule, ...prev.filter((r) => r.ip !== data.rule.ip)]);
        showToast(`Rule enforced: ${data.rule.commandExecuted}`, "success");
      }
    } catch (err: any) {
      showToast(`Failed to block IP: ${err.message}`, "error");
    }
  };

  // Handle Unban
  const handleUnban = async (ip: string) => {
    try {
      const res = await fetch("/api/firewall/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      if (data.success) {
        setFirewallRules((prev) => prev.filter((r) => r.ip !== ip));
        showToast(`Unbanned ${ip} and cleared firewall rules`, "success");
      }
    } catch (err: any) {
      showToast(`Failed to unban IP: ${err.message}`, "error");
    }
  };

  // Handle Clear All Rules
  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to flush all firewall rules?")) return;
    try {
      await fetch("/api/firewall/clear-all", { method: "POST" });
      setFirewallRules([]);
      showToast("All firewall rules successfully flushed", "success");
    } catch (err: any) {
      showToast("Failed to clear rules", "error");
    }
  };

  // Toggle Auto-Block
  const handleToggleAutoBlock = async () => {
    const nextState = !status.autoBlockEnabled;
    try {
      const res = await fetch("/api/firewall/toggle-autoblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState })
      });
      const data = await res.json();
      if (data.success) {
        setStatus((prev) => ({ ...prev, autoBlockEnabled: data.autoBlock }));
        showToast(`Auto-firewall enforcement ${data.autoBlock ? "ENABLED" : "DISABLED"}`, "success");
      }
    } catch (err) {
      showToast("Failed to toggle auto-block", "error");
    }
  };

  // Trigger Simulation Scenario
  const handleSimulate = async (type: "ssh" | "telnet" | "web" | "satcom", customParams?: any) => {
    try {
      setSimRunning(true);
      const res = await fetch("/api/honeypot/simulate-attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          ...customParams
        })
      });

      const data = await res.json();
      if (data.success && data.log) {
        setLogs((prev) => [data.log, ...prev.filter((l) => l.id !== data.log.id)]);
        if (data.status) setStatus(data.status);
        showToast(`Simulated ${type.toUpperCase()} intrusion intercepted and blocked!`, "success");
      }
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, "error");
    } finally {
      setSimRunning(false);
    }
  };

  // Export Forensic Log
  const handleExportLogs = () => {
    const report = {
      timestamp: new Date().toISOString(),
      system: "AEGIS ULTIMATE HONEYPOT & FIREWALL IPS",
      status,
      activeFirewallRules: firewallRules,
      interceptedLogs: logs
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aegis-honeypot-forensics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Forensic log exported as JSON", "success");
  };

  const filteredLogs = logs.filter((log) => {
    if (filterService === "ALL") return true;
    return log.service === filterService;
  });

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Toast feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-2xl border font-mono text-xs flex items-center gap-2 animate-bounce ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/60 text-emerald-300"
              : toastMessage.type === "warn"
              ? "bg-amber-950/95 border-amber-500/60 text-amber-300"
              : "bg-red-950/95 border-red-500/60 text-red-300"
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Honeypot Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fake SSH Daemon */}
        <div className="bg-[#070b18] border border-blue-500/20 rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-[#14f7ff]/50 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-[#14f7ff] border border-blue-500/20">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider">Fake SSH Daemon</h4>
                <p className="text-[10px] text-slate-400">OpenSSH 8.4p1 Emulation</p>
              </div>
            </div>
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider animate-pulse">
              Port :2222 Active
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-300">
            <span>Protocol: SSH-2.0</span>
            <span className="text-[#14f7ff] font-bold">Auto-Drop on Probe</span>
          </div>
        </div>

        {/* Fake Telnet Service */}
        <div className="bg-[#070b18] border border-blue-500/20 rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-[#14f7ff]/50 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider">Fake Telnet Service</h4>
                <p className="text-[10px] text-slate-400">Cisco IOS / Telstar 11N</p>
              </div>
            </div>
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider animate-pulse">
              Port :2323 Active
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-300">
            <span>Interactive Shell & Trap</span>
            <span className="text-amber-400 font-bold">Cred Harvesting</span>
          </div>
        </div>

        {/* Web Decoy Traps */}
        <div className="bg-[#070b18] border border-blue-500/20 rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-[#14f7ff]/50 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider">Web Decoy Honeytokens</h4>
                <p className="text-[10px] text-slate-400">/.env, /admin, /wp-login</p>
              </div>
            </div>
            <span className="bg-purple-950/80 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
              13 Traps Active
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-300">
            <span>HTTP Honeytoken Pool</span>
            <span className="text-purple-400 font-bold">Instant IP Ban</span>
          </div>
        </div>

        {/* System Firewall Status */}
        <div className="bg-[#070b18] border border-red-500/20 rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-red-500/50 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-400 border border-red-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider">System Firewall (IPS)</h4>
                <p className="text-[10px] text-slate-400">iptables / ufw Enforcement</p>
              </div>
            </div>
            <span className="bg-red-950/80 text-red-400 border border-red-700/50 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
              {firewallRules.length} Banned IPs
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-300">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400" />
              Auto-Block: {status.autoBlockEnabled ? "ON" : "OFF"}
            </span>
            <button
              onClick={handleToggleAutoBlock}
              className="text-[#14f7ff] hover:underline cursor-pointer font-bold uppercase"
            >
              Toggle
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar & Sub-Navigation */}
      <div className="bg-[#0a0f1d] border border-blue-500/20 rounded-xl p-4 shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Sub tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab("inspection")}
            className={`px-3.5 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "inspection"
                ? "bg-cyan-500/20 border-[#14f7ff] text-[#14f7ff] shadow-[0_0_15px_rgba(20,247,255,0.25)] font-bold"
                : "bg-[#060a13] border-white/10 text-white/50 hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#14f7ff] animate-pulse" />
            Packet Inspection
            <span className="text-[9px] bg-[#14f7ff]/20 text-[#14f7ff] px-1.5 py-0.2 rounded font-bold ml-0.5">
              WIRESHARK
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("feed")}
            className={`px-3.5 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "feed"
                ? "bg-[#14f7ff]/15 border-[#14f7ff] text-[#14f7ff] shadow-[0_0_12px_rgba(20,247,255,0.15)]"
                : "bg-[#060a13] border-white/10 text-white/50 hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Honeypot Intercept Feed ({logs.length})
          </button>

          <button
            onClick={() => setActiveSubTab("firewall")}
            className={`px-3.5 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "firewall"
                ? "bg-red-500/15 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                : "bg-[#060a13] border-white/10 text-white/50 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Active Firewall Rules ({firewallRules.length})
          </button>

          <button
            onClick={() => setActiveSubTab("simulator")}
            className={`px-3.5 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "simulator"
                ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : "bg-[#060a13] border-white/10 text-white/50 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Interactive Attack Simulator
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[#14f7ff] px-3 py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExportLogs}
            className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-[10.5px] font-bold uppercase transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Forensics JSON
          </button>
        </div>
      </div>

      {/* SUB-TAB 0: WIRESHARK NETWORK PACKET INSPECTOR */}
      {activeSubTab === "inspection" && (
        <div className="animate-fade-in">
          <NetworkPacketInspector initialLogs={logs} onFirewallBlock={handleQuickBan} />
        </div>
      )}

      {/* SUB-TAB 1: LIVE INTERCEPT FEED */}
      {activeSubTab === "feed" && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-[#060a13] p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 uppercase text-[10px]">Filter Vector:</span>
              {["ALL", "SSH", "TELNET", "WEB", "SATCOM"].map((srv) => (
                <button
                  key={srv}
                  onClick={() => setFilterService(srv)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    filterService === srv
                      ? "bg-blue-500/20 text-[#14f7ff] border border-blue-500/50"
                      : "text-slate-400 hover:text-white bg-black/30 border border-transparent"
                  }`}
                >
                  {srv}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-slate-400">
              Showing <span className="text-white font-bold">{filteredLogs.length}</span> of{" "}
              <span className="text-white font-bold">{logs.length}</span> captured intrusions
            </div>
          </div>

          {/* Log Stream Cards */}
          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="bg-[#070b18] border border-white/5 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-300 font-bold">No active intrusions logged for this filter category.</p>
                <p className="text-slate-500 text-[11px] mt-1">Use the Interactive Attack Simulator to test honeypot triggers live!</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#050811] border border-white/5 hover:border-blue-500/30 rounded-lg p-3.5 space-y-2 relative overflow-hidden transition-all group"
                >
                  {/* Color accent left bar */}
                  <div
                    className={`absolute top-0 left-0 bottom-0 w-1 ${
                      log.service === "SSH"
                        ? "bg-[#14f7ff]"
                        : log.service === "TELNET"
                        ? "bg-amber-500"
                        : log.service === "WEB"
                        ? "bg-purple-500"
                        : "bg-blue-500"
                    }`}
                  />

                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pl-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          log.service === "SSH"
                            ? "bg-blue-950 text-[#14f7ff] border-blue-800"
                            : log.service === "TELNET"
                            ? "bg-amber-950 text-amber-400 border-amber-800"
                            : log.service === "WEB"
                            ? "bg-purple-950 text-purple-300 border-purple-800"
                            : "bg-emerald-950 text-emerald-400 border-emerald-800"
                        }`}
                      >
                        {log.service} :{log.port}
                      </span>
                      <span className="text-white font-bold text-xs">{log.action}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">{log.timestamp}</span>
                      {log.blocked ? (
                        <span className="bg-red-950/80 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 text-red-400" />
                          IPTABLES BLOCKED
                        </span>
                      ) : (
                        <span className="bg-amber-950/80 text-amber-400 border border-amber-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                          LOGGED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details and Harvested Data */}
                  <div className="pl-2 space-y-1.5 text-slate-300">
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 flex-wrap">
                      <span>
                        Source IP: <b className="text-white font-mono">{log.sourceIp}</b>
                        {log.sourcePort ? `:${log.sourcePort}` : ""}
                      </span>
                      {log.firewallRule && (
                        <span className="text-red-400 font-mono text-[9.5px] bg-red-950/30 px-2 py-0.5 rounded border border-red-800/30">
                          {log.firewallRule}
                        </span>
                      )}
                    </div>

                    {/* Harvested credentials if any */}
                    {log.credentials && (
                      <div className="bg-amber-950/20 border border-amber-500/20 rounded p-2 text-[10.5px] flex items-center gap-3">
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          Harvested Credentials: Username:{" "}
                          <b className="text-white bg-black/40 px-1.5 py-0.5 rounded text-amber-300">
                            {log.credentials.username || "N/A"}
                          </b>{" "}
                          | Password:{" "}
                          <b className="text-white bg-black/40 px-1.5 py-0.5 rounded text-amber-300">
                            {log.credentials.password || "N/A"}
                          </b>
                        </span>
                      </div>
                    )}

                    {/* Executed command if any */}
                    {log.command && (
                      <div className="bg-[#040810] border border-blue-500/20 rounded p-2 text-[10.5px] font-mono text-[#14f7ff] flex items-start gap-2">
                        <Terminal className="w-3.5 h-3.5 text-[#14f7ff] shrink-0 mt-0.5" />
                        <div className="overflow-x-auto whitespace-pre-wrap break-all">
                          <span className="text-white/60">Interpreted Shell Command: </span>
                          <span className="text-emerald-400 font-bold">{log.command}</span>
                        </div>
                      </div>
                    )}

                    {/* Raw payload */}
                    {log.payload && (
                      <div className="text-[10px] bg-black/40 p-2 rounded text-slate-400 font-mono overflow-x-auto whitespace-nowrap">
                        <span className="text-white/40">Raw Intercept: </span>
                        {log.payload}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pl-2 pt-1 flex justify-end gap-2">
                    {!firewallRules.some((r) => r.ip === log.sourceIp) ? (
                      <button
                        onClick={() => handleQuickBan(log.sourceIp, log.service, log.port)}
                        className="text-[9.5px] bg-red-950/40 hover:bg-red-950/80 border border-red-800/60 text-red-300 px-2.5 py-1 rounded uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <ShieldAlert className="w-3 h-3 text-red-400" />
                        Block IP via iptables
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnban(log.sourceIp)}
                        className="text-[9.5px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-2.5 py-1 rounded uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Unlock className="w-3 h-3 text-slate-400" />
                        Revoke Ban
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ACTIVE FIREWALL RULES MATRIX (iptables & ufw) */}
      {activeSubTab === "firewall" && (
        <div className="space-y-6 animate-fade-in">
          {/* Manual Ban Controls */}
          <div className="bg-[#0a0f1d] border border-blue-500/20 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                Manual System Firewall Enforcement (iptables / ufw)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Execute low-level system firewall commands to immediately drop packets from malicious hosts or subnets.
            </p>

            <form onSubmit={handleManualBan} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-[9.5px] text-slate-400 uppercase tracking-wider mb-1">Target IPv4 Address</label>
                <input
                  type="text"
                  placeholder="e.g. 198.51.100.44"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 focus:border-[#14f7ff] rounded p-2 text-white font-mono text-xs outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[9.5px] text-slate-400 uppercase tracking-wider mb-1">Ban Reason / CVE</label>
                <input
                  type="text"
                  placeholder="e.g. SSH Brute Force :2222 probe"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 focus:border-[#14f7ff] rounded p-2 text-white font-mono text-xs outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[9.5px] text-slate-400 uppercase tracking-wider mb-1">Firewall Tool</label>
                <select
                  value={customTool}
                  onChange={(e) => setCustomTool(e.target.value as any)}
                  className="w-full bg-[#050811] border border-white/10 focus:border-[#14f7ff] rounded p-2 text-white font-mono text-xs outline-none cursor-pointer"
                >
                  <option value="iptables">iptables (-I INPUT -j DROP)</option>
                  <option value="ufw">ufw (deny from)</option>
                  <option value="ip-route">ip route (blackhole)</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={banLoading || !customIp.trim()}
                  className="w-full py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 hover:border-red-500 text-red-300 font-bold uppercase rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  {banLoading ? "Enforcing..." : "Execute Ban"}
                </button>
              </div>
            </form>
          </div>

          {/* Active Rules Table */}
          <div className="bg-[#0a0f1d] border border-blue-500/20 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Active Firewall Rule Ledger ({firewallRules.length})
                </h3>
                <p className="text-[10.5px] text-slate-400">All inbound packets matching these addresses are immediately destroyed.</p>
              </div>

              {firewallRules.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-950/80 border border-red-800 text-red-400 px-3 py-1 rounded text-[10.5px] font-bold uppercase transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Flush All Rules
                </button>
              )}
            </div>

            {firewallRules.length === 0 ? (
              <div className="bg-[#070b18] border border-white/5 rounded-lg p-8 text-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-300 font-bold">Firewall filter tables are currently clean.</p>
                <p className="text-slate-500 text-[11px] mt-1">No IP addresses currently restricted.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase text-[9.5px]">
                      <th className="py-2.5 px-3">Target IPv4</th>
                      <th className="py-2.5 px-3">Trigger Reason</th>
                      <th className="py-2.5 px-3">System Firewall Command</th>
                      <th className="py-2.5 px-3">Enforcement</th>
                      <th className="py-2.5 px-3">Dropped</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {firewallRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                          <Flame className="w-3 h-3 text-red-400 shrink-0" />
                          <span>{rule.ip}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={rule.reason}>
                          {rule.reason}
                        </td>
                        <td className="py-2.5 px-3">
                          <code className="text-red-400 bg-black/40 px-2 py-0.5 rounded text-[10px]">
                            {rule.commandExecuted}
                          </code>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                              rule.executionStatus === "EXECUTED"
                                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                : "bg-blue-950 text-[#14f7ff] border-blue-800"
                            }`}
                          >
                            {rule.executionStatus === "EXECUTED" ? "KERNEL DROP" : "CONTAINER ENFORCED"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-amber-400">{rule.packetsDropped} pkts</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[10px]">{rule.bannedAt}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleUnban(rule.ip)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-2.5 py-1 rounded text-[9.5px] uppercase font-bold transition-all cursor-pointer"
                          >
                            Unban
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: INTERACTIVE ATTACK SIMULATOR */}
      {activeSubTab === "simulator" && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Launch Scenarios */}
          <div className="bg-[#0a0f1d] border border-blue-500/20 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                Automated Honeypot & Firewall Attack Vectors
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Trigger real intrusion scenarios against the active SSH daemon (port 2222), Telnet daemon (port 2323), Web Honeytokens, and SatCom VSAT links to evaluate instant IP blocking.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scenario 1: SSH Brute Force */}
              <div className="bg-[#060a13] border border-white/10 rounded-lg p-4 flex flex-col justify-between space-y-3 hover:border-blue-500/40 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-bold text-xs uppercase flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#14f7ff]" />
                      SSH Hydra Brute-Force (:2222)
                    </span>
                    <span className="bg-blue-950 text-[#14f7ff] border border-blue-800 text-[8.5px] px-1.5 py-0.5 rounded uppercase font-bold">
                      Port 2222
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                    Emulates an automated dictionary attacker running Hydra against the fake OpenSSH 8.4p1 daemon, triggering authentication traps and executing an <code className="text-red-400">iptables DROP</code> rule.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulate("ssh")}
                  disabled={simRunning}
                  className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-[#14f7ff] font-bold uppercase rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  Launch SSH Attack Scenario
                </button>
              </div>

              {/* Scenario 2: Telnet Mirai Shell Injection */}
              <div className="bg-[#060a13] border border-white/10 rounded-lg p-4 flex flex-col justify-between space-y-3 hover:border-amber-500/40 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-bold text-xs uppercase flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      Telnet Mirai Staging Sequence (:2323)
                    </span>
                    <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[8.5px] px-1.5 py-0.5 rounded uppercase font-bold">
                      Port 2323
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                    Connects to the fake Cisco IOS router on port 2323, passes default credentials, injects staging commands (<code className="text-amber-400">cat /etc/passwd; wget mirai.arm7</code>), and executes a <code className="text-red-400">ufw deny</code> rule.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulate("telnet")}
                  disabled={simRunning}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold uppercase rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  Launch Telnet Mirai Probe
                </button>
              </div>

              {/* Scenario 3: Web Honeytoken Crawler */}
              <div className="bg-[#060a13] border border-white/10 rounded-lg p-4 flex flex-col justify-between space-y-3 hover:border-purple-500/40 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-bold text-xs uppercase flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-purple-400" />
                      Web Honeytoken Crawler (/.env & /admin)
                    </span>
                    <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[8.5px] px-1.5 py-0.5 rounded uppercase font-bold">
                      Port 3000
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                    Simulates vulnerability scanners probing HTTP endpoints like <code className="text-purple-300">/.env</code>, <code className="text-purple-300">/admin</code>, or <code className="text-purple-300">/wp-login.php</code>, serving honeytokens and dropping the source IP.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulate("web")}
                  disabled={simRunning}
                  className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-bold uppercase rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  Trigger Web Honeytoken Exfil
                </button>
              </div>

              {/* Scenario 4: Satellite VSAT Modbus Recon */}
              <div className="bg-[#060a13] border border-white/10 rounded-lg p-4 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-bold text-xs uppercase flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      Telstar 11N Teleport Modbus Spoof
                    </span>
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8.5px] px-1.5 py-0.5 rounded uppercase font-bold">
                      SatCom Vector
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                    Simulates spoofed RF uplink telemetry attempting to override Ottawa Teleport dish transmitter gain parameters on the Telstar 11N VSAT slot.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulate("satcom")}
                  disabled={simRunning}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-bold uppercase rounded text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  Simulate SatCom Teleport Spoof
                </button>
              </div>
            </div>
          </div>

          {/* Custom Attack Builder */}
          <div className="bg-[#0a0f1d] border border-blue-500/20 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
              <Crosshair className="w-4 h-4 text-[#14f7ff]" />
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                Custom Probe Constructor
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-[9.5px] text-slate-400 uppercase tracking-wider mb-1">Service Target</label>
                <select
                  value={simService}
                  onChange={(e) => setSimService(e.target.value as any)}
                  className="w-full bg-[#050811] border border-white/10 focus:border-[#14f7ff] rounded p-2 text-white font-mono text-xs outline-none cursor-pointer"
                >
                  <option value="ssh">Fake SSH Daemon (:2222)</option>
                  <option value="telnet">Fake Telnet Service (:2323)</option>
                  <option value="web">Web Honeytoken Traps (:3000)</option>
                  <option value="satcom">Telstar 11N SatCom (:2323)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] text-slate-400 uppercase tracking-wider mb-1">Origin IP (Simulated)</label>
                <input
                  type="text"
                  placeholder="e.g. 198.51.100.99"
                  value={simIp}
                  onChange={(e) => setSimIp(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 focus:border-[#14f7ff] rounded p-2 text-white font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] text-slate-400 uppercase tracking-wider mb-1">Username / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. admin, root, vsat_op"
                  value={simUser}
                  onChange={(e) => setSimUser(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 focus:border-[#14f7ff] rounded p-2 text-white font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] text-slate-400 uppercase tracking-wider mb-1">Password / Payload</label>
                <input
                  type="text"
                  placeholder="e.g. password123, /admin, sh run"
                  value={simPass}
                  onChange={(e) => setSimPass(e.target.value)}
                  className="w-full bg-[#050811] border border-white/10 focus:border-[#14f7ff] rounded p-2 text-white font-mono text-xs outline-none"
                />
              </div>
            </div>

            <button
              onClick={() =>
                handleSimulate(simService, {
                  ip: simIp || undefined,
                  username: simUser || undefined,
                  password: simPass || undefined,
                  command: simPass || undefined
                })
              }
              disabled={simRunning}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/50 hover:to-cyan-600/50 border border-[#14f7ff]/50 text-white font-bold uppercase rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(20,247,255,0.15)] disabled:opacity-50"
            >
              <Play className="w-4 h-4 text-[#14f7ff]" />
              {simRunning ? "Executing Probe Sequence..." : "Dispatch Custom Probe & Enforce Firewall Block"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
