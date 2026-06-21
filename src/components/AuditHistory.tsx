import React, { useState } from "react";
import { 
  History, Calendar, Trash2, TrendingUp, Activity, CheckCircle2, AlertTriangle, Layers, ArrowLeftRight, Award
} from "lucide-react";
import { AuditHistoryEntry } from "../types";

interface AuditHistoryProps {
  history: AuditHistoryEntry[];
  onRemoveEntry: (id: string) => void;
  onClearAll: () => void;
  onRestoreCode: (code: string, snippetName: string) => void;
  onViewActiveScan: () => void;
}

export function AuditHistory({ 
  history, 
  onRemoveEntry, 
  onClearAll,
  onRestoreCode,
  onViewActiveScan 
}: AuditHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stats calculation
  const totalScans = history.length;
  
  const avgRiskScore = totalScans > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.overallRiskScore, 0) / totalScans) 
    : 0;

  const totalRemediationsCount = history.reduce((acc, curr) => acc + curr.remediationsPerformed.length, 0);

  // A scan is compliant if there are no vulnerability records OR if all vulnerabilities are marked as isRemediated.
  const fullyCompliantScans = history.filter(h => {
    if (h.vulnerabilities.length === 0) return true;
    return h.vulnerabilities.every(v => v.isRemediated);
  }).length;

  const complianceIndex = totalScans > 0 
    ? Math.round((fullyCompliantScans / totalScans) * 100) 
    : 0;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Custom SVG trend line chart
  const getTrendChart = () => {
    if (history.length < 2) {
      return (
        <div className="h-32 flex flex-col justify-center items-center text-center border border-white/5 bg-[#060a13] rounded-lg p-4 font-mono">
          <Activity className="w-5 h-5 text-white/20 mb-1" />
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Continuous Posture Analytics</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Need at least 2 compliance scans to generate a trend timeline.</p>
        </div>
      );
    }

    // Chronological sort: oldest to newest
    const chronHistory = [...history].sort((a, b) => a.rawTimestamp - b.rawTimestamp);
    
    const width = 500;
    const height = 140;
    const padding = 20;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxScore = 100;
    // Helper mappings
    const getX = (index: number) => padding + (index / (chronHistory.length - 1)) * chartW;
    const getY = (score: number) => padding + chartH - (score / maxScore) * chartH;

    let points = "";
    let fillPoints = `${padding},${height - padding} `;
    
    chronHistory.forEach((item, index) => {
      const x = getX(index);
      const y = getY(item.overallRiskScore);
      points += `${x},${y} `;
      fillPoints += `${x},${y} `;
    });
    fillPoints += `${getX(chronHistory.length - 1)},${height - padding}`;

    return (
      <div className="border border-[#14f7ff]/15 bg-[#060a13] rounded-xl p-4.5 space-y-2 select-none relative overflow-hidden">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#14f7ff]" />
            <h4 className="font-mono text-[10.5px] font-bold text-white uppercase tracking-wider">Historical Risk Exposure Line</h4>
          </div>
          <span className="font-mono text-[9px] text-slate-400">Post-Quantum Posture Progression</span>
        </div>

        <svg className="w-full h-28 text-[#14f7ff]" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14f7ff" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#14f7ff" stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          
          {/* Subtle boundary grids */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeDasharray="2 2" />
          <line x1={padding} y1={padding + chartH/2} x2={width - padding} y2={padding + chartH/2} stroke="rgba(255,255,255,0.03)" strokeDasharray="2 2" />
          <line x1={padding} y1={padding + chartH} x2={width - padding} y2={padding + chartH} stroke="rgba(255,255,255,0.08)" />

          {/* Area under curve fill */}
          <polygon points={fillPoints} fill="url(#trendGrad)" stroke="none" />

          {/* Connected trend path */}
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" />

          {/* Anchors/Dots */}
          {chronHistory.map((item, index) => {
            const x = getX(index);
            const y = getY(item.overallRiskScore);
            const isHigh = item.overallRiskScore > 70;
            const isSafe = item.overallRiskScore < 30;
            const pointColor = isHigh ? "#ef4444" : isSafe ? "#10b981" : "#f59e0b";
            return (
              <g key={item.id} className="group cursor-pointer">
                <circle 
                  cx={x} 
                  cy={y} 
                  r="5" 
                  fill={pointColor} 
                  stroke="#060a13" 
                  strokeWidth="2" 
                  className="transition-all hover:r-7"
                />
                <title>{`${item.snippetName}: ${item.overallRiskScore} Risk Score (${new Date(item.rawTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}</title>
              </g>
            );
          })}
        </svg>

        <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-500 pt-1.5 px-1 uppercase">
          <span>Oldest Compliance Audit</span>
          <span>Posture Trend</span>
          <span>Latest Action</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 leading-relaxed">
      
      {/* Top Stats and Posture chart Column */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* KPI metrics row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-white/5 bg-[#0e162d]/45 rounded-xl p-4 text-center select-none font-mono">
            <span className="block text-[9.5px] text-slate-400 uppercase tracking-widest leading-none mb-1">Total Audits</span>
            <span className="block text-3xl font-extrabold text-white">{totalScans}</span>
          </div>

          <div className="border border-white/5 bg-[#0e162d]/45 rounded-xl p-4 text-center select-none font-mono">
            <span className="block text-[9.5px] text-slate-400 uppercase tracking-widest leading-none mb-1">Mean Risk</span>
            <span className={`block text-3xl font-extrabold ${
              avgRiskScore > 75 ? "text-red-400" : avgRiskScore > 35 ? "text-amber-400" : "text-emerald-400"
            }`}>
              {avgRiskScore}%
            </span>
          </div>

          <div className="border border-white/5 bg-[#0e162d]/45 rounded-xl p-4 text-center select-none font-mono">
            <span className="block text-[9.5px] text-slate-400 uppercase tracking-widest leading-none mb-1">PQC Remedies</span>
            <span className="block text-3xl font-extrabold text-emerald-400">{totalRemediationsCount}</span>
          </div>

          <div className="border border-white/5 bg-[#0e162d]/45 rounded-xl p-4 text-center select-none font-mono">
            <span className="block text-[9.5px] text-slate-400 uppercase tracking-widest leading-none mb-1">Compliance</span>
            <span className="block text-3xl font-extrabold text-[#14f7ff]">{complianceIndex}%</span>
          </div>
        </div>

        {/* Dynamic Curve graph */}
        {getTrendChart()}

        {/* Audit Instructions */}
        <div className="border border-[#14f7ff]/10 bg-[#0a0f1d]/60 rounded-xl p-4 text-[11px] text-slate-400 font-mono space-y-2">
          <span className="block text-[10px] text-white uppercase font-bold tracking-wider">💡 How history logging works</span>
          <p className="leading-relaxed">
            Every sweep stores a local benchmark of your configuration block. Applying an automated remediation updates both your active codebase and heals these historical exposure logs.
          </p>
        </div>
      </div>

      {/* Main Ledger List Column */}
      <div className="lg:col-span-8 flex flex-col justify-between">
        
        <div className="border border-blue-500/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl backdrop-blur-md flex-1 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-[#14f7ff]" />
              <h3 className="font-mono text-sm font-semibold text-white uppercase tracking-wider">Scannings & Remediation Archives</h3>
            </div>
            {history.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[9.5px] uppercase font-mono tracking-wider font-bold text-red-400 hover:text-red-300 py-1 px-2.5 border border-red-500/10 hover:border-red-500/25 bg-red-950/15 rounded flex items-center gap-1 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Erase History
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-1">
            {history.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-8 border border-white/5 bg-[#060a13] rounded-xl my-4">
                <Layers className="w-10 h-10 text-white/5 mb-2.5 animate-spin" style={{ animationDuration: '24s' }} />
                <p className="font-mono text-xs text-white/30 uppercase tracking-widest font-semibold">Vault is Blank</p>
                <p className="text-[10.5px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                  No post-quantum audit files preserved. Run cryptanalysis sweeps on standard layouts or target segments to deploy data traces here.
                </p>
                <button
                  onClick={onViewActiveScan}
                  className="mt-4 px-4 py-1.5 border border-blue-500/30 hover:border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/15 rounded text-[10px] font-mono uppercase text-[#14f7ff] font-bold tracking-wider cursor-pointer"
                >
                  Configure Safe Auditor
                </button>
              </div>
            ) : (
              [...history].sort((a, b) => b.rawTimestamp - a.rawTimestamp).map((item) => {
                const isItemExpanded = expandedId === item.id;
                const activeIssues = item.vulnerabilities.filter(v => !v.isRemediated).length;
                const score = item.overallRiskScore;

                return (
                  <div 
                    key={item.id} 
                    className="border border-white/5 hover:border-white/10 rounded-lg bg-[#060a13] overflow-hidden transition-all duration-200"
                  >
                    
                    {/* Header bar of accordion */}
                    <div 
                      onClick={() => toggleExpand(item.id)}
                      className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <div className="font-mono space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-bold font-mono tracking-tight">{item.snippetName}</span>
                          <span className="text-[9.5px] text-slate-500 flex items-center gap-1 font-sans">
                            <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                            {item.timestamp}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 flex items-center gap-2">
                          <span>
                            Detected: <b className="text-white">{item.initialVulnerabilitiesCount} risks</b>
                          </span>
                          <span className="text-slate-600">•</span>
                          <span>
                            Remediations Applied: <b className="text-emerald-400 font-bold">{item.remediationsPerformed.length}</b>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        {/* Overall threat score badge */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-[#070c17] px-2.5 py-1 rounded border border-white/5 text-right font-mono">
                          <span className="text-[8.5px] text-slate-500 uppercase leading-none">Score</span>
                          <span className={`text-sm font-black leading-none ${
                            score > 70 ? "text-red-400" : score > 30 ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {score}%
                          </span>
                        </div>

                        {/* Status badge */}
                        {activeIssues === 0 ? (
                          <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 text-[8.5px] font-mono py-0.5 px-2 rounded uppercase font-bold tracking-wider shrink-0 leading-none">
                            ● Safe (PQC Compliant)
                          </span>
                        ) : (
                          <span className="bg-red-950/40 text-red-400 border border-red-800/40 text-[8.5px] font-mono py-0.5 px-2 rounded uppercase font-bold tracking-wider shrink-0 leading-none">
                            ○ Risk Intact
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detailed expandable section */}
                    {isItemExpanded && (
                      <div className="p-4 border-t border-white/5 bg-[#0a1020]/25 font-mono text-[10.5px] space-y-4 animate-fade-in text-slate-300">
                        
                        {/* Remediations log performed list */}
                        {item.remediationsPerformed.length > 0 && (
                          <div className="bg-emerald-950/10 border border-emerald-900/30 rounded p-3 space-y-1.5">
                            <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              REMEDIATION REGISTERED
                            </span>
                            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[10px]">
                              {item.remediationsPerformed.map((rem, idx) => (
                                <li key={idx} className="leading-snug text-emerald-200/90 font-mono">{rem}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Vulnerability Ledger for this scan */}
                        <div className="space-y-2">
                          <span className="text-[9.5px] text-[#14f7ff] uppercase tracking-wider font-extrabold block">Compliance Audit Ledger</span>
                          {item.vulnerabilities.length === 0 ? (
                            <div className="text-slate-500 italic text-[10px] pl-1">No vulnerabilities identified in this session.</div>
                          ) : (
                            <div className="divide-y divide-white/5">
                              {item.vulnerabilities.map((v, i) => (
                                <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-white uppercase text-[10.5px]">{v.algorithm}</span>
                                      {v.isRemediated ? (
                                        <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-900/60 text-[7.5px] font-bold py-0.5 px-1 rounded uppercase tracking-wider">
                                          remediated
                                        </span>
                                      ) : (
                                        <span className={`text-[7.5px] font-bold py-0.5 px-1 rounded uppercase tracking-wider border ${
                                          v.severity === "CRITICAL" 
                                            ? "bg-red-950 text-red-400 border-red-900/50" 
                                            : v.severity === "HIGH" 
                                            ? "bg-amber-950 text-amber-500 border-amber-900/50" 
                                            : "bg-slate-900 text-slate-400 border-slate-800"
                                        }`}>
                                          {v.severity} RISK
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-snug">{v.threat}</p>
                                    <div className="text-[9px] text-slate-500">
                                      Line Target: <code className="text-pink-400 text-[9.5px] select-all bg-[#040810] px-1 rounded font-mono">"{v.lineMatch}"</code>
                                    </div>
                                  </div>

                                  <div className="text-right whitespace-nowrap shrink-0">
                                    <span className="text-[7.5px] uppercase text-slate-500 block">NIST replacement</span>
                                    <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider block">{v.pqcReplacement}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Interactive actions for this record */}
                        <div className="pt-3 border-t border-white/5 flex flex-wrap gap-2 justify-end">
                          <button
                            onClick={() => onRestoreCode(item.vulnerabilities.length > 0 ? "class ClassicCryptoScheme {\n  // Loaded historic session code\n}" : "class SecureQuantumReady {\n  // Post-quantum verified\n}", item.snippetName)}
                            className="bg-blue-500/5 hover:bg-blue-500/10 text-[#14f7ff] hover:text-white py-1.5 px-3 rounded text-[9.5px] border border-blue-500/25 cursor-pointer flex items-center gap-1.5 transition-all uppercase"
                            title="Insert dummy simulation code block matching this scan profile into the Code Editor"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" /> Force Segment Template
                          </button>
                          
                          <button
                            onClick={() => onRemoveEntry(item.id)}
                            className="text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 py-1.5 px-3 rounded text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Discard Record
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
