const os = require("os");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const RULE_PREFIX = "Wathiqa Office Server";
const DEFAULT_PROFILE = "Private";
const DEFAULT_REMOTE_ADDRESS = "LocalSubnet";

function getNetworkDiagnostics() {
  const adapters = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      adapters.push({ name, address: entry.address, netmask: entry.netmask || null, mac: entry.mac || null });
    }
  }
  return {
    hostname: os.hostname(),
    adapters,
    preferredAddress: adapters[0]?.address || "127.0.0.1",
  };
}

function runPowerShell(script, { elevated = false } = {}) {
  if (process.platform !== "win32") {
    return { supported: false, success: false, code: null, stdout: "", stderr: "Windows only" };
  }

  if (!elevated) {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], { encoding: "utf8", windowsHide: true });
    return { supported: true, success: result.status === 0, code: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
  }

  const tempDir = path.join(os.tmpdir(), "Wathiqa");
  fs.mkdirSync(tempDir, { recursive: true });
  const scriptPath = path.join(tempDir, `firewall-${process.pid}-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, script, "utf8");

  const escaped = scriptPath.replace(/'/g, "''");
  const elevation = spawnSync("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command",
    `$p = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','${escaped}'; exit $p.ExitCode`,
  ], { encoding: "utf8", windowsHide: true });

  try { fs.unlinkSync(scriptPath); } catch (_) {}
  return { supported: true, success: elevation.status === 0, code: elevation.status, stdout: elevation.stdout || "", stderr: elevation.stderr || "" };
}

function getRuleName(port) {
  return `${RULE_PREFIX} ${port}`;
}

function inspectFirewall(port) {
  if (process.platform !== "win32") {
    return { status: "unsupported", message: "Windows Firewall diagnostics are available only on Windows." };
  }

  const ruleName = getRuleName(port);
  const escaped = ruleName.replace(/'/g, "''");
  const script = `\n$ErrorActionPreference = 'Stop'\n$rule = Get-NetFirewallRule -DisplayName '${escaped}' -ErrorAction SilentlyContinue | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue\nif ($rule) {\n  $addresses = Get-NetFirewallRule -DisplayName '${escaped}' | Get-NetFirewallAddressFilter\n  [pscustomobject]@{ exists = $true; localPort = [string]$rule.LocalPort; protocol = [string]$rule.Protocol; remoteAddress = ($addresses.RemoteAddress -join ','); } | ConvertTo-Json -Compress\n} else {\n  [pscustomobject]@{ exists = $false } | ConvertTo-Json -Compress\n}\n`;
  const result = runPowerShell(script);
  if (!result.success) return { status: "unknown", message: "تعذر قراءة حالة Windows Firewall.", details: result.stderr.trim() };
  try {
    const payload = JSON.parse(result.stdout.trim());
    if (!payload.exists) return { status: "missing", ruleName, message: `لا توجد قاعدة Firewall لخادم وثيقة على المنفذ ${port}.` };
    return { status: "configured", ruleName, message: `قاعدة Firewall موجودة للمنفذ ${port}.`, details: payload };
  } catch (_) {
    return { status: "unknown", ruleName, message: "تعذر تحليل حالة Windows Firewall." };
  }
}

function configureFirewall(port) {
  if (process.platform !== "win32") {
    return { status: "unsupported", configured: false, message: "إعداد Windows Firewall متاح على Windows فقط." };
  }

  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
    throw new Error("Invalid firewall port");
  }

  const ruleName = getRuleName(numericPort);
  const escaped = ruleName.replace(/'/g, "''");
  const script = `\n$ErrorActionPreference = 'Stop'\nRemove-NetFirewallRule -DisplayName '${escaped}' -ErrorAction SilentlyContinue\nNew-NetFirewallRule -DisplayName '${escaped}' -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${numericPort} -Profile Private -RemoteAddress LocalSubnet -Description 'Wathiqa office LAN server access; private network and local subnet only.' | Out-Null\nexit 0\n`;
  const result = runPowerShell(script, { elevated: true });
  if (result.success) {
    return { status: "configured", configured: true, ruleName, port: numericPort, profile: DEFAULT_PROFILE, remoteAddress: DEFAULT_REMOTE_ADDRESS, message: `تم إعداد Windows Firewall للمنفذ ${numericPort} على شبكة المكتب الخاصة فقط.` };
  }

  const denied = /canceled|cancelled|0x800704c7|user/i.test(`${result.stderr} ${result.stdout}`);
  return {
    status: denied ? "not_configured" : "error",
    configured: false,
    ruleName,
    port: numericPort,
    message: denied ? "تم إلغاء صلاحية المسؤول، لذلك لم يتم تغيير Windows Firewall." : "تعذر إعداد Windows Firewall. يمكنك تشغيل الإعداد بصلاحيات المسؤول ثم المحاولة مرة أخرى.",
    details: result.stderr.trim() || result.stdout.trim(),
  };
}

function testPort(host, port, timeout = 2500) {
  if (process.platform !== "win32") return Promise.resolve({ status: "unsupported", reachable: false });
  return new Promise((resolve) => {
    const net = require("net");
    const socket = new net.Socket();
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(payload);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish({ status: "reachable", reachable: true, host, port }));
    socket.once("timeout", () => finish({ status: "timeout", reachable: false, host, port }));
    socket.once("error", (error) => finish({ status: "blocked_or_unavailable", reachable: false, host, port, error: error.code || error.message }));
    socket.connect(Number(port), host);
  });
}

module.exports = {
  getNetworkDiagnostics,
  inspectFirewall,
  configureFirewall,
  testPort,
};
