import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import psList from 'ps-list';
import pidusage from 'pidusage';

const CSV_FILE = './monitor_log.csv';
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const IMPORTANT_KEYWORDS = [
  'java', 'spring', 'boot', 'node', 'express',
  'mongodb', 'mongod', 'mysql', 'postgres', 'redis',
  'python', 'flask', 'django', 'gunicorn', 'nginx',
  'httpd', 'php-fpm'
];

if (!fs.existsSync(CSV_FILE)) {
  fs.writeFileSync(CSV_FILE, 'timestamp,port,pid,process,cpu_percent,memory_mb,threads,bandwidth_kbps\n');
} else {
  const firstLine = fs.readFileSync(CSV_FILE, 'utf8').split('\n')[0];
  if (!firstLine.includes('timestamp,port,pid')) {
    fs.writeFileSync(CSV_FILE, 'timestamp,port,pid,process,cpu_percent,memory_mb,threads,bandwidth_kbps\n');
  }
}

function getListeningPorts() {
  try {
    const output = execSync("ss -tulpn | grep LISTEN || true").toString();
    const map = {};
    output.split('\n').forEach(line => {
      const parts = line.trim().split(/\s+/);
      const localAddr = parts[4];
      const pidMatch = line.match(/pid=(\d+)/);
      if (localAddr && pidMatch) {
        const port = localAddr.split(':').pop();
        const pid = pidMatch[1];
        map[port] = pid;
      }
    });
    return map;
  } catch (e) {
    return {};
  }
}

function isImportantProcess(proc) {
  const cmd = (proc.cmd || '').toLowerCase();
  const name = (proc.name || '').toLowerCase();
  return IMPORTANT_KEYWORDS.some(keyword =>
    cmd.includes(keyword) || name.includes(keyword)
  );
}

async function logSystemStats() {
  const timestamp = new Date().toISOString();
  const portPidMap = getListeningPorts();
  const processes = await psList();

  const importantProcs = processes.filter(isImportantProcess);

  for (const proc of importantProcs) {
    const pid = proc.pid;
    try {
      const usage = await pidusage(pid);
      const port = Object.keys(portPidMap).find(key => portPidMap[key] == pid) || '';
      const row = [
        timestamp,
        port,
        pid,
        proc.name,
        usage.cpu.toFixed(2),
        (usage.memory / (1024 * 1024)).toFixed(2),
        proc.threads || 0,
        0 // Bandwidth placeholder
      ].join(',') + '\n';

      fs.appendFileSync(CSV_FILE, row);
    } catch (err) {
      // Process might have exited or permission denied
    }
  }

  console.log(`[${timestamp}] Logged ${importantProcs.length} important processes.`);
}

// Initial run
await logSystemStats();
setInterval(logSystemStats, INTERVAL_MS);