/**
 * BPF-Style Packet Filter Panel & IP Whitelist Management Panel
 * Allows security operators to compile Berkeley Packet Filters (BPF) and manage
 * a trusted IP whitelist ledger to bypass honeypot alerts and auto-blocks for internal SOC traffic.
 */

import React, { useState } from "react";
import {
  Sliders,
  Filter,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  HelpCircle,
  Sparkles,
  Terminal,
  ShieldCheck,
  UserCheck,
  Clock,
  Globe,
  Lock,
} from "lucide-react";
import { InspectedPacket, HoneypotLogEntry } from "../types";

export interface BpfFilterRule {
  id: string;
  name: string;
  expression: string;
  action: "FOCUS" | "IGNORE"; // FOCUS = white-list/isolate matching; IGNORE = drop/suppress matching
  enabled: boolean;
  createdAt: string;
  matchedCount: number;
  description: string;
}

export interface WhitelistedIpEntry {
  id: string;
  ipOrCidr: string;
  description: string;
  addedBy: string;
  createdAt: string;
  expiration: "PERMANENT" | "24_HOURS" | "7_DAYS" | "1_HOUR";
  active: boolean;
  bypassedCount: number;
}

export const PRESET_BPF_RULES: Omit<BpfFilterRule, "id" | "createdAt" | "matchedCount">[] = [
  {
    name: "Focus SSH Hydra Brute-Force",
    expression: "tcp dst port 2222 and tcp flags syn",
    action: "FOCUS",
    enabled: true,
    description: "Isolates incoming SSH handshake initialization attempts on honeypot port 2222."
  },
  {
    name: "Ignore Internal Subnet Scans",
    expression: "not src net 10.0.0.0/8 and not src host 127.0.0.1",
    action: "IGNORE",
    enabled: true,
    description: "Filters out benign internal diagnostic pings and localhost telemetry."
  },
  {
    name: "Focus Telnet Botnet Shell Injections",
    expression: "tcp dst port 2323 and ip proto tcp",
    action: "FOCUS",
    enabled: true,
    description: "Highlights IoT and Mirai botnet credential harvesting on Telnet port 2323."
  },
  {
    name: "Focus Web Decoy Honeytokens",
    expression: "dst port 80 or dst port 3000",
    action: "FOCUS",
    enabled: false,
    description: "Monitors HTTP probes targeting /.env, /admin, and credential exfiltration paths."
  },
  {
    name: "Suppress Known Shodan Recon Probes",
    expression: "not src host 198.51.100.42",
    action: "IGNORE",
    enabled: false,
    description: "Suppresses noisy, non-destructive automated port scanner sweeps."
  }
];

export const INITIAL_WHITELIST_ENTRIES: WhitelistedIpEntry[] = [
  {
    id: "wl_1",
    ipOrCidr: "127.0.0.1",
    description: "Localhost Security Agent & Internal Diagnostics",
    addedBy: "System (Default)",
    createdAt: "Today 08:00",
    expiration: "PERMANENT",
    active: true,
    bypassedCount: 142,
  },
  {
    id: "wl_2",
    ipOrCidr: "10.0.8.0/24",
    description: "Aegis Admin & Command Console Subnet",
    addedBy: "SecOps Lead (baalbek)",
    createdAt: "Today 09:30",
    expiration: "PERMANENT",
    active: true,
    bypassedCount: 89,
  },
  {
    id: "wl_3",
    ipOrCidr: "198.51.100.1",
    description: "Internal SIEM Telemetry Aggregator Proxy",
    addedBy: "SecOps Admin",
    createdAt: "Yesterday",
    expiration: "7_DAYS",
    active: true,
    bypassedCount: 34,
  },
];

// Lightweight BPF expression parser/evaluator
export function evaluateBpfFilter(packet: {
  sourceIp: string;
  destPort: number;
  sourcePort?: number;
  protocol?: string;
  tcpFlags?: string[];
}, expression: string): boolean {
  if (!expression || !expression.trim()) return true;

  const expr = expression.toLowerCase().trim();
  const clauses = expr.split(/\s+(or|\|\|)\s+/);

  for (let clause of clauses) {
    if (clause === "or" || clause === "||") continue;

    let subMatch = true;
    const andTerms = clause.split(/\s+(and|&&)\s+/);

    for (let term of andTerms) {
      if (term === "and" || term === "&&") continue;

      let isNegated = false;
      let cleanTerm = term.trim();
      if (cleanTerm.startsWith("not ") || cleanTerm.startsWith("!")) {
        isNegated = true;
        cleanTerm = cleanTerm.replace(/^(not\s+|!\s*)/, "").trim();
      }

      let termResult = true;

      if (cleanTerm.includes("dst port")) {
        const portNum = parseInt(cleanTerm.replace(/.*dst port\s+/, ""), 10);
        termResult = packet.destPort === portNum;
      } else if (cleanTerm.includes("src port")) {
        const portNum = parseInt(cleanTerm.replace(/.*src port\s+/, ""), 10);
        termResult = packet.sourcePort === portNum;
      } else if (cleanTerm.includes("port")) {
        const portNum = parseInt(cleanTerm.replace(/.*port\s+/, ""), 10);
        termResult = packet.destPort === portNum || packet.sourcePort === portNum;
      } else if (cleanTerm.includes("src host") || cleanTerm.includes("src ip")) {
        const host = cleanTerm.replace(/.*(src host|src ip)\s+/, "").trim();
        termResult = packet.sourceIp === host;
      } else if (cleanTerm.includes("host")) {
        const host = cleanTerm.replace(/.*host\s+/, "").trim();
        termResult = packet.sourceIp === host;
      } else if (cleanTerm.includes("src net")) {
        const net = cleanTerm.replace(/.*src net\s+/, "").trim();
        if (net.includes("/8")) {
          const prefix = net.split(".")[0];
          termResult = packet.sourceIp.startsWith(prefix + ".");
        } else if (net.includes("/16")) {
          const prefix = net.split(".").slice(0, 2).join(".");
          termResult = packet.sourceIp.startsWith(prefix + ".");
        } else {
          termResult = packet.sourceIp.startsWith(net.split("/")[0]);
        }
      } else if (cleanTerm.includes("tcp flags")) {
        const flagName = cleanTerm.replace(/.*tcp flags\s+/, "").trim().toUpperCase();
        termResult = packet.tcpFlags ? packet.tcpFlags.includes(flagName) : true;
      } else if (cleanTerm.includes("ip proto tcp") || cleanTerm === "tcp") {
        termResult = packet.protocol ? packet.protocol.toUpperCase().includes("TCP") || packet.protocol.toUpperCase().includes("SSH") || packet.protocol.toUpperCase().includes("TELNET") || packet.protocol.toUpperCase().includes("HTTP") : true;
      } else if (cleanTerm.includes("ip proto udp") || cleanTerm === "udp") {
        termResult = packet.protocol ? packet.protocol.toUpperCase().includes("UDP") : false;
      }

      if (isNegated) {
        termResult = !termResult;
      }

      if (!termResult) {
        subMatch = false;
        break;
      }
    }

    if (subMatch) return true;
  }

  return false;
}

// IP Whitelist Evaluator
export function isIpWhitelisted(ip: string, whitelist: WhitelistedIpEntry[]): boolean {
  if (!ip) return false;
  const cleanIp = ip.replace(/^::ffff:/, "").trim();

  return whitelist.some(entry => {
    if (!entry.active) return false;
    const target = entry.ipOrCidr.trim();

    if (target.includes("/")) {
      const [prefix, bitsStr] = target.split("/");
      const bits = parseInt(bitsStr, 10) || 24;
      if (bits === 8) {
        return cleanIp.startsWith(prefix.split(".")[0] + ".");
      }
      if (bits === 16) {
        return cleanIp.startsWith(prefix.split(".").slice(0, 2).join(".") + ".");
      }
      if (bits === 24) {
        return cleanIp.startsWith(prefix.split(".").slice(0, 3).join(".") + ".");
      }
      return cleanIp.startsWith(prefix);
    }

    return cleanIp === target;
  });
}

interface PacketFilterPanelProps {
  rules: BpfFilterRule[];
  onAddRule: (rule: Omit<BpfFilterRule, "id" | "createdAt" | "matchedCount">) => void;
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
  onResetRules: () => void;
  
  // Whitelist Props
  whitelistEntries?: WhitelistedIpEntry[];
  onAddWhitelistEntry?: (entry: Omit<WhitelistedIpEntry, "id" | "createdAt" | "bypassedCount">) => void;
  onToggleWhitelistEntry?: (id: string) => void;
  onDeleteWhitelistEntry?: (id: string) => void;
}

export const PacketFilterPanel: React.FC<PacketFilterPanelProps> = ({
  rules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  onResetRules,
  whitelistEntries: propsWhitelist,
  onAddWhitelistEntry,
  onToggleWhitelistEntry,
  onDeleteWhitelistEntry,
}) => {
  const [activeTab, setActiveTab] = useState<"bpf" | "whitelist">("bpf");

  // Local Whitelist Fallback if parent doesn't provide
  const [localWhitelist, setLocalWhitelist] = useState<WhitelistedIpEntry[]>(INITIAL_WHITELIST_ENTRIES);
  const whitelistList = propsWhitelist || localWhitelist;

  // BPF Form State
  const [newExpr, setNewExpr] = useState("");
  const [newName, setNewName] = useState("");
  const [newAction, setNewAction] = useState<"FOCUS" | "IGNORE">("FOCUS");
  const [newDesc, setNewDesc] = useState("");
  const [bpfSyntaxError, setBpfSyntaxError] = useState<string | null>(null);

  // Whitelist Form State
  const [wlIp, setWlIp] = useState("");
  const [wlDesc, setWlDesc] = useState("");
  const [wlAddedBy, setWlAddedBy] = useState("SecOps Operator");
  const [wlExp, setWlExp] = useState<"PERMANENT" | "24_HOURS" | "7_DAYS" | "1_HOUR">("PERMANENT");
  const [wlError, setWlError] = useState<string | null>(null);

  // Validate BPF expression
  const validateBpf = (expr: string) => {
    if (!expr.trim()) {
      setBpfSyntaxError(null);
      return false;
    }
    const validKeywords = ["tcp", "udp", "ip", "port", "dst", "src", "host", "net", "flags", "and", "or", "not", "syn", "ack", "rst"];
    const tokens = expr.toLowerCase().split(/[\s()]+/);
    const hasValidToken = tokens.some(t => validKeywords.some(k => t.includes(k) || !isNaN(Number(t))));
    
    if (!hasValidToken) {
      setBpfSyntaxError("Invalid BPF syntax. Expected keywords: tcp, dst port, src host, net, tcp flags");
      return false;
    }

    setBpfSyntaxError(null);
    return true;
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpr.trim()) return;
    if (!validateBpf(newExpr)) return;

    onAddRule({
      name: newName.trim() || `Custom BPF Filter (${newAction})`,
      expression: newExpr.trim(),
      action: newAction,
      enabled: true,
      description: newDesc.trim() || `User-defined BPF filter: ${newExpr}`,
    });

    setNewExpr("");
    setNewName("");
    setNewDesc("");
    setBpfSyntaxError(null);
  };

  // Add Trusted Whitelist Entry
  const handleCreateWhitelistEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const targetIp = wlIp.trim();
    if (!targetIp) return;

    // IPv4 / CIDR Basic Regex Validation
    const ipCidrRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[12][0-9]|3[0-2]))?$/;
    if (!ipCidrRegex.test(targetIp) && targetIp !== "127.0.0.1" && targetIp !== "localhost") {
      setWlError("Invalid IPv4 Address or CIDR mask (e.g. 192.168.1.50 or 10.0.8.0/24)");
      return;
    }

    setWlError(null);

    const entryObj = {
      ipOrCidr: targetIp,
      description: wlDesc.trim() || "Trusted SOC Source IP Whitelist",
      addedBy: wlAddedBy.trim() || "SecOps Operator",
      expiration: wlExp,
      active: true,
    };

    if (onAddWhitelistEntry) {
      onAddWhitelistEntry(entryObj);
    } else {
      setLocalWhitelist(prev => [
        {
          ...entryObj,
          id: `wl_${Date.now()}`,
          createdAt: new Date().toLocaleTimeString(),
          bypassedCount: 0,
        },
        ...prev,
      ]);
    }

    setWlIp("");
    setWlDesc("");
  };

  const handleToggleLocalWhitelist = (id: string) => {
    if (onToggleWhitelistEntry) {
      onToggleWhitelistEntry(id);
    } else {
      setLocalWhitelist(prev =>
        prev.map(e => (e.id === id ? { ...e, active: !e.active } : e))
      );
    }
  };

  const handleDeleteLocalWhitelist = (id: string) => {
    if (onDeleteWhitelistEntry) {
      onDeleteWhitelistEntry(id);
    } else {
      setLocalWhitelist(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="space-y-6 font-mono select-none">
      {/* Top Banner with Panel Switcher */}
      <div className="border border-blue-500/20 bg-[#0a0f1d] p-5 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#14f7ff]/10 border border-[#14f7ff]/30 text-[#14f7ff]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
                Packet Filter & IP Whitelist Control Engine
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Compile BPF filters or define trusted IP whitelists to bypass honeypot alerts and prevent false-positive bans.
              </p>
            </div>
          </div>
        </div>

        {/* Panel View Switcher */}
        <div className="flex bg-[#040810] border border-white/10 rounded-lg p-1 font-mono text-xs select-none shrink-0">
          <button
            onClick={() => setActiveTab("bpf")}
            className={`py-1.5 px-3 rounded-md transition-all cursor-pointer flex items-center gap-1.5 font-bold ${
              activeTab === "bpf"
                ? "bg-blue-500/20 text-[#14f7ff] border border-[#14f7ff]/50 shadow-[0_0_10px_rgba(20,247,255,0.2)]"
                : "text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            BPF Rules ({rules.length})
          </button>

          <button
            onClick={() => setActiveTab("whitelist")}
            className={`py-1.5 px-3 rounded-md transition-all cursor-pointer flex items-center gap-1.5 font-bold ${
              activeTab === "whitelist"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : "text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            IP Whitelist ({whitelistList.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: BPF PACKET FILTER PANEL */}
      {activeTab === "bpf" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Form: Create BPF Rule */}
          <div className="lg:col-span-5 bg-[#060a13] border border-blue-500/20 p-5 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Plus className="w-4 h-4 text-[#14f7ff]" />
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                Compile Custom BPF Expression
              </h3>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-[#14f7ff] uppercase font-bold tracking-wider mb-1">
                  Rule Label
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Focus Port 2222 SSH Scans"
                  className="w-full bg-[#030712] border border-white/10 focus:border-[#14f7ff] p-2.5 rounded-lg text-white font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#14f7ff] uppercase font-bold tracking-wider mb-1">
                  BPF Filter Expression Syntax
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newExpr}
                    onChange={e => {
                      setNewExpr(e.target.value);
                      validateBpf(e.target.value);
                    }}
                    placeholder="e.g. tcp dst port 2222 and not src net 10.0.0.0/8"
                    className={`w-full bg-[#030712] border p-2.5 rounded-lg text-white font-mono text-xs outline-none ${
                      bpfSyntaxError ? "border-red-500 bg-red-950/10" : "border-white/10 focus:border-[#14f7ff]"
                    }`}
                  />
                </div>
                {bpfSyntaxError ? (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {bpfSyntaxError}
                  </p>
                ) : (
                  <p className="text-[9.5px] text-slate-500 mt-1">
                    Syntax examples: <code className="text-slate-300">tcp dst port 2323</code>, <code className="text-slate-300">not src host 198.51.100.42</code>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-[#14f7ff] uppercase font-bold tracking-wider mb-1">
                  Filter Action Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAction("FOCUS")}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newAction === "FOCUS"
                        ? "bg-[#14f7ff]/20 text-[#14f7ff] border-[#14f7ff] shadow-[0_0_10px_rgba(20,247,255,0.2)]"
                        : "bg-[#030712] text-slate-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    FOCUS / PASS
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAction("IGNORE")}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newAction === "IGNORE"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        : "bg-[#030712] text-slate-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    DROP / IGNORE
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  Description / Context
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full bg-[#030712] border border-white/10 focus:border-[#14f7ff] p-2 rounded-lg text-white font-mono text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!newExpr.trim() || !!bpfSyntaxError}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/50 hover:to-cyan-600/50 border border-[#14f7ff]/50 text-white font-bold uppercase rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(20,247,255,0.15)] disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-[#14f7ff]" />
                Compile & Inject BPF Filter
              </button>
            </form>
          </div>

          {/* List: Active BPF Rules */}
          <div className="lg:col-span-7 bg-[#060a13] border border-blue-500/20 p-5 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#14f7ff]" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                  Active BPF Rule Ledger ({rules.length})
                </h3>
              </div>
              <button
                onClick={onResetRules}
                className="text-[10px] text-[#14f7ff] hover:underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restore Presets
              </button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {rules.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-lg">
                  No active BPF packet filter rules loaded.
                </div>
              ) : (
                rules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      rule.enabled
                        ? rule.action === "FOCUS"
                          ? "bg-[#081326] border-[#14f7ff]/40 shadow-[0_0_10px_rgba(20,247,255,0.08)]"
                          : "bg-[#1f1707] border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.08)]"
                        : "bg-[#030610] border-white/5 opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            rule.action === "FOCUS"
                              ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}>
                            {rule.action}
                          </span>
                          <h4 className="font-bold text-white text-xs">{rule.name}</h4>
                        </div>

                        <div className="bg-[#02050c] p-1.5 rounded border border-white/10 font-mono text-[11px] text-[#14f7ff]">
                          <code>{rule.expression}</code>
                        </div>

                        <p className="text-[10.5px] text-slate-400">{rule.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onToggleRule(rule.id)}
                          className={`py-1 px-2.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            rule.enabled
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : "bg-slate-800 text-slate-400 border-white/10 hover:text-white"
                          }`}
                        >
                          {rule.enabled ? "ACTIVE" : "DISABLED"}
                        </button>

                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete BPF Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Injected: {rule.createdAt}</span>
                      <span>Matched Packets: <b className="text-white">{rule.matchedCount}</b></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TRUSTED IP WHITELIST MANAGEMENT TABLE */}
      {activeTab === "whitelist" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Form: Add Whitelisted IP */}
          <div className="lg:col-span-5 bg-[#060a13] border border-emerald-500/20 p-5 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                Add Trusted Source IP / Subnet
              </h3>
            </div>

            <form onSubmit={handleCreateWhitelistEntry} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-1">
                  Trusted IP Address or CIDR Subnet
                </label>
                <input
                  type="text"
                  value={wlIp}
                  onChange={e => setWlIp(e.target.value)}
                  placeholder="e.g. 192.168.1.50 or 10.0.8.0/24"
                  className={`w-full bg-[#030712] border p-2.5 rounded-lg text-white font-mono text-xs outline-none ${
                    wlError ? "border-red-500 bg-red-950/10" : "border-white/10 focus:border-emerald-500"
                  }`}
                />
                {wlError && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {wlError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-1">
                  Description / Host Purpose
                </label>
                <input
                  type="text"
                  value={wlDesc}
                  onChange={e => setWlDesc(e.target.value)}
                  placeholder="e.g. Internal SOC Jump Box / Security Gateway"
                  className="w-full bg-[#030712] border border-white/10 focus:border-emerald-500 p-2.5 rounded-lg text-white font-mono text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Added By (Operator)
                  </label>
                  <input
                    type="text"
                    value={wlAddedBy}
                    onChange={e => setWlAddedBy(e.target.value)}
                    className="w-full bg-[#030712] border border-white/10 p-2 rounded-lg text-white font-mono text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    TTL Expiration
                  </label>
                  <select
                    value={wlExp}
                    onChange={e => setWlExp(e.target.value as any)}
                    className="w-full bg-[#030712] border border-white/10 focus:border-emerald-500 p-2 rounded-lg text-white font-mono text-xs outline-none cursor-pointer"
                  >
                    <option value="PERMANENT">Permanent (No Expire)</option>
                    <option value="24_HOURS">24 Hours</option>
                    <option value="7_DAYS">7 Days</option>
                    <option value="1_HOUR">1 Hour</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!wlIp.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 hover:from-emerald-600/50 hover:to-cyan-600/50 border border-emerald-500/50 text-white font-bold uppercase rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)] disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Add IP to Trusted Whitelist
              </button>
            </form>
          </div>

          {/* List: Whitelisted Trusted IP Ledger Table */}
          <div className="lg:col-span-7 bg-[#060a13] border border-emerald-500/20 p-5 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                  Trusted IP Whitelist Ledger ({whitelistList.length})
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Check className="w-3 h-3" />
                Bypasses Honeypot Alerts & Auto-Bans
              </span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
              {whitelistList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-white/10 rounded-lg">
                  No whitelisted source IPs or subnets configured.
                </div>
              ) : (
                whitelistList.map(entry => (
                  <div
                    key={entry.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      entry.active
                        ? "bg-[#061912] border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.08)]"
                        : "bg-[#030610] border-white/5 opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            entry.active
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-slate-800 text-slate-400 border border-white/10"
                          }`}>
                            {entry.active ? "BYPASS ACTIVE" : "PAUSED"}
                          </span>
                          <h4 className="font-bold text-white text-xs">{entry.ipOrCidr}</h4>
                        </div>

                        <p className="text-[11px] text-slate-300">{entry.description}</p>
                        <p className="text-[10px] text-slate-400">Added by: <span className="text-white">{entry.addedBy}</span></p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleLocalWhitelist(entry.id)}
                          className={`py-1 px-2.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            entry.active
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : "bg-slate-800 text-slate-400 border-white/10 hover:text-white"
                          }`}
                        >
                          {entry.active ? "TRUSTED" : "PAUSED"}
                        </button>

                        <button
                          onClick={() => handleDeleteLocalWhitelist(entry.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Remove Whitelist Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>TTL Expire: <b className="text-emerald-400">{entry.expiration}</b></span>
                      <span>Bypassed Alerts: <b className="text-white">{entry.bypassedCount}</b></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
