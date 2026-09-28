import { spawn } from 'node:child_process';
import path from 'node:path';
import { HttpError } from '../middleware/errorHandler.js';

const ENGINE_SCRIPT = path.resolve('engine/engine.py');

// A normal floor plan parses in under a second, so a minute means something is
// stuck (a bad DXF, or `python` waiting on a prompt). Without a timeout a hung
// child kept the request open forever.
const ENGINE_TIMEOUT_MS = Number(process.env.ENGINE_TIMEOUT_MS) || 60_000;

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
    let settled = false;

    // The child can fail in more than one way at once (a timeout kill also
    // fires 'close'), so every path goes through these and the first wins.
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const failWith = (status, message) => finish(reject, new HttpError(status, message));

    const timer = setTimeout(() => {
      child.kill();
      failWith(504, 'The estimation engine took too long and was stopped. The DXF may be unusually large or complex.');
    }, ENGINE_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', (err) => {
      failWith(500, `Could not start the estimation engine (${pythonBin}): ${err.message}`);
    });
    // Without this, an EPIPE from a child that died at startup becomes an
    // unhandled stream error that crashes the server instead of one request.
    child.stdin.on('error', (err) => {
      failWith(500, `Could not send the request to the estimation engine: ${err.message}`);
    });

    child.on('close', (code) => {
      if (settled) return;

      let parsed;
      try {
        parsed = JSON.parse(stdout.trim().split('\n').pop());
      } catch {
        // engine.py always prints JSON, even on failure. Getting here means it
        // died first (killed, out of memory, crashed interpreter), so report the exit code.
        failWith(500, `Estimation engine returned invalid output (exit code ${code}).${stderr ? ` ${stderr}` : ''}`);
        return;
      }

      if (parsed && parsed.error) {
        failWith(422, parsed.error);
        return;
      }

      // Shape check: persistEstimation destructures measurements directly, so a
      // short response would fail later as an unrelated TypeError.
      if (!parsed || typeof parsed.measurements !== 'object' || !Array.isArray(parsed.materials)) {
        failWith(500, 'Estimation engine returned an unexpected response shape (expected measurements + materials).');
        return;
      }

      finish(resolve, parsed);
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}
