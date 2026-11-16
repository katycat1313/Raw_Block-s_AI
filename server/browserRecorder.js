import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { getVideoMetadata } from './ffmpegService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultAuthPath = path.resolve(__dirname, 'storage', 'auth.json');

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
  actionNotes = '',
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
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--force-dark-mode',
      '--enable-features=WebContentsForceDark',
      '--blink-settings=forceDarkMode=true'
    ]
  });

  const authPath = (outputDir && fs.existsSync(path.join(outputDir, '..', 'auth.json')))
    ? path.join(outputDir, '..', 'auth.json')
    : defaultAuthPath;

  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1920, height: 1080 }
    }
  };

  if (fs.existsSync(authPath)) {
    try {
      contextOptions.storageState = authPath;
      notify('🔑 Using saved authenticated session (auth.json). Bot has full logged-in access!');
    } catch (_) {}
  }

  const context = await browser.newContext(contextOptions);
  await context.addInitScript(() => {
    document.documentElement.style.backgroundColor = '#0b0f19';
    if (document.body) document.body.style.backgroundColor = '#0b0f19';
  });

  const sessionStartTime = Date.now();
  const page = await context.newPage();

  try {
    notify(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (_) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      } catch (err) {
        console.warn(`[BrowserRecorder] goto warning: ${err.message}`);
      }
    }
    await page.waitForTimeout(2000); // Allow Vite/React SPA UI components to fully hydrate and render

    // Inject visual cursor
    await page.evaluate(CURSOR_INJECTION_SCRIPT);

    // Ensure SPA UI components have hydrated and rendered
    await page.waitForSelector('#root, h1, h2', { state: 'visible', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Dismiss first-time onboarding modal cleanly via Playwright locator
    try {
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.count() > 0) {
        const closeBtn = dialog.locator('button').filter({ hasText: /explore platform first|close/i }).first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(800);
        }
      }
    } catch (_) {}

    // Calculate exact clock offset when UI is hydrated, modal dismissed, and page is ready.
    // This allows ffmpeg to slice cleanly past any initial navigation or white screen flash!
    const actionStartTimeSec = Math.max(0, (Date.now() - sessionStartTime) / 1000);
    notify(`UI ready and hydrated at ${actionStartTimeSec.toFixed(2)}s. Commencing human-paced visual actions...`);

    // Perform designated actions or automatic intelligent exploration
    if (actions && actions.length > 0) {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        notify(`Executing action ${i + 1}/${actions.length}: ${action.type} ${action.selector || action.text || ''}...`);

        if (action.type === 'click' && action.selector) {
          try {
            const el = page.locator(action.selector).first();
            await el.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
            if (await el.count() > 0) {
              await el.scrollIntoViewIfNeeded().catch(() => {});
              const box = await el.boundingBox();
              if (box) {
                const cx = box.x + box.width / 2;
                const cy = box.y + box.height / 2;
                await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: cx, y: cy });
                await page.waitForTimeout(220); // Natural human hesitation
                await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: cx, y: cy });
                await page.waitForTimeout(100);
              }
              await el.click({ force: true });
            }
          } catch (e) {
            console.warn(`[BrowserRecorder] Click warning for ${action.selector}: ${e.message}`);
          }
        } else if (action.type === 'type' && action.selector && action.text) {
          try {
            const el = page.locator(action.selector).first();
            await el.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
            if (await el.count() > 0) {
              await el.scrollIntoViewIfNeeded().catch(() => {});
              const box = await el.boundingBox();
              if (box) {
                const cx = box.x + box.width / 2;
                const cy = box.y + box.height / 2;
                await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: cx, y: cy });
                await page.waitForTimeout(200);
                await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: cx, y: cy });
              }
              await el.click({ force: true });
              await page.waitForTimeout(150);
              if (action.clear !== false) {
                await el.fill('');
              }
              await el.pressSequentially(action.text, { delay: action.delay || 35 });
            }
          } catch (e) {
            console.warn(`[BrowserRecorder] Type warning for ${action.selector}: ${e.message}`);
          }
        } else if (action.type === 'press_key' && action.key) {
          await page.keyboard.press(action.key);
          await page.waitForTimeout(300);
        } else if (action.type === 'cursor_to' && action.selector) {
          try {
            const el = page.locator(action.selector).first();
            if (await el.count() > 0) {
              const box = await el.boundingBox();
              if (box) {
                await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
                await page.waitForTimeout(action.delayMs || 400);
                await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              }
            }
          } catch (_) {}
        } else if (action.type === 'scroll') {
          const scrollY = action.y || 350;
          await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), scrollY);
          await page.waitForTimeout(700);
        } else if (action.type === 'wait') {
          await page.waitForTimeout(action.delayMs || 1000);
        }

        await page.waitForTimeout(250);
      }
    } else {
      // Intelligent route-aware demonstration flow when no explicit actions are specified
      notify(`Executing intelligent route-aware demonstration for ${url}...`);
      if (/seo-simulation/i.test(url)) {
        try {
          await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
          await page.waitForTimeout(600);
          const cmsTab = page.locator('button').filter({ hasText: /^CMS Optimizer$/i }).first();
          if (await cmsTab.count() > 0) {
            const box = await cmsTab.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(250);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
            await cmsTab.click();
            await page.waitForTimeout(800);
          }
          const editBtn = page.locator('button').filter({ hasText: 'Edit Website CMS' }).first();
          if (await editBtn.count() > 0) {
            const box = await editBtn.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(250);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
            await editBtn.click();
            await page.waitForTimeout(800);
          }
          const h1Input = page.locator('input[placeholder*="Small-Batch"], input[placeholder*="Organic"]').first();
          if (await h1Input.count() > 0) {
            const box = await h1Input.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(250);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
            await h1Input.fill('');
            await h1Input.pressSequentially("Artisan Roasted Coffee Beans — 100% Organic", { delay: 30 });
            await page.waitForTimeout(400);
          }
          const pubBtn = page.locator('button').filter({ hasText: /Publish & Run Analytics/i }).first();
          if (await pubBtn.count() > 0) {
            const box = await pubBtn.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(250);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
            await pubBtn.click();
            await page.waitForTimeout(1400);
          }
        } catch (err) {
          console.warn('[Smart SEO explorer warning]:', err.message);
        }
      } else if (/tutorial/i.test(url)) {
        try {
          const dossier = page.locator('button').filter({ hasText: 'Client Dossier' }).first();
          if (await dossier.count() > 0) {
            const box = await dossier.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(250);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
            await dossier.click();
            await page.waitForTimeout(1200);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
          }
          await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
          await page.waitForTimeout(600);
          const lesson = page.locator('button, a, div').filter({ hasText: /Chapter 1.2/i }).first();
          if (await lesson.count() > 0) {
            await lesson.click();
            await page.waitForTimeout(1000);
          }
        } catch (err) {
          console.warn('[Smart Tutorial explorer warning]:', err.message);
        }
      } else if (/dashboard/i.test(url)) {
        try {
          const radar = page.locator('svg polygon, svg path').first();
          if (await radar.count() > 0) {
            const box = await radar.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(350);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
          }
          const skillsBtn = page.locator('button').filter({ hasText: 'Skills Radar' }).first();
          if (await skillsBtn.count() > 0) {
            await skillsBtn.click();
            await page.waitForTimeout(600);
          }
          await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
          await page.waitForTimeout(800);
        } catch (err) {
          console.warn('[Smart Dashboard explorer warning]:', err.message);
        }
      } else {
        try {
          const firstButton = page.locator('a[href*="tutorial"], button:has-text("15 Lessons"), button:has-text("Start")').first();
          if (await firstButton.count() > 0) {
            const box = await firstButton.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(300);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
          }
          await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
          await page.waitForTimeout(800);
        } catch (_) {}
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

    notify(`Normalizing video into pristine H.264 1080p MP4 (${speedMultiplier > 1 ? `${speedMultiplier}x speed-up` : '1.0x'}) starting at ${actionStartTimeSec.toFixed(2)}s...`);
    
    // Transcode raw recording to clean 1080p MP4 with speedup and clean start offset
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
        '-ss', actionStartTimeSec.toFixed(2),
        '-t', (targetDurationSeconds * (speedMultiplier || 1.0)).toFixed(2),
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
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--force-dark-mode',
      '--enable-features=WebContentsForceDark',
      '--blink-settings=forceDarkMode=true'
    ]
  });

  const authPath = (outputDir && fs.existsSync(path.join(outputDir, '..', 'auth.json')))
    ? path.join(outputDir, '..', 'auth.json')
    : defaultAuthPath;

  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1920, height: 1080 }
    }
  };

  if (fs.existsSync(authPath)) {
    try {
      contextOptions.storageState = authPath;
      notify('🔑 Using saved authenticated session (auth.json). Bot has full logged-in access!');
    } catch (_) {}
  }

  const context = await browser.newContext(contextOptions);
  await context.addInitScript(() => {
    document.documentElement.style.backgroundColor = '#0b0f19';
    if (document.body) document.body.style.backgroundColor = '#0b0f19';
  });

  const sessionStartTime = Date.now();
  const page = await context.newPage();
  const pageClockStartTime = Date.now();

  try {
    notify(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (_) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      } catch (err) {
        console.warn(`[MultiClipRecorder] goto warning: ${err.message}`);
      }
    }
    // Ensure SPA UI components have hydrated and rendered
    await page.waitForSelector('#root, h1, h2', { state: 'visible', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.evaluate(CURSOR_INJECTION_SCRIPT);

    // Dismiss first-time onboarding modal cleanly via Playwright locator
    try {
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.count() > 0) {
        const closeBtn = dialog.locator('button').filter({ hasText: /explore platform first|close/i }).first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(800);
        }
      }
    } catch (_) {}

    const segmentTimings = [];

    // --- SCENE 1: Hero & Value Proposition ---
    notify(`Recording Take 1: Hero & Value Proposition...`);
    const t0 = (Date.now() - pageClockStartTime) / 1000;
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
    await page.waitForTimeout(800);
    const t1 = (Date.now() - pageClockStartTime) / 1000;
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
      await page.waitForTimeout(800);
      const t2 = (Date.now() - pageClockStartTime) / 1000;
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

/**
 * Autonomous Directive-Driven Block Scout:
 * Navigates to a target URL, interprets the user's plain-English directive (e.g.
 * "I want 30 seconds describing the different elements of the analytics page"),
 * targets relevant UI widgets, and slices a collection of 5 to 8-second micro-blocks.
 */
export async function scoutDirectiveBlocks({
  url,
  directive = '',
  clipCount = 5,
  clipDuration = 6.0,
  speedMultiplier = 1.25,
  outputDir,
  onProgress
}) {
  const notify = (msg) => {
    console.log(`[DirectiveScout] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  notify(`Starting Directive-Driven Scout at ${url}`);
  notify(`Directive: "${directive || 'Explore key features and capture distinct demonstration blocks'}"`);
  notify(`Plan: ${clipCount} distinct blocks of ${clipDuration}s each (${(clipCount * clipDuration).toFixed(0)}s total footage)...`);

  const tempVideoDir = path.join(outputDir, `tmp_scout_${Date.now()}`);
  if (!fs.existsSync(tempVideoDir)) fs.mkdirSync(tempVideoDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--force-dark-mode',
      '--enable-features=WebContentsForceDark',
      '--blink-settings=forceDarkMode=true'
    ]
  });

  const authPath = (outputDir && fs.existsSync(path.join(outputDir, '..', 'auth.json')))
    ? path.join(outputDir, '..', 'auth.json')
    : defaultAuthPath;

  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 1920, height: 1080 }
    }
  };

  if (fs.existsSync(authPath)) {
    try {
      contextOptions.storageState = authPath;
      notify('🔑 Authenticated session applied. Bot has full access!');
    } catch (_) {}
  }

  const context = await browser.newContext(contextOptions);
  await context.addInitScript(() => {
    document.documentElement.style.backgroundColor = '#0b0f19';
    if (document.body) document.body.style.backgroundColor = '#0b0f19';
  });

  const page = await context.newPage();
  const sessionStartTime = Date.now();

  try {
    notify(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (_) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      } catch (err) {
        console.warn(`[DirectiveScout] goto notice: ${err.message}`);
      }
    }

    // Wait for SPA hydration
    await page.waitForSelector('#root, h1, h2, main', { state: 'visible', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);

    // Inject virtual cursor script
    await page.evaluate(CURSOR_INJECTION_SCRIPT);

    // Dismiss first-time onboarding / modal dialogs if present
    try {
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.count() > 0) {
        const closeBtn = dialog.locator('button').filter({ hasText: /explore platform first|close|dismiss|got it|start/i }).first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(600);
        }
      }
    } catch (_) {}

    const directiveLower = (directive || '').toLowerCase();
    const isAnalytics = /analytic|metric|radar|report|roas|dashboard|competenc|score|havoc/i.test(directiveLower) || /dashboard/i.test(url);
    const isSEO = /seo|cms|headline|meta|keyword|h1|intent|search/i.test(directiveLower) || /seo/i.test(url);
    const isTutorial = /tutorial|lesson|chapter|dossier|student|practice/i.test(directiveLower) || /tutorial/i.test(url);

    const segmentTimings = [];

    // Execute clipCount distinct interactive takes
    for (let i = 0; i < clipCount; i++) {
      notify(`🎬 Capturing Block ${i + 1} of ${clipCount} (${clipDuration}s take)...`);
      const takeStartSec = Math.max(0, (Date.now() - sessionStartTime) / 1000);

      if (isAnalytics) {
        // Analytics & Dashboards flow
        if (i === 0) {
          // Take 1: Main Dashboard / Skills Radar Overview
          notify(`  → Block 1: Skills Radar & Core Competencies Overview`);
          const radar = page.locator('svg polygon, svg path, [class*="radar"], [class*="chart"]').first();
          if (await radar.count() > 0) {
            const box = await radar.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(300);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
          } else {
            await page.evaluate(() => window.__moveCursor && window.__moveCursor(960, 420));
          }
          await page.waitForTimeout(Math.max(1500, (clipDuration * 1000) - 1000));
          segmentTimings.push({
            start: takeStartSec,
            defaultTitle: 'Skills Radar & Performance Overview',
            role: 'metrics_results'
          });
        } else if (i === 1) {
          // Take 2: Interactive Filter / Pill selection
          notify(`  → Block 2: Competency Breakdown & Level Filters`);
          const filterBtn = page.locator('button').filter({ hasText: /Skills Radar|All Competencies|Search Intent|Campaign/i }).first();
          if (await filterBtn.count() > 0) {
            const box = await filterBtn.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(250);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
            await filterBtn.click({ force: true }).catch(() => {});
          }
          await page.waitForTimeout(Math.max(1500, (clipDuration * 1000) - 1000));
          segmentTimings.push({
            start: takeStartSec,
            defaultTitle: 'Competency Level & Intent Filtering',
            role: 'metrics_results'
          });
        } else if (i === 2) {
          // Take 3: Scroll down to KPI cards & ROAS metrics
          notify(`  → Block 3: ROAS & Client Retention KPI Cards`);
          await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'smooth' }));
          await page.waitForTimeout(700);
          const kpi = page.locator('[class*="card"], [class*="stat"], h3, h4').first();
          if (await kpi.count() > 0) {
            const box = await kpi.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(300);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
          }
          await page.waitForTimeout(Math.max(1500, (clipDuration * 1000) - 1200));
          segmentTimings.push({
            start: takeStartSec,
            defaultTitle: 'Live Campaign ROAS & Retention KPIs',
            role: 'metrics_results'
          });
        } else if (i === 3) {
          // Take 4: Detailed data table or client breakdown
          notify(`  → Block 4: Client Accounts & Historical Spend Audit`);
          await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
          await page.waitForTimeout(700);
          await page.evaluate(() => window.__moveCursor && window.__moveCursor(840, 560));
          await page.waitForTimeout(300);
          await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: 840, y: 560 });
          await page.waitForTimeout(Math.max(1500, (clipDuration * 1000) - 1200));
          segmentTimings.push({
            start: takeStartSec,
            defaultTitle: 'Client Account Spend & Performance Audit',
            role: 'metrics_results'
          });
        } else {
          // Take 5+: Launch simulator or defense button
          notify(`  → Block ${i + 1}: Live Simulator Launch & Decision Defense`);
          const simBtn = page.locator('button').filter({ hasText: /Launch Simulator|Defend Decisions|View Proof|Run/i }).first();
          if (await simBtn.count() > 0) {
            const box = await simBtn.boundingBox();
            if (box) {
              await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
              await page.waitForTimeout(300);
              await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: box.x + box.width / 2, y: box.y + box.height / 2 });
            }
          }
          await page.waitForTimeout(Math.max(1500, (clipDuration * 1000) - 1200));
          segmentTimings.push({
            start: takeStartSec,
            defaultTitle: 'Decision Defense & Simulation Verification',
            role: 'metrics_results'
          });
        }
      } else if (isSEO) {
        // SEO & CMS Workbench flow
        if (i === 0) {
          notify(`  → Block 1: CMS Optimizer Tab & Search Intent Overview`);
          await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
          await page.waitForTimeout(600);
          const tab = page.locator('button').filter({ hasText: /CMS Optimizer|SEO Workbench|Keywords/i }).first();
          if (await tab.count() > 0) {
            await tab.click();
            await page.waitForTimeout(600);
          }
          segmentTimings.push({ start: takeStartSec, defaultTitle: 'SEO & Search Intent Workbench', role: 'live_demo' });
        } else if (i === 1) {
          notify(`  → Block 2: Interactive Headline Editor & H1 Tag`);
          const editBtn = page.locator('button').filter({ hasText: /Edit Website CMS|Edit Copy/i }).first();
          if (await editBtn.count() > 0) {
            await editBtn.click();
            await page.waitForTimeout(500);
          }
          segmentTimings.push({ start: takeStartSec, defaultTitle: 'H1 Headline Copy Optimization', role: 'live_demo' });
        } else if (i === 2) {
          notify(`  → Block 3: Human Typing of High-Converting Headline`);
          const input = page.locator('input[placeholder*="Small-Batch"], input[placeholder*="Organic"], input[type="text"]').first();
          if (await input.count() > 0) {
            await input.fill('');
            await input.pressSequentially("Artisan Roasted Coffee Beans — 100% Organic", { delay: 28 });
          }
          segmentTimings.push({ start: takeStartSec, defaultTitle: 'Live Commercial Headline Writing', role: 'live_demo' });
        } else {
          notify(`  → Block ${i + 1}: Publish & Run Instant Analytics Audit`);
          const pubBtn = page.locator('button').filter({ hasText: /Publish|Run Analytics|Audit/i }).first();
          if (await pubBtn.count() > 0) {
            await pubBtn.click();
            await page.waitForTimeout(1200);
          }
          segmentTimings.push({ start: takeStartSec, defaultTitle: 'Instant Campaign Analytics Re-Audit', role: 'live_demo' });
        }
        await page.waitForTimeout(Math.max(1200, (clipDuration * 1000) - 1200));
      } else {
        // General Page Autonomous Tour
        notify(`  → Block ${i + 1}: General Exploration & Feature Demonstration`);
        if (i === 0) {
          await page.evaluate(() => window.__moveCursor && window.__moveCursor(960, 360));
          await page.waitForTimeout(400);
        } else {
          await page.evaluate((step) => window.scrollBy({ top: 320, behavior: 'smooth' }), i);
          await page.waitForTimeout(600);
          await page.evaluate(() => window.__moveCursor && window.__moveCursor(820, 480));
          await page.waitForTimeout(300);
          await page.evaluate(({ x, y }) => window.__showClickRipple && window.__showClickRipple(x, y), { x: 820, y: 480 });
        }
        await page.waitForTimeout(Math.max(1200, (clipDuration * 1000) - 1000));
        segmentTimings.push({
          start: takeStartSec,
          defaultTitle: `Application Walkthrough Part ${i + 1}`,
          role: 'live_demo'
        });
      }
    }

    notify('Closing browser and slicing distinct 1080p micro-blocks...');
    await page.close();
    await context.close();
    await browser.close();

    const rawFiles = fs.readdirSync(tempVideoDir).filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
    if (rawFiles.length === 0) throw new Error('Playwright did not output a video recording file.');
    const recordedRawFile = path.join(tempVideoDir, rawFiles[0]);

    const vfFilters = [];
    if (speedMultiplier && speedMultiplier !== 1.0) {
      vfFilters.push(`setpts=PTS/${speedMultiplier}`);
    }
    vfFilters.push('scale=1920:1080:force_original_aspect_ratio=decrease');
    vfFilters.push('pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black');
    vfFilters.push('setsar=1');
    vfFilters.push('fps=30');

    const outputClips = [];

    for (let i = 0; i < segmentTimings.length; i++) {
      const seg = segmentTimings[i];
      const filename = `block_scout_${Date.now()}_${i + 1}.mp4`;
      const filePath = path.join(outputDir, filename);

      notify(`Exporting Block ${i + 1}/${segmentTimings.length} (${clipDuration}s)...`);

      await new Promise((resSlice, rejSlice) => {
        const sliceArgs = [
          '-nostdin',
          '-ss', seg.start.toFixed(2),
          '-t', (clipDuration * (speedMultiplier || 1.0)).toFixed(2),
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
        title: seg.defaultTitle,
        defaultRole: seg.role,
        duration: meta.duration,
        width: meta.width,
        height: meta.height
      });
    }

    try { fs.rmSync(tempVideoDir, { recursive: true, force: true }); } catch (_) {}
    notify(`🎉 Successfully produced ${outputClips.length} pristine 1080p blocks!`);
    return outputClips;
  } catch (err) {
    try { await browser.close(); } catch (_) {}
    try { fs.rmSync(tempVideoDir, { recursive: true, force: true }); } catch (_) {}
    throw err;
  }
}
