const { spawn } = require('node:child_process');
const path = require('node:path');

// Compresión intermedia: el portable pesa menos sin tardar como el nivel máximo.
const build = spawn(process.execPath, [require.resolve('electron-builder/cli.js'), '--win', 'portable'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, ELECTRON_BUILDER_COMPRESSION_LEVEL: '3' },
  stdio: 'inherit',
  windowsHide: true,
});
build.on('error', error => { console.error(error); process.exitCode = 1; });
build.on('exit', code => { process.exitCode = code ?? 1; });
