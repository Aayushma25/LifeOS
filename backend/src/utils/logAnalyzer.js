// Lightweight, dependency-free log parser for common defensive-security use cases:
// failed-login detection, brute-force flagging, and basic event statistics.
// Supports Linux auth logs and Apache/Nginx-style access logs, with a generic
// fallback for anything else (Windows Event Log exports are typically binary/XML,
// so the generic path covers any text export a user pastes in).

const IP_REGEX = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;
const BRUTE_FORCE_THRESHOLD = 5;
const SUSPICIOUS_THRESHOLD = 2;

function detectLogType(content) {
  if (/sshd|authentication failure|Failed password|Accepted password/i.test(content)) return "LINUX_AUTH";
  if (/"\w+ \S+ HTTP\/\d/.test(content)) return "WEB_ACCESS";
  return "GENERIC";
}

function analyzeLinuxAuth(lines) {
  const ipStats = new Map();
  const sampleEvents = [];
  let failedEvents = 0;
  let totalEvents = 0;

  for (const line of lines) {
    const failedMatch = line.match(/Failed password for (?:invalid user )?(\S+) from (\d{1,3}(?:\.\d{1,3}){3})/i);
    const acceptedMatch = line.match(/Accepted password for (\S+) from (\d{1,3}(?:\.\d{1,3}){3})/i);
    const invalidUserMatch = !failedMatch && line.match(/Invalid user (\S+) from (\d{1,3}(?:\.\d{1,3}){3})/i);

    if (failedMatch || invalidUserMatch) {
      totalEvents++;
      failedEvents++;
      const ip = (failedMatch || invalidUserMatch)[2];
      const stat = ipStats.get(ip) || { ip, total: 0, failed: 0, successful: 0 };
      stat.total++;
      stat.failed++;
      ipStats.set(ip, stat);
      if (sampleEvents.length < 50) sampleEvents.push(line.trim());
    } else if (acceptedMatch) {
      totalEvents++;
      const ip = acceptedMatch[2];
      const stat = ipStats.get(ip) || { ip, total: 0, failed: 0, successful: 0 };
      stat.total++;
      stat.successful++;
      ipStats.set(ip, stat);
    }
  }

  return { ipStats, failedEvents, totalEvents, sampleEvents };
}

function analyzeWebAccess(lines) {
  const ipStats = new Map();
  const sampleEvents = [];
  let failedEvents = 0;
  let totalEvents = 0;

  const lineRegex = /^(\d{1,3}(?:\.\d{1,3}){3}).*?"(\S+) (\S+)[^"]*" (\d{3})/;

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) continue;
    const [, ip, , , statusStr] = match;
    const status = Number(statusStr);
    totalEvents++;

    const stat = ipStats.get(ip) || { ip, total: 0, failed: 0, successful: 0 };
    stat.total++;
    if (status >= 400) {
      stat.failed++;
      failedEvents++;
      if (sampleEvents.length < 50) sampleEvents.push(line.trim());
    } else {
      stat.successful++;
    }
    ipStats.set(ip, stat);
  }

  return { ipStats, failedEvents, totalEvents, sampleEvents };
}

function analyzeGeneric(lines) {
  const ipStats = new Map();
  const sampleEvents = [];
  let failedEvents = 0;
  let totalEvents = 0;

  const failureKeywords = /fail|denied|unauthorized|error|invalid|reject/i;

  for (const line of lines) {
    const ipMatch = line.match(IP_REGEX);
    if (!ipMatch) continue;
    const ip = ipMatch[0];
    totalEvents++;

    const stat = ipStats.get(ip) || { ip, total: 0, failed: 0, successful: 0 };
    stat.total++;
    if (failureKeywords.test(line)) {
      stat.failed++;
      failedEvents++;
      if (sampleEvents.length < 50) sampleEvents.push(line.trim());
    } else {
      stat.successful++;
    }
    ipStats.set(ip, stat);
  }

  return { ipStats, failedEvents, totalEvents, sampleEvents };
}

function analyzeLog(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const logType = detectLogType(content);

  const { ipStats, failedEvents, totalEvents, sampleEvents } =
    logType === "LINUX_AUTH" ? analyzeLinuxAuth(lines) : logType === "WEB_ACCESS" ? analyzeWebAccess(lines) : analyzeGeneric(lines);

  const ipBreakdown = Array.from(ipStats.values())
    .map((s) => ({
      ...s,
      flag: s.failed >= BRUTE_FORCE_THRESHOLD ? "BRUTE_FORCE" : s.failed >= SUSPICIOUS_THRESHOLD ? "SUSPICIOUS" : "NORMAL",
    }))
    .sort((a, b) => b.failed - a.failed);

  return {
    logType,
    totalLines: lines.length,
    totalEvents,
    failedEvents,
    uniqueIps: ipBreakdown.length,
    ipBreakdown: ipBreakdown.slice(0, 100),
    sampleEvents,
  };
}

module.exports = { analyzeLog, BRUTE_FORCE_THRESHOLD, SUSPICIOUS_THRESHOLD };
