#!/usr/bin/env node
// Helper para `npm run dev:python`: invoca uvicorn con el Python del venv
// (prediction-service/.venv/) en lugar del Python del sistema. Sin esto,
// npm invoca `python -m uvicorn` con el Python global que no tiene uvicorn.
//
// Ademas, importa dotenv/config para cargar las variables del .env raiz
// (INTERNAL_TOKEN, etc.) en process.env antes del spawn, de modo que el
// child process de Python las herede y el servicio pueda validar el header
// X-Internal-Token. Variables ya seteadas en el entorno NO se sobreescriben.
//
// Falla con mensaje claro si el venv no existe.
import 'dotenv/config';
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

// env explicito = el child hereda process.env (incluye las vars que dotenv
// cargo desde .env). Sin esto, el child recibe solo el env del parent
// shell sin las vars del archivo.
const child = spawn(venvBin, args, { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 1));
