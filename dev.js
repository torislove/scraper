const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function start(name, cwd, args) {
  const child = spawn(npmCmd, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped with signal ${signal}`);
    } else if (code !== 0) {
      console.log(`[${name}] exited with code ${code}`);
    }
  });

  return child;
}

const children = [
  start('server', path.join(root, 'server'), ['start']),
  start('client', path.join(root, 'client'), ['run', 'dev'])
];

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
