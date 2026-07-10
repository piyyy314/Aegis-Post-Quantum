import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { 
  Radio, Wifi, ShieldAlert, Zap, Server, Play, Trash2, Cpu, CheckCircle2, AlertTriangle, Blocks
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";

interface BlockUpdate {
  type: string;
  block: number;
  hash: string;
  txCount: number;
  timestamp: number;
}

interface SecurityAlert {
  type: string;
  message: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  timestamp: string;
}

// Custom Tooltip component styled with beautiful high-contrast dark style and neon borders
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a0f1d] border border-[#14f7ff]/25 p-3 rounded-lg shadow-2xl font-mono text-[10.5px] leading-relaxed">
        <p className="text-[#14f7ff] font-bold uppercase mb-1.5">{label}</p>
        <div className="space-y-1 text-slate-300">
          <p className="flex items-center justify-between gap-4">
            <span className="text-red-400 font-semibold flex items-center gap-1">🔴 Critical:</span>
            <span className="font-bold text-white">{payload[0]?.value || 0}</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-amber-400 font-semibold flex items-center gap-1">🟡 Warning:</span>
            <span className="font-bold text-white">{payload[1]?.value || 0}</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-cyan-400 font-semibold flex items-center gap-1">🔵 Info/System:</span>
            <span className="font-bold text-white">{payload[2]?.value || 0}</span>
          </p>
          <div className="border-t border-white/5 mt-1.5 pt-1 flex items-center justify-between gap-4 text-[9px] text-slate-500 uppercase">
            <span>Total Alerts:</span>
            <span className="font-bold text-slate-300">
              {(payload[0]?.value || 0) + (payload[1]?.value || 0) + (payload[2]?.value || 0)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function PalantirDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [blocks, setBlocks] = useState<BlockUpdate[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [status, setStatus] = useState({
    rpcUrl: "http://127.0.0.1:8545",
    isRealRPC: false,
    uptime: 0
  });

  const [historicalAlerts, setHistoricalAlerts] = useState<Array<{ time: Date; severity: "INFO" | "WARN" | "CRITICAL" }>>(() => {
    const now = new Date();
    const list: Array<{ time: Date; severity: "INFO" | "WARN" | "CRITICAL" }> = [];
    
    // Seed 25 realistic alert ticks over the last 60 minutes for high-tech dashboard presence on first load
    const severities: Array<"INFO" | "WARN" | "CRITICAL"> = ["INFO", "INFO", "WARN", "INFO", "CRITICAL", "INFO", "WARN", "INFO", "INFO", "WARN", "CRITICAL", "INFO", "WARN", "INFO", "INFO"];
    const minutesAgo = [58, 55, 52, 48, 45, 41, 38, 35, 32, 29, 25, 21, 18, 14, 11, 8, 4, 1];
    
    for (let i = 0; i < minutesAgo.length; i++) {
      list.push({
        time: new Date(now.getTime() - minutesAgo[i] * 60 * 1000),
        severity: severities[i % severities.length]
      });
    }
    return list;
  });

  // Ticker to force the graph display intervals to drift smoothly over time
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(t => t + 1);
      // Prune entries older than 60 minutes
      setHistoricalAlerts(prev => {
        const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000);
        return prev.filter(item => item.time >= sixtyMinAgo);
      });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const alertsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Establish connection to host Socket.IO server
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl);

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setConnected(true);
      const systemAlert: SecurityAlert = {
        type: "PALANTIR-DASH",
        message: "Secure connection established to Palantir Dashboard UI.",
        severity: "INFO",
        timestamp: new Date().toLocaleTimeString()
      };
      setAlerts(prev => [...prev, systemAlert]);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("status_update", (data: any) => {
      setStatus(data);
    });

    newSocket.on("telemetry_update", (data: BlockUpdate) => {
      setBlocks(prev => {
        // Prevent duplicate blocks
        if (prev.some(b => b.block === data.block)) return prev;
        const list = [data, ...prev];
        return list.slice(0, 8); // Keep last 8 blocks
      });
    });

    newSocket.on("security_alert", (data: any) => {
      const liveAlert: SecurityAlert = {
        type: data.type || "IDS_LOG",
        message: data.message,
        severity: data.severity || "INFO",
        timestamp: new Date().toLocaleTimeString()
      };
      setAlerts(prev => {
        const list = [...prev, liveAlert];
        return list.slice(-20); // Keep last 20 alerts
      });

      // Maintain our Recharts graph cache
      setHistoricalAlerts(prev => {
        const now = new Date();
        const sixtyMinAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const filtered = prev.filter(item => item.time >= sixtyMinAgo);
        return [...filtered, { time: now, severity: data.severity || "INFO" }];
      });
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (alertsContainerRef.current) {
      alertsContainerRef.current.scrollTop = alertsContainerRef.current.scrollHeight;
    }
  }, [alerts]);

  const handleMineBlock = () => {
    if (socket && connected) {
      socket.emit("mine_block");
    }
  };

  const handleTestDecryption = () => {
    if (socket && connected) {
      socket.emit("test_decryption", { packetCount: Math.floor(Math.random() * 25) + 12 });
    }
  };

  const clearConsole = () => {
    setAlerts([]);
    setBlocks([]);
    setHistoricalAlerts([]);
  };

  const formatHash = (hash: string) => {
    if (!hash) return "";
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  // Convert raw timestamp alerts into 12 distinct 5-minute binned intervals for a beautiful charts series
  const getChartData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const binStart = new Date(now.getTime() - (i + 1) * 5 * 60 * 1000);
      const binEnd = new Date(now.getTime() - i * 5 * 60 * 1000);
      
      const label = i === 0 ? "Now" : `${i * 5}m ago`;
      const binAlerts = historicalAlerts.filter(a => a.time >= binStart && a.time < binEnd);
      
      const infoCount = binAlerts.filter(a => a.severity === "INFO").length;
      const warnCount = binAlerts.filter(a => a.severity === "WARN").length;
      const critCount = binAlerts.filter(a => a.severity === "CRITICAL").length;
      
      data.push({
        timeLabel: label,
        Critical: critCount,
        Warning: warnCount,
        Info: infoCount,
      });
    }
    return data;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings / Controls Column */}
      <div className="lg:col-span-1 space-y-6">
        <div className="border border-[#14f7ff]/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <Radio className="w-5 h-5 text-[#14f7ff] animate-pulse" />
            <h3 className="font-mono text-base font-semibold text-white uppercase tracking-wider">Palantir Connection</h3>
          </div>

          <div className="space-y-4">
            {/* Connection Status Indicator */}
            <div className="bg-[#0e162d] rounded-lg p-3.5 border border-[#14f7ff]/5 flex justify-between items-center">
              <div>
                <span className="block text-xs font-mono text-[#14f7ff] uppercase tracking-wider">WebSocket Ingress</span>
                <span className="block text-[10px] text-white/50 font-mono">Real-time sync frame</span>
              </div>
              <span className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold tracking-wider border ${
                connected 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                  : "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
              }`}>
                {connected ? "● Connected" : "○ Offline"}
              </span>
            </div>

            {/* RPC Proxy Endpoint Status */}
            <div className="bg-[#0e162d] rounded-lg p-3.5 border border-[#14f7ff]/5 flex justify-between items-center">
              <div>
                <span className="block text-xs font-mono text-white uppercase tracking-wider">RPC Proxy Tunnel</span>
                <span className="block text-[10px] text-white/30 truncate max-w-[140px]">{status.rpcUrl}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${
                status.isRealRPC 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              }`}>
                {status.isRealRPC ? "Verified RPC" : "Shadow Bypass"}
              </span>
            </div>

            {/* Dynamic Controls / Actions */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-2">Simulated Interactive Feeds</label>
              
              <button
                onClick={handleMineBlock}
                disabled={!connected}
                className="w-full flex items-center justify-between p-3 bg-blue-500/5 hover:bg-blue-500/10 disabled:opacity-50 border border-blue-500/25 rounded-lg text-left transition-all group cursor-pointer"
              >
                <div className="font-mono text-xs">
                  <span className="block text-[#14f7ff] font-semibold tracking-wider group-hover:text-cyan-300">Mine Simulated Telemetry Block</span>
                  <span className="block text-[9.5px] text-white/40 mt-0.5">Encrypts ML-KEM block parameters</span>
                </div>
                <Play className="w-3.5 h-3.5 text-[#14f7ff] group-hover:translate-x-1 transition-all shrink-0" />
              </button>

              <button
                onClick={handleTestDecryption}
                disabled={!connected}
                className="w-full flex items-center justify-between p-3 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-50 border border-red-500/25 rounded-lg text-left transition-all group cursor-pointer"
              >
                <div className="font-mono text-xs">
                  <span className="block text-red-400 font-semibold tracking-wider group-hover:text-red-300">Trigger Decryption Intrusion</span>
                  <span className="block text-[9.5px] text-white/40 mt-0.5">Sends quantum intercept test packets</span>
                </div>
                <Play className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-1 transition-all shrink-0" />
              </button>

              <button
                onClick={clearConsole}
                className="w-full flex items-center justify-center gap-2 py-2 border border-white/10 hover:border-white/20 rounded bg-[#060a13] text-xs font-mono text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Flush Palantir Lists
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Block Matrix and Terminal Stream */}
      <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
        
        {/* Live Block Matrix Ledger */}
        <div className="border border-[#14f7ff]/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl backdrop-blur-md flex-1 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Blocks className="w-5 h-5 text-emerald-400" />
              <h3 className="font-mono text-sm font-semibold text-white uppercase tracking-wider">Palantir Secure Block Stream</h3>
            </div>
            <span className="font-mono text-[10.5px] text-[#14f7ff]/60 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}></span>
              Status: <b className="text-white">{connected ? "ACTIVE" : "STANDBY"}</b>
            </span>
          </div>

          <div className="flex-1 overflow-x-auto min-h-[160px]">
            {blocks.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 border border-white/5 bg-[#060a13] rounded-lg">
                <Cpu className="w-8 h-8 text-white/10 mb-2 animate-spin" style={{ animationDuration: '8s' }} />
                <p className="font-mono text-xs text-white/40 uppercase">Waiting for first post-quantum block parameters...</p>
                <p className="text-[10px] text-white/25 mt-1">Press "Mine Simulated Telemetry Block" to bypass waiting intervals.</p>
              </div>
            ) : (
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[#14f7ff]/70 text-[9px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Block Height</th>
                    <th className="py-2.5 px-3">Hybrid Signature Hash (RSA + Kyber)</th>
                    <th className="py-2.5 px-3 text-right">Transactions</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {blocks.map((b, i) => (
                    <tr key={b.block} className={`hover:bg-white/5 transition-colors ${i === 0 ? "bg-emerald-500/5 font-semibold text-white" : ""}`}>
                      <td className="py-2 px-3 text-emerald-400 font-bold">
                        #{b.block}
                        {i === 0 && <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[8px] py-0.5 px-1 rounded ml-1.5 uppercase font-bold text-center">latest</span>}
                      </td>
                      <td className="py-2 px-3 select-all cursor-copy font-mono text-xs text-[#14f7ff] tracking-tight">{formatHash(b.hash)}</td>
                      <td className="py-2 px-3 text-right text-white font-bold">{b.txCount} txs</td>
                      <td className="py-2 px-3 text-right text-slate-400">{new Date(b.timestamp * 1000).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Real-time Recharts Threat Exposure Graph */}
        <div className="border border-[#14f7ff]/20 bg-[#0a0f1d]/80 rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
              <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Palantir Threat Exposure Map (Last 60m)</h3>
            </div>
            <span className="font-mono text-[9px] text-[#14f7ff]/70 uppercase tracking-widest bg-[#14f7ff]/5 px-2.5 py-0.5 border border-[#14f7ff]/15 rounded">
              Active Security Trend Monitor
            </span>
          </div>

          <div className="w-full h-52 select-none min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorInfo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14f7ff" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#14f7ff" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="timeLabel" 
                  stroke="rgba(255,255,255,0.2)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8.5, fontFamily: 'monospace' }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8.5, fontFamily: 'monospace' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  iconType="circle"
                  wrapperStyle={{ 
                    fontFamily: 'monospace', 
                    fontSize: '9px', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em' 
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="Critical" 
                  stroke="#ef4444" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill="url(#colorCrit)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Warning" 
                  stroke="#f59e0b" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill="url(#colorWarn)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Info" 
                  name="Info/System"
                  stroke="#14f7ff" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill="url(#colorInfo)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WebSocket Telemetry Stream Log Term */}
        <div className="border border-[#14f7ff]/20 bg-[#060a13] rounded-xl p-5 overflow-hidden flex flex-col h-[280px]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#14f7ff]" />
              <span className="font-mono text-xs uppercase text-white font-bold tracking-wider">Palantir Telemetry WebSocket Console</span>
            </div>
          </div>

          <div ref={alertsContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-1.5 font-mono text-[11px] text-slate-300 select-text">
            {alerts.length === 0 ? (
              <div className="text-white/20 text-center py-6 text-xs uppercase">No active socket data packets caught yet.</div>
            ) : (
              alerts.map((alert, index) => {
                const colors = {
                  INFO: "text-[#14f7ff]/90",
                  WARN: "text-amber-400 font-semibold",
                  CRITICAL: "text-red-400 font-bold bg-red-500/10 px-1 rounded"
                };

                return (
                  <div key={index} className="flex items-start gap-2 hover:bg-white/5 p-0.5 rounded transition-all">
                    <span className="text-white/30 text-[9px] select-none shrink-0 border-r border-white/10 pr-2">[{alert.timestamp}]</span>
                    <span className={`text-[9.5px] font-bold ${colors[alert.severity] || "text-white"} tracking-tight min-w-[100px] shrink-0 uppercase`}>
                      ⚡ {alert.type}:
                    </span>
                    <span className="flex-1 text-[10.5px] leading-relaxed select-text">{alert.message}</span>
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
