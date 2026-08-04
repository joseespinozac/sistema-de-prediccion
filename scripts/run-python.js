#!/usr/bin/env node
// Helper para `npm run dev:python`: invoca uvicorn con el Python del venv
// (prediction-service/.venv/) en lugar del Python del sistema. Sin esto,
// npm invoca `python -m uvicorn` con el Python global que no tiene uvicorn.
//
// Falla con mensaje claro si el venv no existe.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const isWin = process.platform === 'win32';
const venvBin = isWin
  ? 'prediction-service/.venv/Scripts/python.exe'
  : 'prediction-service/.venv/bin/python';

if (!existsSync(venvBin)) {
  console.error(`FATAL: venv no encontrado en ${venvBin}`);
  console.error('Crealo con:');
  console.error('  cd prediction-service');
  console.error('  python -m venv .venv');
  console.error(
    isWin
      ? '  .venv\\Scripts\\Activate.ps1'
      : '  source .venv/bin/activate',
  );
  console.error('  pip install -r requirements.txt');
  process.exit(1);
}

const args = [
  '-m', 'uvicorn', 'main:app',
  '--app-dir', 'prediction-service',
  '--host', '127.0.0.1',
  '--port', '8000',
  '--reload',
];

const child = spawn(venvBin, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
