/** Collects per-case evidence and writes results.json for the dashboard. */
import fs from 'node:fs';
import path from 'node:path';

export type CaseStatus = 'PASS' | 'FAIL' | 'NOT RUN';

export interface Check {
  label: string;
  pass: boolean;
  detail?: string;
}

export interface ApiEvidence {
  label: string;
  status: number;
  body: unknown;
}

export interface CaseResult {
  id: string;
  /** Scenario suite only: feature area (e.g. "Moderator review") and a readable title. */
  area?: string;
  title?: string;
  /** Scenario suite only: each individual verification and its outcome. */
  checks?: Check[];
  /** Scenario suite only: admin/moderator API calls made during the case. */
  apis?: ApiEvidence[];
  ruleId: string;
  ruleName: string;
  state: 'ON' | 'OFF' | 'N/A';
  kind: 'text' | 'image' | 'video' | 'scenario';
  message: string;
  expected: string;
  actual: string;
  /** Rule state read back from the API after switching the toggle. */
  toggle?: { status: number; enabledAfter: boolean };
  /** The sample app's own POST /messages response. */
  sendApi?: { status: number; body: unknown };
  /** Matching entry in Moderation → Blocked Messages, if any. */
  blockedEntry?: { ruleId: string; ruleName: string; action: string[] } | null;
  deliveredToReceiver?: boolean;
  senderView?: string;
  /** Whether the sender was shown "Your message was blocked due to moderation policies". */
  senderBlockedNotice?: boolean;
  screenshots: { before?: string; afterSender?: string; afterReceiver?: string; [label: string]: string | undefined };
  status: CaseStatus;
  bug?: string;
  /** Notable behavior that isn't a failure of the case (e.g. AI context side-effects). */
  finding?: string;
  startedAt: string;
  durationMs: number;
}

export interface RunInfo {
  runId: string;
  appEnv: string;
  appId: string;
  startedAt: string;
  finishedAt?: string;
  sampleAppCommit: string;
  isolation: string;
  rulesRestored?: boolean;
  notes: string[];
}

export class EvidenceRecorder {
  readonly dir: string;
  readonly shotsDir: string;
  private readonly results: CaseResult[] = [];

  constructor(root: string, readonly info: RunInfo) {
    this.dir = path.join(root, info.runId);
    this.shotsDir = path.join(this.dir, 'screenshots');
    fs.mkdirSync(this.shotsDir, { recursive: true });
    this.flush();
  }

  /** Relative path (from the run folder) for a screenshot. */
  shot(caseId: string, label: string): { abs: string; rel: string } {
    const rel = `screenshots/${caseId}-${label}.png`;
    return { abs: path.join(this.dir, rel), rel };
  }

  add(result: CaseResult): void {
    this.results.push(result);
    this.flush();
  }

  flush(): void {
    fs.writeFileSync(path.join(this.dir, 'results.json'), JSON.stringify({ info: this.info, results: this.results }, null, 2));
  }
}
