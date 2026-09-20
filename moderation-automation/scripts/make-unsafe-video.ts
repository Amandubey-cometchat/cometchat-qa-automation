/**
 * Builds fixtures/unsafe-revolver.(mp4|webm): a 4-second clip of the revolver
 * photo (slow zoom), recorded with Chromium's MediaRecorder — no ffmpeg needed.
 * Used as content the AI Video Moderation rule should flag (firearm → Violence).
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

(async () => {
  const root = path.resolve(__dirname, '..');
  const img = fs.readFileSync(path.join(root, 'fixtures/unsafe-revolver.jpg')).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Plain JS string: tsx's keepNames helper (__name) doesn't exist in the browser.
  const result: { mime: string; b64: string } = await page.evaluate(`(async (b64) => {
    const image = new Image();
    image.src = 'data:image/jpeg;base64,' + b64;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 960; canvas.height = 640;
    const ctx = canvas.getContext('2d');
    const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(canvas.captureStream(25), { mimeType: mime, videoBitsPerSecond: 2500000 });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(250);
    const start = performance.now();
    await new Promise((resolve) => {
      function frame() {
        const t = (performance.now() - start) / 4000;
        const z = 1 + 0.08 * t;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 960, 640);
        ctx.drawImage(image, (960 - 960 * z) / 2, (640 - 639 * z) / 2, 960 * z, 639 * z);
        if (t < 1) requestAnimationFrame(frame); else resolve();
      }
      frame();
    });
    rec.stop();
    await done;
    const buf = new Uint8Array(await new Blob(chunks, { type: mime }).arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { mime, b64: btoa(bin) };
  })(${JSON.stringify(img)})`);
  await browser.close();

  const ext = result.mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  const out = path.join(root, `fixtures/unsafe-revolver.${ext}`);
  fs.writeFileSync(out, Buffer.from(result.b64, 'base64'));
  console.log(`Wrote ${out} (${result.mime}, ${fs.statSync(out).size} bytes)`);
})();
