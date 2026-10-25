import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { getVideoMetadata } from './ffmpegService.js';

/**
 * Script injected into the browser page to display a smooth virtual cursor and click ripples.
 */
const CURSOR_INJECTION_SCRIPT = `
(function() {
  if (window.__virtualCursorInjected) return;
  window.__virtualCursorInjected = true;

  const cursor = document.createElement('div');
  cursor.id = '__virtual_cursor';
  cursor.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 22px;
    height: 22px;
    background: rgba(99, 102, 241, 0.9);
    border: 2px solid #ffffff;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2147483647;
    transition: transform 0.20s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s;
    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    transform: translate(-50%, -50%);
  \`;
  document.documentElement.appendChild(cursor);

  window.__moveCursor = function(x, y) {
    cursor.style.transform = \`translate(\${x}px, \${y}px)\`;
  };

  window.__showClickRipple = function(x, y) {
    const ripple = document.createElement('div');
    ripple.style.cssText = \`
      position: fixed;
      left: \${x}px;
      top: \${y}px;
      width: 10px;
      height: 10px;
      background: transparent;
      border: 3px solid #ec4899;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483646;
      transform: translate(-50%, -50%);
      animation: __cursor_ripple 0.5s ease-out forwards;
    \`;
    document.documentElement.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
  };

  const style = document.createElement('style');
  style.textContent = \`
    @keyframes __cursor_ripple {
      0% { width: 10px; height: 10px; opacity: 1; border-color: #ec4899; }
      100% { width: 60px; height: 60px; opacity: 0; border-color: #a855f7; }
    }
  \`;
  document.head.appendChild(style);
})();
`;

/**
 * Autonomous Browser Agent that navigates, performs actions, and records 1080p MP4.
 */
export async function recordAppWorkflow({
  url,
  actions = [], // Array of { type: 'click'|'type'|'scroll'|'wait', selector?, text?, y?, delayMs? }
  targetDurationSeconds = 8,
  speedMultiplier = 1.25, // Snappy human speed-up factor (1.25x - 1.5x)
  outputDir,
  onProgress
}) {
  const notify = (msg) => {
    console.log(`[BrowserRecorder] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  notify(`Launching Playwright Chromium recorder at 1920x1080...`);

  const tempVideoDir = path.join(outputDir, `tmp_rec_${Date.now()}`);
  if (!fs.existsSync(tempVideoDir)) fs.mkdirSync(tempVideoDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    notify(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Inject visual cursor
    await page.evaluate(CURSOR_INJECTION_SCRIPT);

    // Perform designated actions or automatic intelligent exploration
    if (actions && actions.length > 0) {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        notify(`Executing step ${i + 1}/${actions.length}: ${action.type} ${action.selector || ''}...`);

        if (action.type === 'click' && action.selector) {
          try {
            const el = await page.waitForSelector(action.selector, { timeout: 5000, state: 'visible' });
            const box = await el.boundingBox();
            if (box) {
              const cx = box.x + box.width / 2;
              const cy = box.y + box.height / 2;
              // Smooth mouse move with virtual cursor
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: cx, y: cy });
              await page.waitForTimeout(250); // Natural human micro-hesitation
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: cx, y: cy });
              await el.click();
            }
          } catch (e) {
            console.warn(`[BrowserRecorder] Could not click ${action.selector}: ${e.message}`);
          }
        } else if (action.type === 'type' && action.selector && action.text) {
          try {
            const el = await page.waitForSelector(action.selector, { timeout: 5000 });
            await el.click();
            await page.waitForTimeout(150);
            await el.type(action.text, { delay: 45 }); // Snappy human typing cadence
          } catch (e) {
            console.warn(`[BrowserRecorder] Could not type into ${action.selector}: ${e.message}`);
          }
        } else if (action.type === 'scroll') {
          const scrollY = action.y || 400;
          await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), scrollY);
          await page.waitForTimeout(700);
        } else if (action.type === 'wait') {
          await page.waitForTimeout(action.delayMs || 1000);
        }

        await page.waitForTimeout(300);
      }
    } else {
      // Dynamic clean micro-clip showcase: timed precisely to target duration
      notify(`Recording clean ${targetDurationSeconds}s micro-clip showcase...`);
      if (targetDurationSeconds <= 4) {
        // Crisp 3-4s micro-cut: Hero glance + CTA click ripple + short smooth scroll
        await page.evaluate(() => window.__moveCursor && window.__moveCursor(960, 360));
        await page.waitForTimeout(450);
        await page.evaluate(() => window.__moveCursor && window.__moveCursor(820, 480));
        await page.waitForTimeout(400);
        await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: 820, y: 480 });
        await page.evaluate(() => window.scrollBy({ top: 260, behavior: 'smooth' }));
        await page.waitForTimeout(600);
      } else if (targetDurationSeconds <= 6) {
        // Punchy 5-6s feature cut
        await page.evaluate(() => window.__moveCursor && window.__moveCursor(960, 360));
        await page.waitForTimeout(500);
        await page.evaluate(() => window.__moveCursor && window.__moveCursor(680, 480));
        await page.waitForTimeout(450);
        await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: 680, y: 480 });
        await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
        await page.waitForTimeout(700);
        await page.evaluate(() => window.__moveCursor && window.__moveCursor(1080, 520));
        await page.waitForTimeout(600);
      } else {
        // Extended multi-action flow
        await page.evaluate(() => window.__moveCursor && window.__moveCursor(960, 360));
        await page.waitForTimeout(600);
        await page.evaluate(() => window.__moveCursor && window.__moveCursor(680, 480));
        await page.waitForTimeout(500);
        await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: 680, y: 480 });
        await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
        await page.waitForTimeout(800);
        await page.evaluate(() => window.__moveCursor && window.__moveCursor(1120, 540));
        await page.waitForTimeout(700);
        await page.evaluate(() => window.scrollBy({ top: -160, behavior: 'smooth' }));
        await page.waitForTimeout(600);
      }
    }

    notify('Closing browser and flushing video stream...');
    // Closing the page flushes the Playwright video recording
    await page.close();
    await context.close();
    await browser.close();

    // Find the generated video file in tempVideoDir
    const files = fs.readdirSync(tempVideoDir).filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
    if (files.length === 0) {
      throw new Error('Playwright did not output a video recording file.');
    }

    const recordedRawFile = path.join(tempVideoDir, files[0]);
    const finalMp4Filename = `agent_rec_${Date.now()}.mp4`;
    const finalMp4Path = path.join(outputDir, finalMp4Filename);

    notify(`Normalizing video into pristine H.264 1080p MP4 (${speedMultiplier > 1 ? `${speedMultiplier}x speed-up` : '1.0x'})...`);
    
    // Transcode raw recording to clean 1080p MP4 with optional speedup
    const vfFilters = [];
    if (speedMultiplier && speedMultiplier !== 1.0) {
      vfFilters.push(`setpts=PTS/${speedMultiplier}`);
    }
    vfFilters.push('scale=1920:1080:force_original_aspect_ratio=decrease');
    vfFilters.push('pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black');
    vfFilters.push('setsar=1');
    vfFilters.push('fps=30');

    await new Promise((resolve, reject) => {
      const args = [
        '-nostdin',
        '-i', recordedRawFile,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-vf', vfFilters.join(','),
        '-t', targetDurationSeconds.toString(),
        '-y',
        finalMp4Path
      ];
      execFile(ffmpegStatic, args, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Cleanup temp recording folder
    try { fs.rmSync(tempVideoDir, { recursive: true, force: true }); } catch (_) {}

    const meta = await getVideoMetadata(finalMp4Path);
    notify(`Agent screen recording complete (${meta.duration.toFixed(1)}s, 1920x1080)!`);

    return {
      filePath: finalMp4Path,
      filename: finalMp4Filename,
      duration: meta.duration,
      width: meta.width,
      height: meta.height
    };
  } catch (err) {
    try { await browser.close(); } catch (_) {}
    try { fs.rmSync(tempVideoDir, { recursive: true, force: true }); } catch (_) {}
    throw err;
  }
}

/**
 * Autonomous Multi-Clip Browser Agent:
 * Captures 2 or 3 distinct, targeted micro-clips in a single swift browser session:
 * 1. Hero & Value Proposition (3.5s)
 * 2. Interactive Feature / Simulation Sandbox (3.5s)
 * 3. Portfolio & Certification CTA (3.5s)
 */
export async function recordAppMultiClips({
  url,
  clipCount = 2, // 2 or 3 micro-clips
  clipDuration = 3.5, // 3.5 seconds each
  speedMultiplier = 1.25,
  outputDir,
  onProgress
}) {
  const notify = (msg) => {
    console.log(`[MultiClipRecorder] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  notify(`Launching Playwright agent to record ${clipCount} distinct micro-clips at ${url}...`);

  const tempVideoDir = path.join(outputDir, `tmp_multi_${Date.now()}`);
  if (!fs.existsSync(tempVideoDir)) fs.mkdirSync(tempVideoDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  try {
    notify(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(600);
    await page.evaluate(CURSOR_INJECTION_SCRIPT);

    const segmentTimings = [];

    // --- SCENE 1: Hero & Value Proposition ---
    notify(`Recording Take 1: Hero & Value Proposition...`);
    const t0 = 0.2;
    await page.evaluate(() => window.__moveCursor && window.__moveCursor(960, 360));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__moveCursor && window.__moveCursor(780, 480));
    await page.waitForTimeout(400);
    await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: 780, y: 480 });
    await page.waitForTimeout(Math.max(1200, (clipDuration * 1000) - 1000));
    segmentTimings.push({
      start: t0,
      title: 'App Hero & Value Proposition',
      tags: ['hero', 'headline', 'introduction', 'welcome', 'platform', 'app'],
      role: 'hero'
    });

    // --- SCENE 2: Interactive Feature / Simulation (after scroll) ---
    notify(`Recording Take 2: Interactive Feature / Simulation Sandbox...`);
    await page.evaluate(() => window.scrollBy({ top: 480, behavior: 'smooth' }));
    await page.waitForTimeout(700);
    const t1 = (clipDuration + 1.0);
    await page.evaluate(() => window.__moveCursor && window.__moveCursor(680, 520));
    await page.waitForTimeout(500);
    await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: 680, y: 520 });
    await page.evaluate(() => window.__moveCursor && window.__moveCursor(1080, 540));
    await page.waitForTimeout(Math.max(1200, (clipDuration * 1000) - 1200));
    segmentTimings.push({
      start: t1,
      title: 'Interactive Client Simulation Workshop',
      tags: ['simulation', 'workshop', 'client', 'campaign', 'features', 'practice', 'hands-on'],
      role: 'simulation'
    });

    // --- SCENE 3 (Optional): Portfolio & Certification CTA ---
    if (clipCount >= 3) {
      notify(`Recording Take 3: Portfolio & Employer Verification...`);
      await page.evaluate(() => window.scrollBy({ top: 450, behavior: 'smooth' }));
      await page.waitForTimeout(700);
      const t2 = (clipDuration * 2 + 2.0);
      await page.evaluate(() => window.__moveCursor && window.__moveCursor(960, 450));
      await page.waitForTimeout(600);
      await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: 960, y: 450 });
      await page.waitForTimeout(Math.max(1200, (clipDuration * 1000) - 1300));
      segmentTimings.push({
        start: t2,
        title: 'Verified Portfolio & Employer Certification',
        tags: ['portfolio', 'certification', 'trust', 'employers', 'results', 'cta', 'pricing'],
        role: 'portfolio'
      });
    }

    notify('Closing browser and finalizing session recording...');
    await page.close();
    await context.close();
    await browser.close();

    const rawFiles = fs.readdirSync(tempVideoDir).filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
    if (rawFiles.length === 0) throw new Error('Playwright did not output a video recording file.');
    const recordedRawFile = path.join(tempVideoDir, rawFiles[0]);

    // Slice raw take into multiple distinct 1080p micro-clips with speedup
    const outputClips = [];
    const vfFilters = [];
    if (speedMultiplier && speedMultiplier !== 1.0) {
      vfFilters.push(`setpts=PTS/${speedMultiplier}`);
    }
    vfFilters.push('scale=1920:1080:force_original_aspect_ratio=decrease');
    vfFilters.push('pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black');
    vfFilters.push('setsar=1');
    vfFilters.push('fps=30');

    for (let i = 0; i < segmentTimings.length; i++) {
      const seg = segmentTimings[i];
      const filename = `agent_micro_${Date.now()}_${i + 1}.mp4`;
      const filePath = path.join(outputDir, filename);

      notify(`Exporting Micro-Clip ${i + 1}/${segmentTimings.length}: "${seg.title}"...`);

      await new Promise((resSlice, rejSlice) => {
        const sliceArgs = [
          '-nostdin',
          '-ss', seg.start.toString(),
          '-t', (clipDuration * (speedMultiplier || 1.0)).toString(),
          '-i', recordedRawFile,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '18',
          '-pix_fmt', 'yuv420p',
          '-vf', vfFilters.join(','),
          '-t', clipDuration.toString(),
          '-y',
          filePath
        ];
        execFile(ffmpegStatic, sliceArgs, (err) => {
          if (err) return rejSlice(err);
          resSlice();
        });
      });

      const meta = await getVideoMetadata(filePath);
      outputClips.push({
        filePath,
        filename,
        title: seg.title,
        tags: seg.tags,
        role: seg.role,
        duration: meta.duration,
        width: meta.width,
        height: meta.height
      });
    }

    try { fs.rmSync(tempVideoDir, { recursive: true, force: true }); } catch (_) {}
    notify(`Captured ${outputClips.length} clean micro-clips successfully!`);
    return outputClips;
  } catch (err) {
    try { await browser.close(); } catch (_) {}
    try { fs.rmSync(tempVideoDir, { recursive: true, force: true }); } catch (_) {}
    throw err;
  }
}
