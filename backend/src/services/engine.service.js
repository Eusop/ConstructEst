import { spawn } from 'node:child_process';
import path from 'node:path';
import { HttpError } from '../middleware/errorHandler.js';

const ENGINE_SCRIPT = path.resolve('engine/engine.py');

/**
 * Runs the Python engine as a subprocess, writes the request as JSON to
 * stdin and reads one JSON object back from stdout.
 *
 * @param {{ dxfPath: string, storeys: number, includeRoofing: boolean,
 *   constants: object, overrides?: object }} request
 * @returns {Promise<{ measurements: object, materials: object[] }>}
 */
export function runDxfEngine(request) {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN || 'python';
    const child = spawn(pythonBin, [ENGINE_SCRIPT], { cwd: path.resolve('engine') });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', (err) => {
      reject(new HttpError(500, `Could not start the estimation engine (${pythonBin}): ${err.message}`));
    });

    child.on('close', () => {
      let parsed;
      try {
        parsed = JSON.parse(stdout.trim().split('\n').pop());
      } catch {
        reject(new HttpError(500, `Estimation engine returned invalid output.${stderr ? ` ${stderr}` : ''}`));
        return;
      }

      if (parsed.error) {
        reject(new HttpError(422, parsed.error));
        return;
      }

      resolve(parsed);
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}
