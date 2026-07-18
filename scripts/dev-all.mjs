import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npmCli =
  process.env.npm_execpath ||
  join(
    dirname(process.execPath),
    '..',
    'lib',
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js'
  );
const children = new Map();
let shuttingDown = false;

function start(name, args) {
  const child = spawn(process.execPath, [npmCli, ...args], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  children.set(name, child);
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
        process.stdout.write(`[${name}] ${line}\n`);
      }
    });
  }
  child.once('error', (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(name);
    if (!shuttingDown) {
      console.error(
        `[${name}] exited unexpectedly code=${code ?? 'null'} signal=${signal ?? 'none'}`
      );
      shutdown(code || 1);
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) terminate(child, 'SIGTERM');
  setTimeout(() => {
    for (const child of children.values())
      if (!child.killed) terminate(child, 'SIGKILL');
    process.exit(code);
  }, 500);
}

function terminate(child, signal) {
  if (process.platform !== 'win32' && child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // The process may have already exited before its group is signalled.
    }
  }
  child.kill(signal);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
start('WEB', ['run', 'dev:web']);
start('BACKEND', ['--prefix', 'backend', 'run', 'dev']);
