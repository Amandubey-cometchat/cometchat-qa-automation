/**
 * Per-run file logging for the CLI orchestration layer only — separate from
 * src/utils/logger.ts, which is the console logger used inside specs and
 * stays untouched. Tees CLI/test-run output to logs/<date>-<env>.log,
 * redacting any secret values found in process.env so a shared log file is
 * safe to paste into a bug report or CI artifact.
 */
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.join(__dirname, '..', '..');
const LOGS_DIR = path.join(REPO_ROOT, 'logs');

const SECRET_ENV_VARS = ['COMETCHAT_REST_API_KEY', 'WEBHOOK_BASIC_AUTH_PASS', 'COMETCHAT_MGMT_KEY', 'COMETCHAT_MGMT_SECRET'];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function collectSecrets(): string[] {
  return SECRET_ENV_VARS.map((key) => process.env[key]).filter((value): value is string => !!value && value.length >= 4);
}

/** Exported separately so callers (e.g. a --dry-run check) can verify masking without writing a file. */
export function maskSecrets(text: string, secrets: string[] = collectSecrets()): string {
  let out = text;
  for (const secret of secrets) {
    out = out.split(secret).join('***REDACTED***');
  }
  return out;
}

export interface RunLogger {
  filePath: string;
  write(chunk: string): void;
  close(): void;
}

export function createRunLogger(envName: string): RunLogger {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const filePath = path.join(LOGS_DIR, `${today()}-${envName}.log`);
  const fd = fs.openSync(filePath, 'a');
  const secrets = collectSecrets();
  let closed = false;

  fs.writeSync(fd, `\n----- run started ${new Date().toISOString()} -----\n`);

  return {
    filePath,
    write(chunk: string) {
      if (closed) return;
      fs.writeSync(fd, maskSecrets(chunk, secrets));
    },
    close() {
      if (closed) return;
      closed = true;
      fs.closeSync(fd);
    },
  };
}
