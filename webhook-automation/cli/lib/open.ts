/**
 * Cross-platform "open a URL/file in the default browser" — same pattern
 * already used by scripts/open-dashboard.ts, duplicated here (not imported)
 * since that script is existing, untouched test-flow code, not a shared
 * library today. Never throws — opening a browser is a convenience, not
 * something that should ever fail a run.
 */
import { exec } from 'child_process';

export function openUrl(url: string): void {
  const command = process.platform === 'darwin' ? `open "${url}"` : process.platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;

  exec(command, (err) => {
    if (err) {
      console.warn(`Could not auto-open (${err.message}) — open manually: ${url}`);
    }
  });
}
