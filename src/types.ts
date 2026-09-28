/**
 * Aegis Cyber Suite Type Declarations
 */

export interface AlgorithmInfo {
  id: string;
  name: string;
  type: "KEM" | "Signature" | "Symmetric";
  description: string;
  nistLevel: number;
  pubKeySize: string;
  privKeySize: string;
  estimatedStrength: string;
}

export interface GeneratedKey {
  id: string;
  algorithmName: string;
  algorithmType: string;
  timestamp: string;
  publicKeyHex: string;
  privateKeyHex: string;
  keySizeBits: number;
  entropyBits: number;
  nistLevel: number;
  generationSpeedMs: number;
  estimatedLifetime: string;
  quantumCrackResistance: string; // e.g. "Extreme (> 2^128 operations)"
}

export type ThreatScenarioType = 
  | "ZERO_DAY"
  | "APT_INTRUSION"
  | "INSIDER_THREAT"
  | "QUANTUM_DECRYPTION"
  | "API_FUZZ_ATTACK";

export interface LogEntry {
  id: string;
  timestamp: string;
  component: string;
  message: string;
  level: "INFO" | "WARN" | "CRITICAL" | "SECURE" | "COUNTER";
  threatType?: "classical" | "quantum" | "system";
}

export interface AuditVulnerability {
  algorithm: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  threat: string;
  lineMatch: string;
  pqcReplacement: string;
  mitigationSteps: string;
  pqcReplacementCode?: string;
  isRemediated?: boolean;
}

export interface AuditResult {
  isVulnerable: boolean;
  overallRiskScore: number;
  remediationSummary: string;
  vulnerabilities: AuditVulnerability[];
}

export interface AuditHistoryEntry {
  id: string;
  timestamp: string;
  rawTimestamp: number;
  overallRiskScore: number;
  isVulnerable: boolean;
  snippetName: string;
  remediationsPerformed: string[];
  initialVulnerabilitiesCount: number;
  vulnerabilities: AuditVulnerability[];
}

export interface VulnerabilityTimelinePoint {
  id: string;
  timeOffset: string;
  timestamp: string;
  rawTimestamp: number;
  label: string;
  riskScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  totalVulnerabilities: number;
  remediatedCount: number;
  activeAlgorithms: string[];
  remediatedAlgorithms?: string[];
  status: "CRITICAL" | "HIGH" | "NOMINAL" | "REMEDIATED";
  phase: string;
  eventDescription: string;
}

export interface HoneypotLogEntry {
  id: string;
  timestamp: string;
  rawTimestamp: number;
  service: "SSH" | "TELNET" | "WEB" | "SATCOM";
  port: number;
  sourceIp: string;
  sourcePort?: number;
  action: string;
  payload?: string;
  credentials?: { username?: string; password?: string };
  command?: string;
  blocked: boolean;
  firewallRule?: string;
  severity: "INFO" | "WARN" | "CRITICAL";
}

export interface FirewallRule {
  id: string;
  ip: string;
  reason: string;
  firewallTool: "iptables" | "ufw" | "ip-route" | "kernel-socket";
  commandExecuted: string;
  executionStatus: "EXECUTED" | "CONTAINER_ENFORCED" | "ACTIVE";
  bannedAt: string;
  packetsDropped: number;
  active: boolean;
}

export interface HoneypotStatus {
  sshOnline: boolean;
  sshPort: number;
  telnetOnline: boolean;
  telnetPort: number;
  webTrapsOnline: boolean;
  totalConnectionsCaught: number;
  totalCredentialsHarvested: number;
  totalMaliciousCommands: number;
  bannedIpsCount: number;
  autoBlockEnabled: boolean;
}

