/**
 * BPF-Style Packet Filter Panel for Aegis Honeypot Subsystem
 * Allows security operators to compile and enforce Berkeley Packet Filters (BPF)
 * to ignore background scanner noise or focus on specific high-priority threat vectors.
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

  // Tokenize logical OR / AND / NOT
  // For quick boolean parsing, evaluate sub-clauses
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

    if (subMatch) return true; // Satisfies OR clause
  }

  return false;
}

interface PacketFilterPanelProps {
  rules: BpfFilterRule[];
  onAddRule: (rule: Omit<BpfFilterRule, "id" | "createdAt" | "matchedCount">) => void;
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
  onResetRules: () => void;
}

export const PacketFilterPanel: React.FC<PacketFilterPanelProps> = ({
  rules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  onResetRules,
}) => {
  const [newExpr, setNewExpr] = useState("");
  const [newName, setNewName] = useState("");
  const [newAction, setNewAction] = useState<"FOCUS" | "IGNORE">("FOCUS");
  const [newDesc, setNewDesc] = useState("");
  const [bpfSyntaxError, setBpfSyntaxError] = useState<string | null>(null);

  // Validate BPF expression
  const validateBpf = (expr: string) => {
    if (!expr.trim()) {
      setBpfSyntaxError(null);
      return false;
    }
    // Check basic keywords
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

  return (
    <div className="space-y-6 font-mono select-none">
      {/* Top Banner */}
      <div className="border border-blue-500/20 bg-[#0a0f1d] p-5 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#14f7ff]/10 border border-[#14f7ff]/30 text-[#14f7ff]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
                Berkeley Packet Filter (BPF) Control Engine
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Define high-performance BPF bytecode instructions to focus honeypot inspection on zero-days or suppress scanner noise.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetRules}
            className="py-1.5 px-3 rounded-lg border border-white/10 bg-[#060a13] text-slate-300 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore BPF Presets
          </button>
        </div>
      </div>

      {/* Main Grid: Create BPF Form (5 cols) & Active Rule List (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                  Syntax syntax examples: <code className="text-slate-300">tcp dst port 2323</code>, <code className="text-slate-300">not src host 198.51.100.42</code>, <code className="text-slate-300">tcp flags syn</code>
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
              <p className="text-[9.5px] text-slate-400 mt-1.5">
                {newAction === "FOCUS"
                  ? "FOCUS Mode: Only passes matching packets for deep packet inspection and logging."
                  : "IGNORE Mode: Suppresses and drops matching noisy scanner traffic."}
              </p>
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
            <span className="text-[10px] text-slate-400 font-mono">
              Evaluated on Promiscuous Network Socket
            </span>
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

                    {/* Actions & Toggle */}
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
    </div>
  );
};
