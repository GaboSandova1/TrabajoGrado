const { execSync } = require('child_process');

const port = Number(process.argv[2] || 3000);

function getPidsFromNetstat(targetPort) {
  const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
  const lines = output.split(/\r?\n/);
  const pids = new Set();

  for (const line of lines) {
    const normalized = line.trim().replace(/\s+/g, ' ');
    if (!normalized.startsWith('TCP ')) {
      continue;
    }

    const parts = normalized.split(' ');
    if (parts.length < 5) {
      continue;
    }

    const localAddress = parts[1];
    const state = parts[3];
    const pid = Number(parts[4]);
    const localPort = Number(localAddress.split(':').pop());

    if (localPort === targetPort && state === 'LISTENING' && Number.isInteger(pid) && pid > 0) {
      pids.add(pid);
    }
  }

  return [...pids];
}

function stopPid(pid) {
  execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
}

try {
  const pids = getPidsFromNetstat(port);

  if (pids.length === 0) {
    console.log(`Port ${port} is already free.`);
    process.exit(0);
  }

  for (const pid of pids) {
    try {
      stopPid(pid);
      console.log(`Stopped PID ${pid} on port ${port}.`);
    } catch {
      console.log(`Could not stop PID ${pid}.`);
    }
  }

  process.exit(0);
} catch (error) {
  console.error('Failed to check or free port:', error.message);
  process.exit(1);
}
