/**
 * Real-Time Geographic Threat Heatmap Component for Aegis Honeypot Subsystem
 * Uses an SVG world map projection with coordinate translation, animated Bezier attack arcs,
 * threat intensity hotspots, and country leaderboard rankings.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  Flame,
  ShieldAlert,
  Radio,
  Crosshair,
  Zap,
  Maximize2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { HoneypotLogEntry } from "../types";

export interface GeoThreatPoint {
  id: string;
  country: string;
  countryCode: string;
  region: string;
  lat: number;
  lon: number;
  ip: string;
  activeAttacks: number;
  severity: "INFO" | "WARN" | "CRITICAL";
  primaryVector: string;
  targetPort: number;
  lastSeen: string;
  isp: string;
}

export const INITIAL_GEO_THREATS: GeoThreatPoint[] = [
  {
    id: "geo_ru",
    country: "Russian Federation",
    countryCode: "RU",
    region: "Eastern Europe (Moscow)",
    lat: 55.7558,
    lon: 37.6173,
    ip: "185.220.101.5",
    activeAttacks: 142,
    severity: "CRITICAL",
    primaryVector: "SSH Hydra Brute-Force",
    targetPort: 2222,
    lastSeen: "Just now",
    isp: "AS48092 Tor Exit Relay",
  },
  {
    id: "geo_cn",
    country: "China",
    countryCode: "CN",
    region: "East Asia (Shanghai)",
    lat: 31.2304,
    lon: 121.4737,
    ip: "194.26.29.112",
    activeAttacks: 98,
    severity: "CRITICAL",
    primaryVector: "Telnet Mirai Botnet Probe",
    targetPort: 2323,
    lastSeen: "2s ago",
    isp: "AS4134 CHINANET Backbone",
  },
  {
    id: "geo_us",
    country: "United States",
    countryCode: "US",
    region: "North America (San Francisco)",
    lat: 37.7749,
    lon: -122.4194,
    ip: "45.154.255.88",
    activeAttacks: 64,
    severity: "WARN",
    primaryVector: "Web Honeytoken /.env Exfil",
    targetPort: 80,
    lastSeen: "5s ago",
    isp: "AS14061 DigitalOcean LLC",
  },
  {
    id: "geo_de",
    country: "Germany",
    countryCode: "DE",
    region: "Western Europe (Frankfurt)",
    lat: 50.1109,
    lon: 8.6821,
    ip: "89.248.165.77",
    activeAttacks: 45,
    severity: "WARN",
    primaryVector: "Masscan SYN Port Sweep",
    targetPort: 2222,
    lastSeen: "12s ago",
    isp: "AS24940 Hetzner Online GmbH",
  },
  {
    id: "geo_ir",
    country: "Iran",
    countryCode: "IR",
    region: "Middle East (Tehran)",
    lat: 35.6892,
    lon: 51.3890,
    ip: "193.142.146.33",
    activeAttacks: 38,
    severity: "CRITICAL",
    primaryVector: "SatCom Teleport Uplink Spoof",
    targetPort: 2323,
    lastSeen: "18s ago",
    isp: "AS12880 TIC Telecommunication",
  },
  {
    id: "geo_br",
    country: "Brazil",
    countryCode: "BR",
    region: "South America (Sao Paulo)",
    lat: -23.5505,
    lon: -46.6333,
    ip: "177.12.89.45",
    activeAttacks: 27,
    severity: "INFO",
    primaryVector: "HTTP Admin Crawler",
    targetPort: 3000,
    lastSeen: "30s ago",
    isp: "AS28573 CLARO S.A.",
  },
];

// Target Gateway Coordinates (Ottawa Defense Sector)
const TARGET_DEFENSE_GATEWAY = {
  name: "Aegis Gateway (10.0.8.1)",
  lat: 45.3401,
  lon: -75.6312,
};

// Coordinate Translation: Lat/Lon to SVG (W=900, H=450)
function latLonToSvg(lat: number, lon: number, width = 900, height = 450) {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x: Math.max(10, Math.min(width - 10, x)), y: Math.max(10, Math.min(height - 10, y)) };
}

interface GeographicThreatHeatmapProps {
  logs?: HoneypotLogEntry[];
  onFirewallBlock?: (ip: string, reason: string) => void;
}

export const GeographicThreatHeatmap: React.FC<GeographicThreatHeatmapProps> = ({
  logs = [],
  onFirewallBlock,
}) => {
  const [geoPoints, setGeoPoints] = useState<GeoThreatPoint[]>(INITIAL_GEO_THREATS);
  const [selectedGeoId, setSelectedGeoId] = useState<string | null>("geo_ru");
  const [hoveredGeoId, setHoveredGeoId] = useState<string | null>(null);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);

  // Target SVG Coordinates
  const targetSvg = useMemo(() => {
    return latLonToSvg(TARGET_DEFENSE_GATEWAY.lat, TARGET_DEFENSE_GATEWAY.lon);
  }, []);

  // Update attack counts from live honeypot logs
  useEffect(() => {
    if (logs.length === 0) return;

    setGeoPoints(prev => {
      return prev.map(pt => {
        const matchingLogs = logs.filter(l => l.sourceIp === pt.ip);
        if (matchingLogs.length > 0) {
          return {
            ...pt,
            activeAttacks: pt.activeAttacks + matchingLogs.length,
            lastSeen: "Just now",
          };
        }
        return pt;
      });
    });
  }, [logs]);

  // Selected Threat Point
  const selectedPoint = useMemo(() => {
    return geoPoints.find(p => p.id === selectedGeoId) || geoPoints[0];
  }, [geoPoints, selectedGeoId]);

  return (
    <div className="space-y-6 font-mono select-none">
      {/* Header Banner */}
      <div className="border border-blue-500/20 bg-[#0a0f1d] p-5 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#14f7ff]/10 border border-[#14f7ff]/30 text-[#14f7ff]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
                Geographic Threat Intelligence Heatmap
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time SVG telemetry map projecting origin coordinates and attack vectors of honeypot connection attempts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-[#040810] border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300">Live Satellite Feed: <b className="text-emerald-400">SYNCED</b></span>
          </div>
        </div>
      </div>

      {/* SVG WORLD MAP DISPLAY (MAIN PANEL) */}
      <div className="border border-blue-500/20 bg-[#040714] rounded-xl p-4 shadow-2xl relative overflow-hidden">
        {/* Map Header HUD */}
        <div className="flex justify-between items-center mb-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#14f7ff]" />
            <span className="text-white font-bold uppercase">Promiscuous Honeynet Arc Projection</span>
          </div>
          <div className="flex items-center gap-4 text-[10.5px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Critical Threat Origin
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Elevated Recon
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#14f7ff]" />
              Aegis Defense Gateway
            </span>
          </div>
        </div>

        {/* SVG CANVAS WORLD MAP */}
        <div className="w-full h-80 sm:h-96 bg-[#02050f] rounded-lg border border-white/10 relative overflow-hidden flex items-center justify-center">
          <svg
            viewBox="0 0 900 450"
            className="w-full h-full object-contain"
          >
            <defs>
              {/* Radial Glow Filters */}
              <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="amberGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="cyanGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#14f7ff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#14f7ff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Grid Coordinates Lines */}
            <g stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3">
              <line x1="0" y1="225" x2="900" y2="225" /> {/* Equator */}
              <line x1="450" y1="0" x2="450" y2="450" /> {/* Prime Meridian */}
              <circle cx="450" cy="225" r="180" opacity="0.15" fill="none" stroke="#14f7ff" />
              <circle cx="450" cy="225" r="320" opacity="0.1" fill="none" stroke="#14f7ff" />
            </g>

            {/* SVG WORLD MAP CONTINENT PATH OUTLINES */}
            <g fill="#0b1329" stroke="#1e3a8a" strokeWidth="1" opacity="0.85">
              {/* North America */}
              <path d="M 120 80 L 260 70 L 290 150 L 220 220 L 160 180 L 100 130 Z" />
              {/* South America */}
              <path d="M 230 230 L 290 230 L 320 340 L 270 410 L 220 310 Z" />
              {/* Europe */}
              <path d="M 430 70 L 520 70 L 540 140 L 460 150 L 420 110 Z" />
              {/* Africa */}
              <path d="M 420 160 L 540 160 L 560 300 L 480 370 L 420 260 Z" />
              {/* Asia */}
              <path d="M 530 60 L 780 50 L 820 180 L 680 230 L 550 150 Z" />
              {/* Australia */}
              <path d="M 700 280 L 820 280 L 800 370 L 710 360 Z" />
            </g>

            {/* ANIMATED BEZIER ATTACK ARCS (Origin -> Aegis Gateway) */}
            {geoPoints.map(pt => {
              const srcSvg = latLonToSvg(pt.lat, pt.lon);
              const controlX = (srcSvg.x + targetSvg.x) / 2;
              const controlY = Math.min(srcSvg.y, targetSvg.y) - 40;
              const pathD = `M ${srcSvg.x} ${srcSvg.y} Q ${controlX} ${controlY} ${targetSvg.x} ${targetSvg.y}`;

              const isSelected = selectedGeoId === pt.id;
              const isHovered = hoveredGeoId === pt.id;

              return (
                <g key={`arc_${pt.id}`}>
                  {/* Arc trajectory line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={pt.severity === "CRITICAL" ? "#ef4444" : "#f59e0b"}
                    strokeWidth={isSelected || isHovered ? "2.5" : "1.2"}
                    strokeDasharray="6 4"
                    opacity={isSelected || isHovered ? 0.95 : 0.45}
                    className="animate-pulse"
                  />
                </g>
              );
            })}

            {/* AEGIS DEFENSE GATEWAY NODE (TARGET) */}
            <g transform={`translate(${targetSvg.x}, ${targetSvg.y})`}>
              <circle r="18" fill="url(#cyanGlow)" className="animate-ping" opacity="0.6" />
              <circle r="8" fill="#14f7ff" stroke="#ffffff" strokeWidth="2" />
              <text x="12" y="4" fill="#14f7ff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                Aegis Gateway
              </text>
            </g>

            {/* THREAT ORIGIN HOTSPOT NODES */}
            {geoPoints.map(pt => {
              const pos = latLonToSvg(pt.lat, pt.lon);
              const isSelected = selectedGeoId === pt.id;
              const isHovered = hoveredGeoId === pt.id;
              const nodeColor = pt.severity === "CRITICAL" ? "#ef4444" : "#f59e0b";

              return (
                <g
                  key={`node_${pt.id}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedGeoId(pt.id)}
                  onMouseEnter={() => setHoveredGeoId(pt.id)}
                  onMouseLeave={() => setHoveredGeoId(null)}
                >
                  {/* Outer pulse */}
                  <circle
                    r={isSelected ? "22" : "14"}
                    fill={pt.severity === "CRITICAL" ? "url(#redGlow)" : "url(#amberGlow)"}
                    className="animate-ping"
                    opacity="0.7"
                  />
                  {/* Center pin */}
                  <circle
                    r={isSelected ? "7" : "5"}
                    fill={nodeColor}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? "2" : "1"}
                  />
                  <text
                    x="10"
                    y="3"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    opacity={isSelected || isHovered ? 1 : 0.7}
                  >
                    {pt.countryCode} ({pt.activeAttacks})
                  </text>
                </g>
              );
            })}
          </svg>

          {/* HOVER / SELECTION FLOATING MAP OVERLAY TOOLTIP */}
          {selectedPoint && (
            <div className="absolute bottom-3 left-3 bg-[#060a13]/90 border border-[#14f7ff]/40 p-3 rounded-lg shadow-2xl backdrop-blur-md max-w-xs font-mono text-xs text-white animate-fade-in z-20">
              <div className="flex justify-between items-start mb-1.5 border-b border-white/10 pb-1.5">
                <div>
                  <h4 className="font-bold text-[#14f7ff] uppercase">{selectedPoint.country}</h4>
                  <p className="text-[10px] text-slate-400">{selectedPoint.region}</p>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  selectedPoint.severity === "CRITICAL"
                    ? "bg-red-950 text-red-400 border border-red-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}>
                  {selectedPoint.severity}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-slate-300">
                <p>IP Address: <b className="text-white">{selectedPoint.ip}</b></p>
                <p>Primary Vector: <b className="text-amber-300">{selectedPoint.primaryVector}</b></p>
                <p>Target Port: <b className="text-[#14f7ff]">:{selectedPoint.targetPort}</b></p>
                <p>ISP: <span className="text-slate-400">{selectedPoint.isp}</span></p>
                <p>Total Intercepts: <b className="text-red-400">{selectedPoint.activeAttacks} Probes</b></p>
              </div>

              {onFirewallBlock && (
                <button
                  onClick={() => onFirewallBlock(selectedPoint.ip, `Geographic Threat Intelligence: ${selectedPoint.primaryVector}`)}
                  className="w-full mt-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-[10.5px] uppercase rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Block IP {selectedPoint.ip}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* REGIONAL THREAT LEADERBOARD TABLE */}
      <div className="border border-blue-500/20 bg-[#060a13] rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
              Geographic Attack Origin Leaderboard ({geoPoints.length} Regions)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Sorted by Active Probe Volume
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-lg bg-[#02050f] text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#070b1a] text-slate-400 text-[10px] uppercase">
                <th className="p-3">Origin Region / Country</th>
                <th className="p-3">Source IP</th>
                <th className="p-3">Primary Attack Vector</th>
                <th className="p-3">Target Port</th>
                <th className="p-3">Total Probes</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px] font-mono">
              {geoPoints.map(pt => (
                <tr
                  key={pt.id}
                  onClick={() => setSelectedGeoId(pt.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedGeoId === pt.id ? "bg-[#14f7ff]/15 font-bold" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <td className="p-3">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      {pt.country} ({pt.countryCode})
                    </div>
                    <span className="text-[9.5px] text-slate-400">{pt.region}</span>
                  </td>

                  <td className="p-3 text-[#14f7ff] font-semibold">{pt.ip}</td>
                  <td className="p-3 text-amber-300">{pt.primaryVector}</td>
                  <td className="p-3 text-slate-200">:{pt.targetPort}</td>
                  <td className="p-3 font-bold text-red-400">{pt.activeAttacks}</td>

                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                      pt.severity === "CRITICAL"
                        ? "bg-red-950 text-red-400 border border-red-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}>
                      {pt.severity}
                    </span>
                  </td>

                  <td className="p-3">
                    {onFirewallBlock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFirewallBlock(pt.ip, `Geographic Threat Leaderboard: ${pt.primaryVector}`);
                        }}
                        className="py-1 px-2.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Block
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
