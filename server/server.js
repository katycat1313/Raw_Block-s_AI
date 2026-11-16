import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (_) {}
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { getVideoMetadata, generateThumbnail, sliceVideoSegment, trimSegment, renderTimeline, generateSampleAmbientMusic, stitchVideoParts, addVoiceoverToVideo } from './ffmpegService.js';
import { analyzeVideoClip, analyzeTourBlueprint } from './clipVisionService.js';
import { DEEPGRAM_VOICES, generateVoiceover, generateVoicePreview, sanitizeVoiceoverText, parsePartSections } from './deepgramService.js';
import { VideoAgentOrchestrator } from './agentOrchestrator.js';
import { recordAppWorkflow, recordAppMultiClips, scoutDirectiveBlocks } from './browserRecorder.js';
import { searchBrollClips, importBrollClip } from './pexelsService.js';
import { assignBlockTaxonomy, syncProjectKeyFile, CATEGORY_DEFINITIONS } from './projectKeyService.js';
import { analyzeDeepVideo } from './deepVideoUnderstanding.js';
import { loadKnowledgeBlocks, saveKnowledgeBlocks, createKnowledgeBlocksFromAnalysis } from './knowledgeBlockService.js';
import { searchKnowledgeBlocksSemantic, expandQueryWithKnowledgeGraph, KNOWLEDGE_GRAPH } from './knowledgeGraphService.js';
import { composeStoryArc, reconstructVoiceover, retrieveContextAwareBroll, composeAndRenderMasterDemo } from './storyComposerService.js';
import { recreateKnowledgeBlockScene } from './sceneRecreationService.js';
import { chatWithClientPersona, CLIENT_PERSONAS } from './clientPersonaService.js';
import { producePremiumTofuVideo } from './tofuDirectorService.js';
import { planCommercial, refineCommercial, produceCommercialVideo } from './commercialDirectorService.js';
import { getSocialAuth, connectTikTok, connectFacebook, disconnectSocial, publishToTikTok, publishToFacebook } from './socialService.js';
import { createAgentApiRouter } from './agentApiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
dotenv.config({ path: path.join(rootDir, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Storage directories
const storageDir = path.join(__dirname, 'storage');
const uploadsDir = path.join(storageDir, 'uploads');
const thumbnailsDir = path.join(storageDir, 'thumbnails');
const audioDir = path.join(storageDir, 'audio');
const rendersDir = path.join(storageDir, 'renders');
const musicDir = path.join(storageDir, 'music');

[storageDir, uploadsDir, thumbnailsDir, audioDir, rendersDir, musicDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Generate default sample ambient music if not already present
const defaultSampleMusicPath = path.join(musicDir, 'chill_tech_ambient.mp3');
if (!fs.existsSync(defaultSampleMusicPath)) {
  console.log('[Server] Generating default ambient music track...');
  generateSampleAmbientMusic(defaultSampleMusicPath, 60).catch(err => {
    console.warn('[Server] Note: Sample music generation failed:', err.message);
  });
}

// Catalog of uploaded clips with disk persistence
const clipsDbPath = path.join(storageDir, 'clips.json');
let clipDatabase = [];
let currentProject = 'krechet_academy';
let currentAppUrl = 'https://krechet.academy';

function saveClipDatabase() {
  try {
    fs.writeFileSync(clipsDbPath, JSON.stringify(clipDatabase, null, 2), 'utf8');
  } catch (e) {
    console.error('[DB] Failed saving clips.json:', e);
  }
}

// Load persisted database on startup
if (fs.existsSync(clipsDbPath)) {
  try {
    const raw = fs.readFileSync(clipsDbPath, 'utf8');
    clipDatabase = JSON.parse(raw).filter(c => fs.existsSync(c.filePath));
    console.log(`[DB] Restored ${clipDatabase.length} clips from clips.json`);
  } catch (e) {
    console.warn('[DB] Could not load clips.json:', e.message);
  }
}

// Blueprint Persistence: Stores the learned "Stage & Props" Map from user tour
const blueprintPath = path.join(storageDir, 'blueprint.json');
let activeBlueprint = null;

function saveBlueprint() {
  try {
    if (activeBlueprint) {
      fs.writeFileSync(blueprintPath, JSON.stringify(activeBlueprint, null, 2), 'utf8');
    } else if (fs.existsSync(blueprintPath)) {
      fs.unlinkSync(blueprintPath);
    }
  } catch (e) {
    console.error('[Blueprint] Failed saving blueprint.json:', e);
  }
}

if (fs.existsSync(blueprintPath)) {
  try {
    activeBlueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
    console.log(`[Blueprint] Loaded active blueprint for "${activeBlueprint?.appName || 'App'}" with ${activeBlueprint?.keyFeatures?.length || 0} features.`);
  } catch (e) {
    console.warn('[Blueprint] Warning loading blueprint.json:', e.message);
  }
}

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static storage assets (uploads, thumbnails, renders, audio)
app.use('/storage', express.static(storageDir));
app.use('/renders', express.static(rendersDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/thumbnails', express.static(thumbnailsDir));
app.use('/audio', express.static(audioDir));

// Force File Download Endpoint with Content-Disposition: attachment
app.get('/api/download', (req, res) => {
  const filePathParam = req.query.file || req.query.path;
  if (!filePathParam) {
    return res.status(400).send('File parameter required.');
  }

  // Remove query parameters from path
  let target = decodeURIComponent(filePathParam).split('?')[0];

  // If full URL was passed (e.g. http://localhost:3001/storage/renders/foo.mp4)
  if (target.startsWith('http://') || target.startsWith('https://')) {
    try {
      const parsedUrl = new URL(target);
      target = parsedUrl.pathname;
    } catch (_) {}
  }

  // Normalize relative path
  const relativePath = target
    .replace(/^(\/api)?\/storage\//, '')
    .replace(/^\/+/, '');

  let fullPath = path.resolve(storageDir, relativePath);

  // If not found directly, check renders, uploads, and audio subdirectories
  if (!fs.existsSync(fullPath)) {
    const candidateRenders = path.join(rendersDir, path.basename(relativePath));
    const candidateUploads = path.join(uploadsDir, path.basename(relativePath));
    const candidateAudio = path.join(audioDir, path.basename(relativePath));
    if (fs.existsSync(candidateRenders)) fullPath = candidateRenders;
    else if (fs.existsSync(candidateUploads)) fullPath = candidateUploads;
    else if (fs.existsSync(candidateAudio)) fullPath = candidateAudio;
  }

  // Security check: ensure path is inside storageDir
  if (!fullPath.startsWith(storageDir) || !fs.existsSync(fullPath)) {
    return res.status(404).send('File not found on server.');
  }

  const downloadName = req.query.name || path.basename(fullPath);
  try {
    const stat = fs.statSync(fullPath);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(fullPath);
    stream.on('error', (streamErr) => {
      console.error('[Download Stream Error]', streamErr);
      if (!res.headersSent) res.status(500).send('Error streaming file');
    });
    stream.pipe(res);
  } catch (err) {
    console.error('[Download Stat Error]', err);
    res.status(500).send('Error reading file for download');
  }
});

// Multer storage setup for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanBase}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

const musicStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, musicDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanBase}_${Date.now()}${ext}`);
  }
});
const uploadMusic = multer({
  storage: musicStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  const authPath = path.join(storageDir, 'auth.json');
  res.json({
    status: 'ok',
    geminiKeySet: !!(process.env.GEMINI_API_KEY),
    deepgramKeySet: !!(process.env.DEEPGRAM_API_KEY),
    pexelsKeySet: !!(process.env.PEXELS_API_KEY),
    botAuthenticated: fs.existsSync(authPath),
    clipsLoaded: clipDatabase.length
  });
});

// Check Bot Auth Status
app.get('/api/auth/status', (req, res) => {
  const authPath = path.join(storageDir, 'auth.json');
  res.json({ authenticated: fs.existsSync(authPath) });
});

// Headless Sign-In with user credentials
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const authPath = path.join(storageDir, 'auth.json');
  console.log(`[Auth] Attempting headless login for: ${email}...`);

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('https://krechet.academy/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1500);

    // Dismiss any onboarding modal overlay that intercepts clicks on /login
    try {
      const dialog = page.locator('[role="dialog"]');
      if (await dialog.count() > 0) {
        const closeBtn = dialog.locator('button').filter({ hasText: /explore platform first|close/i }).first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(600);
        }
      }
    } catch (_) {}

    // Fill in credentials
    await page.fill('input[name="email"], input[type="email"], input[type="text"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);
    await page.waitForTimeout(300);

    // Submit form via Enter key or force click (bypasses any transparent backdrop interception)
    try {
      await page.keyboard.press('Enter');
    } catch (_) {
      const submitBtn = page.locator('form button[type="submit"], form button:has-text("Sign in")').first();
      await submitBtn.click({ force: true });
    }

    // Wait for redirect away from /login
    try {
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    } catch (_) {
      const errorText = await page.evaluate(() => {
        const errEl = document.querySelector('.error, [class*="error"], [role="alert"], div[style*="red"], [class*="destructive"]');
        return errEl ? errEl.innerText.trim() : null;
      });
      await browser.close();
      return res.status(401).json({ error: errorText || 'Invalid login credentials or login timed out.' });
    }

    await page.waitForTimeout(2000);
    await context.storageState({ path: authPath });
    console.log(`[Auth] ✅ Headless login successful for ${email}! Saved auth.json.`);
    await browser.close();

    res.json({ success: true, user: email });
  } catch (err) {
    console.error('[Auth Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Autonomous App Scout & Action-Block Slicer
app.post('/api/scout-app', async (req, res) => {
  const authPath = path.join(storageDir, 'auth.json');
  if (!fs.existsSync(authPath)) {
    return res.status(401).json({ error: 'Bot is not authenticated. Please log in first.' });
  }

  console.log('[Scout] Starting automated platform scout across Krechet Academy...');

  const routesToScout = [
    {
      route: '/',
      title: 'Main Dashboard & Workspace Overview',
      actionType: 'Navigation / Overview',
      reusability: 'High',
      notes: 'Overview of the platform, marketing lab stats, and primary navigation',
      category: 'B',
      actions: [
        { type: 'cursor_to', selector: 'h1, h2', delayMs: 400 },
        { type: 'scroll', y: 320 },
        { type: 'click', selector: 'button:has-text("15 Lessons"), a:has-text("15 Lessons"), a[href*="tutorials"]' },
        { type: 'wait', delayMs: 1200 }
      ]
    },
    {
      route: '/tutorials',
      title: "Jenny's Artisan Java: 15-Lesson Action Plan",
      actionType: 'Feature Walkthrough',
      reusability: 'High',
      notes: 'Interactive client discovery exercise, lesson cards, and practical study notes',
      category: 'B',
      actions: [
        { type: 'click', selector: 'button:has-text("Client Dossier")' },
        { type: 'wait', delayMs: 1200 },
        { type: 'press_key', key: 'Escape' },
        { type: 'scroll', y: 280 },
        { type: 'click', selector: 'button:has-text("Chapter 1.2"), div:has-text("Chapter 1.2")' },
        { type: 'wait', delayMs: 1000 }
      ]
    },
    {
      route: '/seo-simulation/1',
      title: 'SEO & Website Studio: H1 Headline & Meta Intent Workbench',
      actionType: 'Interactive Simulation',
      reusability: 'Targeted',
      notes: 'Real-time CMS editing, organic search intent optimization, and instant analytics re-audit',
      category: 'B',
      actions: [
        { type: 'scroll', y: 400 },
        { type: 'click', selector: 'button:has-text("CMS Optimizer")' },
        { type: 'wait', delayMs: 600 },
        { type: 'click', selector: 'button:has-text("Edit Website CMS")' },
        { type: 'wait', delayMs: 600 },
        { type: 'type', selector: 'input[placeholder*="Small-Batch"], input[placeholder*="Organic"]', text: "Artisan Roasted Coffee Beans — 100% Organic", delay: 25 },
        { type: 'wait', delayMs: 400 },
        { type: 'click', selector: 'button:has-text("Publish & Run Analytics")' },
        { type: 'wait', delayMs: 1500 }
      ]
    },
    {
      route: '/dashboard',
      title: 'Skills Radar & Performance Analytics Proof',
      actionType: 'Metrics & Results',
      reusability: 'High',
      notes: 'Real-time competencies radar, client mastery metrics, and proof of work verification',
      category: 'C',
      actions: [
        { type: 'cursor_to', selector: 'svg polygon, svg path', delayMs: 500 },
        { type: 'click', selector: 'button:has-text("Skills Radar")' },
        { type: 'wait', delayMs: 600 },
        { type: 'scroll', y: 350 },
        { type: 'click', selector: 'button:has-text("Launch Simulator"), button:has-text("Defend Decisions")' },
        { type: 'wait', delayMs: 1000 }
      ]
    }
  ];

  const scoutedClips = [];

  try {
    for (let i = 0; i < routesToScout.length; i++) {
      const item = routesToScout[i];
      const targetUrl = `https://krechet.academy${item.route}`;
      console.log(`[Scout] [${i + 1}/${routesToScout.length}] Capturing 1080p take: ${item.title}...`);

      const recResult = await recordAppWorkflow({
        url: targetUrl,
        actions: item.actions || [],
        actionNotes: item.notes,
        targetDurationSeconds: 4.5,
        speedMultiplier: 1.25,
        outputDir: uploadsDir
      });

      const clipId = `clip_scout_${Date.now()}_${i + 1}`;
      const thumbnailName = `${clipId}.jpg`;
      const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
      await generateThumbnail(recResult.filePath, thumbnailPath, 1.0);

      const clipEntry = {
        clipId,
        filename: recResult.filename,
        originalName: item.title,
        filePath: recResult.filePath,
        videoUrl: `/storage/uploads/${recResult.filename}`,
        thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
        title: item.title,
        description: item.notes,
        contentType: 'screen_recording',
        lightingProfile: 'screen_dark',
        actionType: item.actionType,
        reusability: item.reusability,
        categoryLetter: item.category,
        blockCode: `${item.category}${i + 1}`,
        keyActions: [item.actionType, item.title],
        suggestedHighlights: ['center', 'top-right'],
        tags: ['Krechet Academy', item.actionType, item.reusability, '1080p'],
        duration: 4.5,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9'
      };

      clipDatabase.push(clipEntry);
      scoutedClips.push(clipEntry);
      console.log(`[Scout] ✅ Successfully cataloged [${clipEntry.blockCode}] "${item.title}"`);
    }

    saveClipDatabase();
    console.log(`[Scout] Complete! Cataloged ${scoutedClips.length} authentic reusable blocks.`);
    res.json({ success: true, count: scoutedClips.length, clips: scoutedClips });
  } catch (scoutErr) {
    console.error('[Scout Error]:', scoutErr);
    res.status(500).json({ error: scoutErr.message });
  }
});

// Launch Guided Login Window on desktop so the user can log in once
app.post('/api/auth/start-login', async (req, res) => {
  const authPath = path.join(storageDir, 'auth.json');
  console.log('[Auth] Opening visible Chrome window on desktop for one-time login...');
  
  // Launch visible browser
  (async () => {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: ['--start-maximized']
      });
      const context = await browser.newContext({ viewport: null });
      const page = await context.newPage();
      await page.goto('https://krechet.academy/login');
      
      // Wait for user to complete login (URL leaves /login)
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 120000 });
      await page.waitForTimeout(2000);
      await context.storageState({ path: authPath });
      console.log('[Auth] ✅ Successfully saved authenticated session to auth.json!');
      await browser.close();
    } catch (err) {
      console.warn('[Auth] Login cancelled or timed out:', err.message);
    }
  })();

  res.json({ success: true, message: 'Browser window opened on your screen. Please log into Krechet Academy.' });
});

// List Deepgram Voices
app.get('/api/voices', (req, res) => {
  res.json({ voices: DEEPGRAM_VOICES });
});

// Stream/Cache Voice Sample Preview (iOS Safari compatible GET audio stream)
app.get('/api/voices/preview', async (req, res) => {
  try {
    const voiceId = String(req.query.voiceId || 'flux-wade-en');
    const customText = req.query.text ? String(req.query.text) : undefined;
    const apiKey = process.env.DEEPGRAM_API_KEY;
    const { audioPath } = await generateVoicePreview({
      voiceId,
      apiKey,
      audioDir,
      text: customText
    });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.resolve(audioPath), { dotfiles: 'allow' });
  } catch (err) {
    console.error('[Voice Preview Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// List Background Music Tracks
app.get('/api/music', (req, res) => {
  const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
  const tracks = files.map(filename => ({
    id: filename,
    name: filename.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''),
    url: `/storage/music/${filename}`,
    filePath: path.join(musicDir, filename)
  }));
  res.json({ tracks });
});

// Upload Custom Background Music Track
app.post('/api/upload-music', uploadMusic.single('music'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided.' });
  const filename = req.file.filename;
  console.log(`[Music Upload] Custom music uploaded: ${filename}`);
  res.json({
    success: true,
    track: {
      id: filename,
      name: filename.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''),
      url: `/storage/music/${filename}`,
      filePath: req.file.path
    }
  });
});

// Upload Video Clips
app.post('/api/upload', (req, res, next) => {
  console.log('[Upload] Incoming multipart upload request received...');
  next();
}, upload.array('videos', 25), async (req, res) => {
  try {
    const files = req.files || [];
    console.log(`[Upload] Received ${files.length} video file(s)`);
    if (files.length === 0) {
      return res.status(400).json({ error: 'No video files provided' });
    }

    const processedClips = [];

    for (const file of files) {
      if (!fs.existsSync(file.path) || fs.statSync(file.path).size === 0) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({
          error: `File "${file.originalname}" is empty (0 bytes). Please ensure the file was completely downloaded or saved before uploading.`
        });
      }

      const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const thumbnailName = `${clipId}.jpg`;
      const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

      // 1. Generate thumbnail
      try {
        await generateThumbnail(file.path, thumbnailPath, 1.0);
      } catch (thumbErr) {
        console.warn(`[Upload] Thumbnail generation warning:`, thumbErr.message);
      }

      // 2. Vision analysis (Gemini or smart heuristic)
      const visionResult = await analyzeVideoClip({
        filePath: file.path,
        clipId,
        originalFilename: file.originalname,
        geminiApiKey: req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY,
        workDir: storageDir
      });

      const clipEntry = {
        clipId,
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        videoUrl: `/storage/uploads/${file.filename}`,
        thumbnailUrl: fs.existsSync(thumbnailPath) ? `/storage/thumbnails/${thumbnailName}` : null,
        ...visionResult
      };

      clipDatabase.push(clipEntry);
      saveClipDatabase();
      processedClips.push(clipEntry);
    }

    res.json({ success: true, clips: processedClips });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});

async function getAllRenderedVideos() {
  if (!fs.existsSync(rendersDir)) return [];
  try {
    const files = fs.readdirSync(rendersDir).filter(f => f.endsWith('.mp4'));
    const list = [];
    for (const filename of files) {
      const fullPath = path.join(rendersDir, filename);
      let stat;
      try { stat = fs.statSync(fullPath); } catch (_) { continue; }

      let title = 'AI Rendered Video';
      let badge = '🎞️ Render';
      if (filename.startsWith('krechet_precision_synced_tofu')) {
        title = '🔥 Krechet Master TOFU Video Ad (Precision Frame & Audio Locked)';
        badge = '🔥 Master Synced';
      } else if (filename.startsWith('krechet_premium_tofu_ad')) {
        title = '🔥 Krechet Premium TOFU Video Ad (Direct-Response Cuts & Kinetic Badges)';
        badge = '🔥 Premium TOFU';
      } else if (filename.startsWith('mastered_edits')) {
        title = '🎯 Re-Mastered Video (Timestamped Edits)';
        badge = '🎯 Re-Mastered';
      } else if (filename.includes('krechet_demo_mastered')) {
        title = '⭐ Krechet 4-Act Master Demo (CapCut Visuals)';
        badge = '⭐ Master Demo';
      } else if (filename.startsWith('master_film')) {
        title = '🎬 Full Sequence Master Film';
        badge = '🎬 Full Sequence';
      } else if (filename.startsWith('series_')) {
        title = 'Series Episode Render';
        badge = '📦 Episode';
      } else {
        title = filename.replace(/\.mp4$/i, '').replace(/_/g, ' ');
      }

      let duration = null;
      try {
        const meta = await getVideoMetadata(fullPath);
        duration = meta?.duration || null;
      } catch (_) {}

      list.push({
        filename,
        url: `/storage/renders/${filename}`,
        title,
        badge,
        duration: duration ? Math.round(duration * 10) / 10 : null,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
        createdAt: stat.mtimeMs,
        timeString: new Date(stat.mtimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateString: new Date(stat.mtimeMs).toLocaleDateString([], { month: 'short', day: 'numeric' })
      });
    }
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  } catch (err) {
    console.warn('[getAllRenderedVideos] Error reading renders:', err.message);
    return [];
  }
}

// Mount V1 API Key-Protected Router for External Social Media Agents
app.use('/api/v1', createAgentApiRouter({
  getClips: () => clipDatabase,
  addClips: (newClips) => {
    clipDatabase.push(...newClips);
  },
  saveClipDatabase,
  getCurrentProject: () => currentProject,
  getCurrentAppUrl: () => currentAppUrl,
  storageDir,
  uploadsDir,
  thumbnailsDir,
  audioDir,
  rendersDir,
  musicDir,
  getAllRenderedVideos
}));

// Get all uploaded clips (auto-categorized and enriched with block taxonomy)
app.get('/api/clips', async (req, res) => {
  const enriched = assignBlockTaxonomy(clipDatabase);
  try {
    syncProjectKeyFile({
      storageDir,
      projectName: currentProject,
      appUrl: currentAppUrl,
      clips: enriched
    });
  } catch (err) {
    console.warn('[ProjectKey] Warning syncing key file:', err.message);
  }

  const renders = await getAllRenderedVideos();
  const latestRenderUrl = renders.length > 0 ? renders[0].url : null;

  res.json({ clips: enriched, project: currentProject, appUrl: currentAppUrl, latestRenderUrl, renders });
});

// Get all rendered videos in studio gallery
app.get('/api/renders', async (req, res) => {
  const renders = await getAllRenderedVideos();
  res.json({ renders });
});

// Delete a specific rendered video
app.delete('/api/renders/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const targetPath = path.join(rendersDir, filename);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return res.json({ success: true, message: `Deleted ${filename}` });
    }
    res.status(404).json({ error: 'Rendered video not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get active project metadata and BLOCK_KEY.txt content
app.get('/api/project', (req, res) => {
  const enriched = assignBlockTaxonomy(clipDatabase);
  const syncRes = syncProjectKeyFile({
    storageDir,
    projectName: currentProject,
    appUrl: currentAppUrl,
    clips: enriched
  });

  const projectsDir = path.join(storageDir, 'projects');
  let availableProjects = [];
  try {
    availableProjects = fs.readdirSync(projectsDir).filter(f => {
      try { return fs.statSync(path.join(projectsDir, f)).isDirectory(); } catch (_) { return false; }
    });
  } catch (_) {}

  res.json({
    currentProject,
    currentAppUrl,
    keyContent: syncRes.keyContent,
    keyPath: syncRes.keyPath,
    availableProjects: availableProjects.length > 0 ? availableProjects : [currentProject],
    categories: CATEGORY_DEFINITIONS,
    totalClips: enriched.length
  });
});

// Download raw BLOCK_KEY.txt
app.get('/api/project/key', (req, res) => {
  const enriched = assignBlockTaxonomy(clipDatabase);
  const syncRes = syncProjectKeyFile({
    storageDir,
    projectName: currentProject,
    appUrl: currentAppUrl,
    clips: enriched
  });
  res.download(syncRes.keyPath, `${currentProject}_BLOCK_KEY.txt`);
});

// Switch or create project folder
app.post('/api/project/switch', (req, res) => {
  const { projectName, appUrl } = req.body;
  if (!projectName) return res.status(400).json({ error: 'Project name is required' });

  const cleanName = projectName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  currentProject = cleanName;
  if (appUrl) currentAppUrl = appUrl.trim();

  const enriched = assignBlockTaxonomy(clipDatabase);
  const syncRes = syncProjectKeyFile({
    storageDir,
    projectName: currentProject,
    appUrl: currentAppUrl,
    clips: enriched
  });

  res.json({
    success: true,
    currentProject,
    currentAppUrl,
    keyContent: syncRes.keyContent,
    keyPath: syncRes.keyPath
  });
});

// Delete a clip
app.delete('/api/clips/:id', (req, res) => {
  const { id } = req.params;
  const clipIndex = clipDatabase.findIndex(c => c.clipId === id);
  if (clipIndex !== -1) {
    const clip = clipDatabase[clipIndex];
    try { if (fs.existsSync(clip.filePath)) fs.unlinkSync(clip.filePath); } catch (_) {}
    clipDatabase.splice(clipIndex, 1);
    saveClipDatabase();
  }
  res.json({ success: true, remaining: clipDatabase.length });
});

// Clear all clips to start with a pristine clean slate
app.post('/api/clips/clear-all', (req, res) => {
  try {
    // Delete files in uploadsDir and thumbnailsDir
    try {
      const files = fs.readdirSync(uploadsDir);
      for (const f of files) {
        try { fs.unlinkSync(path.join(uploadsDir, f)); } catch (_) {}
      }
      const thumbs = fs.readdirSync(thumbnailsDir);
      for (const t of thumbs) {
        try { fs.unlinkSync(path.join(thumbnailsDir, t)); } catch (_) {}
      }
    } catch (_) {}

    clipDatabase = [];
    saveClipDatabase();
    console.log('[DB] Clip database wiped clean for fresh studio takes.');
    res.json({ success: true, count: 0 });
  } catch (err) {
    console.error('[DB Clear Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// APP BLUEPRINT & STAGE TOUR (User Walkthrough Knowledge Base)
// -------------------------------------------------------------

// Get current active blueprint
app.get('/api/blueprint', (req, res) => {
  res.json({ blueprint: activeBlueprint });
});

// Upload and analyze a user's rough screen tour walkthrough
app.post('/api/blueprint/tour', upload.single('tourVideo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No tour video file provided' });
    const targetUrl = req.body.targetUrl || currentAppUrl;
    const geminiKey = req.headers['x-gemini-key'] || req.body.geminiKey || process.env.GEMINI_API_KEY;
    const deepgramKey = req.headers['x-deepgram-key'] || req.body.deepgramKey || process.env.DEEPGRAM_API_KEY;

    console.log(`[Blueprint] Received user tour video (${req.file.filename}). Transcribing voiceover & analyzing with Gemini 3.8 Flash Vision...`);
    const blueprint = await analyzeTourBlueprint({
      filePath: req.file.path,
      geminiApiKey: geminiKey,
      deepgramApiKey: deepgramKey,
      workDir: storageDir,
      targetUrl
    });

    activeBlueprint = blueprint;
    saveBlueprint();

    console.log(`[Blueprint] Blueprint successfully locked: "${blueprint.appName}" with ${blueprint.keyFeatures?.length || 0} features.`);

    // -------------------------------------------------------------
    // AUTOMATIC TOUR SLICER: Slice the user's authentic tour recording into certified 1080p library clips!
    // -------------------------------------------------------------
    const createdClips = [];
    try {
      const tourMeta = await getVideoMetadata(req.file.path);
      const totalDuration = Math.max(2, tourMeta.duration || 10);
      console.log(`[Tour Slicer] Slicing tour video (${totalDuration.toFixed(1)}s) into clean library blocks...`);

      const features = blueprint.keyFeatures || [];
      // Determine slice count (between 2 and 5 slices based on tour length and features identified)
      let sliceCount = Math.max(3, features.length);
      if (totalDuration < 8) sliceCount = 1;
      else if (totalDuration < 15) sliceCount = 2;
      else if (sliceCount > 5) sliceCount = 5;

      const sliceDuration = Math.min(6.5, Math.max(3.5, totalDuration / sliceCount));
      const step = sliceCount > 1 ? (totalDuration - sliceDuration) / (sliceCount - 1) : 0;

      for (let i = 0; i < sliceCount; i++) {
        const startSec = Math.max(0, i * step);
        const feat = features[i] || features[i % Math.max(1, features.length)] || null;
        const clipId = `clip_${Date.now()}_tour${i + 1}_${Math.random().toString(36).substring(2, 5)}`;
        const sliceFilename = `tour_slice_${i + 1}_${Date.now()}.mp4`;
        const slicePath = path.join(uploadsDir, sliceFilename);
        const thumbnailName = `${clipId}.jpg`;
        const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

        // 1. Slice segment using ffmpeg
        await sliceVideoSegment(req.file.path, slicePath, startSec, sliceDuration);

        // 2. Generate crisp thumbnail
        await generateThumbnail(slicePath, thumbnailPath, 1.0);

        // 3. Create high-fidelity vision metadata grounded in blueprint feature
        const title = feat?.title || `Tour Walkthrough: ${blueprint.appName} (Take ${i + 1})`;
        const description = feat?.description || `High-definition recorded walkthrough showing ${feat?.title || blueprint.appName} interactions.`;
        const clipEntry = {
          clipId,
          filename: sliceFilename,
          originalName: title,
          filePath: slicePath,
          videoUrl: `/storage/uploads/${sliceFilename}`,
          thumbnailUrl: fs.existsSync(thumbnailPath) ? `/storage/thumbnails/${thumbnailName}` : null,
          title,
          description,
          contentType: 'screen_recording',
          lightingProfile: 'screen_dark',
          keyActions: feat?.editOrActionTrigger ? [feat.editOrActionTrigger, feat.title] : ['Live app walkthrough and feature navigation'],
          suggestedHighlights: feat?.suggestedHighlights || ['center', 'top-right'],
          tags: [blueprint.appName, feat?.title || 'Feature', 'screen_recording', 'walkthrough'].filter(Boolean),
          duration: sliceDuration,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9'
        };

        clipDatabase.push(clipEntry);
        createdClips.push(clipEntry);
        console.log(`[Tour Slicer] ✅ Created clip ${i + 1}/${sliceCount}: "${title}" (${sliceDuration.toFixed(1)}s)`);
      }

      saveClipDatabase();
      console.log(`[Tour Slicer] Successfully cataloged ${createdClips.length} fresh authentic clips from the tour into library.`);
    } catch (sliceErr) {
      console.warn('[Tour Slicer Warning] Failed to slice tour video:', sliceErr.message);
    }

    res.json({ success: true, blueprint, newClips: createdClips });
  } catch (err) {
    console.error('[Blueprint Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear active blueprint
app.delete('/api/blueprint', (req, res) => {
  activeBlueprint = null;
  saveBlueprint();
  console.log('[Blueprint] Blueprint cleared.');
  res.json({ success: true });
});

// -------------------------------------------------------------
// BROWSER RECORDING AGENT (Playwright Screen Capture)
// -------------------------------------------------------------
app.post('/api/record-app', async (req, res) => {
  try {
    const { url, actions, actionNotes, targetDuration, speedMultiplier } = req.body;
    if (!url) return res.status(400).json({ error: 'Target URL is required to record' });

    console.log(`[Record App] Starting Playwright recording of: ${url} (Speed: ${speedMultiplier || 1.25}x, Notes: ${actionNotes || 'none'})`);
    const recResult = await recordAppWorkflow({
      url,
      actions: actions || [],
      actionNotes: actionNotes || '',
      targetDurationSeconds: targetDuration || 8,
      speedMultiplier: speedMultiplier ? Number(speedMultiplier) : 1.25,
      outputDir: uploadsDir
    });

    const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const thumbnailName = `${clipId}.jpg`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

    await generateThumbnail(recResult.filePath, thumbnailPath, 1.0);

    let parsedHostname = 'App Screen';
    try { parsedHostname = new URL(url).hostname; } catch (_) {}

    const visionResult = await analyzeVideoClip({
      filePath: recResult.filePath,
      clipId,
      originalFilename: `Screen Recording (${parsedHostname})`,
      geminiApiKey: req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY,
      workDir: storageDir
    });

    const clipEntry = {
      clipId,
      filename: recResult.filename,
      originalName: `Screen Recording (${parsedHostname})`,
      filePath: recResult.filePath,
      videoUrl: `/storage/uploads/${recResult.filename}`,
      thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
      ...visionResult,
      contentType: 'screen_recording'
    };

    clipDatabase.push(clipEntry);
    saveClipDatabase();
    res.json({ success: true, clip: clipEntry });
  } catch (err) {
    console.error('[Record App Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Autonomous Directive-Driven Multi-Block Scout & Analyzer
app.post('/api/scout-directive-blocks', async (req, res) => {
  try {
    const { url, directive, blockDuration, blockCount, speedMultiplier } = req.body;
    if (!url) return res.status(400).json({ error: 'Target URL is required to scout blocks' });

    const dur = Number(blockDuration) || 6.0;
    const count = Number(blockCount) || 5;
    const speed = speedMultiplier ? Number(speedMultiplier) : 1.25;

    console.log(`[Directive Scout] Slicing ${count} blocks (${dur}s each) at ${url} with directive: "${directive || 'General'}"`);

    const producedClips = await scoutDirectiveBlocks({
      url,
      directive: directive || '',
      clipDuration: dur,
      clipCount: count,
      speedMultiplier: speed,
      outputDir: uploadsDir,
      onProgress: (msg) => console.log(`[Directive Scout Progress] ${msg}`)
    });

    const processedBlocks = [];

    for (let i = 0; i < producedClips.length; i++) {
      const c = producedClips[i];
      const clipId = `clip_scout_${Date.now()}_${i + 1}`;
      const thumbnailName = `${clipId}.jpg`;
      const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

      try {
        await generateThumbnail(c.filePath, thumbnailPath, 1.0);
      } catch (thumbErr) {
        console.warn(`[Directive Scout] Thumbnail warning:`, thumbErr.message);
      }

      // Analyze with Gemini Multimodal Vision + directive context
      const visionResult = await analyzeVideoClip({
        filePath: c.filePath,
        clipId,
        originalFilename: c.title || `Block Take ${i + 1}`,
        geminiApiKey: req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY,
        workDir: storageDir,
        userDirective: directive
      });

      const categoryLetter = visionResult.categoryLetter || (visionResult.blockRole === 'metrics_results' ? 'C' : 'B');
      const catDef = CATEGORY_DEFINITIONS[categoryLetter] || CATEGORY_DEFINITIONS.B;

      // Count existing clips in this bucket to assign code
      const existingInBucket = clipDatabase.filter(item => (item.categoryLetter || item.blockCode?.[0]) === categoryLetter).length;
      const blockCode = `${categoryLetter}${existingInBucket + 1}`;

      const blockEntry = {
        clipId,
        filename: c.filename,
        originalName: c.title || visionResult.title,
        filePath: c.filePath,
        videoUrl: `/storage/uploads/${c.filename}`,
        thumbnailUrl: fs.existsSync(thumbnailPath) ? `/storage/thumbnails/${thumbnailName}` : null,
        ...visionResult,
        blockCode,
        categoryLetter,
        categoryName: catDef.name,
        categoryIcon: catDef.icon,
        categoryColor: catDef.color,
        contentType: 'screen_recording'
      };

      clipDatabase.push(blockEntry);
      processedBlocks.push(blockEntry);
    }

    saveClipDatabase();

    // Sync BLOCK_KEY.txt
    try {
      const enriched = assignBlockTaxonomy(clipDatabase);
      syncProjectKeyFile({
        storageDir,
        projectName: currentProject,
        appUrl: currentAppUrl || url,
        clips: enriched
      });
    } catch (_) {}

    console.log(`[Directive Scout] Finished! Cataloged ${processedBlocks.length} blocks with taxonomy.`);
    res.json({
      success: true,
      count: processedBlocks.length,
      clips: processedBlocks
    });
  } catch (err) {
    console.error('[Directive Scout Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// STOCK B-ROLL (Pexels / Curated Reaction Footage)
// -------------------------------------------------------------
app.get('/api/broll/search', async (req, res) => {
  try {
    const query = req.query.q || 'reaction';
    const apiKey = req.headers['x-pexels-key'] || process.env.PEXELS_API_KEY;
    const results = await searchBrollClips({ query, apiKey });
    res.json({ success: true, results });
  } catch (err) {
    console.error('[B-Roll Search Error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/broll/import', async (req, res) => {
  try {
    const { videoUrl, title } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

    const downloaded = await importBrollClip({ videoUrl, title, outputDir: uploadsDir });

    const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const thumbnailName = `${clipId}.jpg`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

    await generateThumbnail(downloaded.filePath, thumbnailPath, 1.0);

    const visionResult = await analyzeVideoClip({
      filePath: downloaded.filePath,
      clipId,
      originalFilename: title || 'Stock B-Roll Reaction',
      geminiApiKey: req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY,
      workDir: storageDir
    });

    const clipEntry = {
      clipId,
      filename: downloaded.filename,
      originalName: title || 'Stock B-Roll',
      filePath: downloaded.filePath,
      videoUrl: `/storage/uploads/${downloaded.filename}`,
      thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
      ...visionResult,
      contentType: 'live_action'
    };

    clipDatabase.push(clipEntry);
    saveClipDatabase();
    res.json({ success: true, clip: clipEntry });
  } catch (err) {
    console.error('[B-Roll Import Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// INGEST USER OBS TAKES (10/31 Recordings)
// -------------------------------------------------------------
app.post('/api/takes/import-obs', async (req, res) => {
  try {
    console.log('[OBS Import] Ingesting authentic 10/31 OBS takes from C:\\Users\\katyc\\Videos...');
    const userVideosDir = 'C:\\Users\\katyc\\Videos';

    const takesDefinitions = [
      {
        takeFile: '2026-10-31 18-55-29.mp4',
        sliceName: 'user_obs_slice_1.mp4',
        thumbnailName: 'user_obs_slice_1.jpg',
        startSec: 12.0,
        durationSec: 4.5,
        clipId: 'obs_take_1_day1_launcher',
        title: '[B1] Day 1 Simulation Launcher & Learning Mode Selector',
        originalName: 'OBS Take 1: Day 1 Simulation Launcher (10/31)',
        description: 'Authentic 1080p OBS take: Krechet Marketing Academy Day 1 module, selecting between AI-Assisted and Classic Self-Paced modes, launching the real-world client simulation.',
        blockCode: 'B1',
        categoryLetter: 'B',
        blockRole: 'live_demo',
        contentType: 'screen_recording',
        lightingProfile: 'screen_dark',
        keyActions: [
          'Selecting AI-Assisted mode',
          'Reviewing 7-day SEO curriculum',
          'Clicking Launch Day 1 Simulation'
        ],
        tags: ['simulation', 'learning mode', 'day 1', 'krechet academy', 'ai assisted', 'live demo', 'dashboard']
      },
      {
        takeFile: '2026-10-31 18-32-17.mp4',
        sliceName: 'user_obs_slice_2.mp4',
        thumbnailName: 'user_obs_slice_2.jpg',
        startSec: 18.0,
        durationSec: 4.5,
        clipId: 'obs_take_2_sarah_jenkins',
        title: '[B2] Live AI Mentor Sarah Jenkins Mentorship',
        originalName: 'OBS Take 2: Sarah Jenkins AI Instructor (10/31)',
        description: 'Authentic 1080p OBS take: 1-on-1 mentorship session with AI Instructor Sarah Jenkins, delivering real-time tactical feedback on search intent and conversion rate optimization.',
        blockCode: 'B2',
        categoryLetter: 'B',
        blockRole: 'live_demo',
        contentType: 'screen_recording',
        lightingProfile: 'screen_dark',
        keyActions: [
          'Consulting AI mentor Sarah Jenkins',
          'Receiving real-time tactical guidance',
          'Analyzing search intent triggers'
        ],
        tags: ['ai instructor', 'sarah jenkins', 'mentorship', 'tactical advice', 'search intent', 'live demo']
      },
      {
        takeFile: '2026-10-31 18-17-14.mp4',
        sliceName: 'user_obs_slice_3.mp4',
        thumbnailName: 'user_obs_slice_3.jpg',
        startSec: 24.0,
        durationSec: 4.5,
        clipId: 'obs_take_3_client_dossier',
        title: '[B3] Client Onboarding Dossier & Unit Economics',
        originalName: 'OBS Take 3: Jenny\'s Artisan Java Dossier (10/31)',
        description: 'Authentic 1080p OBS take: Jenny\'s Artisan Java client onboarding brief, evaluating monthly revenue targets, customer acquisition costs (CAC), and customer lifetime value (LTV).',
        blockCode: 'B3',
        categoryLetter: 'C',
        blockRole: 'metrics_results',
        contentType: 'screen_recording',
        lightingProfile: 'screen_dark',
        keyActions: [
          'Auditing client revenue goals',
          'Analyzing customer acquisition cost (CAC)',
          'Reviewing client lifetime value (LTV)'
        ],
        tags: ['client dossier', 'jennys artisan java', 'unit economics', 'cac', 'ltv', 'agency simulation', 'metrics']
      },
      {
        takeFile: '2026-10-31 19-04-28.mp4',
        sliceName: 'user_obs_slice_4.mp4',
        thumbnailName: 'user_obs_slice_4.jpg',
        startSec: 32.0,
        durationSec: 4.5,
        clipId: 'obs_take_4_seo_workbench',
        title: '[B4] SEO Workbench CMS H1 & Real-Time Audit Score',
        originalName: 'OBS Take 4: SEO Workbench & CMS Audit (10/31)',
        description: 'Authentic 1080p OBS take: Interactive SEO Workbench CMS editor, updating H1 heading tags and keywords for Jenny\'s Artisan Java and witnessing live audit score recalculation.',
        blockCode: 'B4',
        categoryLetter: 'B',
        blockRole: 'live_demo',
        contentType: 'screen_recording',
        lightingProfile: 'screen_dark',
        keyActions: [
          'Editing website CMS H1 tag',
          'Publishing organic keyword changes',
          'Triggering instant SEO audit score recalculation'
        ],
        tags: ['seo workbench', 'h1 heading', 'cms editor', 'live audit', 'audit score', 'keyword optimization']
      }
    ];

    const importedClips = [];

    for (const def of takesDefinitions) {
      const targetSlicePath = path.join(uploadsDir, def.sliceName);
      const targetThumbPath = path.join(thumbnailsDir, def.thumbnailName);
      const rawSourceVideoPath = path.join(userVideosDir, def.takeFile);

      // If slice does not exist, slice it from user's raw OBS recording
      if (!fs.existsSync(targetSlicePath) && fs.existsSync(rawSourceVideoPath)) {
        console.log(`[OBS Import] Slicing ${def.sliceName} from ${def.takeFile}...`);
        await sliceVideoSegment(rawSourceVideoPath, targetSlicePath, def.startSec, def.durationSec);
      }

      // If thumbnail does not exist, generate it
      if (!fs.existsSync(targetThumbPath) && fs.existsSync(targetSlicePath)) {
        await generateThumbnail(targetSlicePath, targetThumbPath, 1.0);
      }

      const clipEntry = {
        clipId: def.clipId,
        filename: def.sliceName,
        originalName: def.originalName,
        filePath: targetSlicePath,
        videoUrl: `/storage/uploads/${def.sliceName}`,
        thumbnailUrl: `/storage/thumbnails/${def.thumbnailName}`,
        title: def.title,
        description: def.description,
        blockCode: def.blockCode,
        categoryLetter: def.categoryLetter,
        blockRole: def.blockRole,
        contentType: def.contentType,
        lightingProfile: def.lightingProfile,
        keyActions: def.keyActions,
        suggestedHighlights: ['center-modal', 'main-canvas'],
        tags: def.tags,
        duration: def.durationSec,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9'
      };

      // Replace or insert clip
      clipDatabase = clipDatabase.filter(c => c.clipId !== def.clipId && c.filename !== def.sliceName);
      clipDatabase.unshift(clipEntry);
      importedClips.push(clipEntry);
    }

    // Also ensure high-definition Coverr B-roll for Jenny's Artisan Java (coffee) and creative strategy team
    try {
      const coffeeBrollUrl = 'https://cdn.coverr.co/videos/user-ai-generation-deO5gms8XfGa/1080p.mp4';
      const coffeeFilename = 'broll_artisan_coffee_1080p.mp4';
      const coffeeThumbName = 'broll_artisan_coffee_1080p.jpg';
      const coffeeFilePath = path.join(uploadsDir, coffeeFilename);
      const coffeeThumbPath = path.join(thumbnailsDir, coffeeThumbName);

      if (!fs.existsSync(coffeeFilePath)) {
        console.log('[OBS Import] Downloading Coverr artisan coffee B-roll...');
        await importBrollClip({ videoUrl: coffeeBrollUrl, title: 'Artisan Coffee Roasting & Pour', outputDir: uploadsDir });
        const downloadedFiles = fs.readdirSync(uploadsDir).filter(f => f.startsWith('broll_') && f.endsWith('.mp4'));
        if (downloadedFiles.length > 0) {
          const newest = downloadedFiles.map(f => ({ name: f, time: fs.statSync(path.join(uploadsDir, f)).mtimeMs })).sort((a,b) => b.time - a.time)[0];
          fs.copyFileSync(path.join(uploadsDir, newest.name), coffeeFilePath);
        }
      }

      if (fs.existsSync(coffeeFilePath) && !fs.existsSync(coffeeThumbPath)) {
        await generateThumbnail(coffeeFilePath, coffeeThumbPath, 1.0);
      }

      if (fs.existsSync(coffeeFilePath)) {
        const coffeeClip = {
          clipId: 'broll_artisan_coffee_take',
          filename: coffeeFilename,
          originalName: 'Coverr B-Roll: Artisan Coffee Craft',
          filePath: coffeeFilePath,
          videoUrl: `/storage/uploads/${coffeeFilename}`,
          thumbnailUrl: `/storage/thumbnails/${coffeeThumbName}`,
          title: '[A1] Artisan Espresso Extraction & Coffee Craft (Jenny\'s Artisan Java)',
          description: 'High-definition 1080p cinematic B-roll: Fresh artisan coffee beans, barista preparation, and espresso pour for Jenny\'s Artisan Java agency simulation.',
          blockCode: 'A1',
          categoryLetter: 'A',
          blockRole: 'hook_problem',
          contentType: 'live_action',
          lightingProfile: 'natural_warm',
          keyActions: ['Brewing artisan espresso', 'Cinematic coffee pour', 'Visualizing client brand identity'],
          suggestedHighlights: ['full-frame'],
          tags: ['b-roll', 'coffee', 'artisan java', 'hook', 'cinematic', 'live action'],
          duration: 4.5,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9'
        };
        clipDatabase = clipDatabase.filter(c => c.clipId !== coffeeClip.clipId);
        clipDatabase.splice(1, 0, coffeeClip); // insert after Hook
        importedClips.push(coffeeClip);
      }
    } catch (brollErr) {
      console.warn('[OBS Import] Optional coffee B-roll caching warning:', brollErr.message);
    }

    saveClipDatabase();
    console.log(`[OBS Import] Successfully imported ${importedClips.length} blocks into library. Total library size: ${clipDatabase.length}`);
    res.json({ success: true, count: clipDatabase.length, imported: importedClips, allClips: clipDatabase });
  } catch (err) {
    console.error('[OBS Import Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Run Agent Orchestration Pipeline
app.post('/api/orchestrate', async (req, res) => {
  try {
    const {
      userPrompt,
      targetUrl,
      autoRecordScreens = true,
      scriptMode,
      rawScript,
      selectedVoice,
      selectedMusicId,
      enableLightingEffects,
      enableScreenRecordingSpotlight,
      geminiKey,
      deepgramKey
    } = req.body;

    const dialogueEvents = [];
    const progressUpdates = [];

    // Autonomous Gap-Filling: Record live screens from target URL if provided
    const activeUrl = targetUrl || (userPrompt?.match(/https?:\/\/[^\s\]\)]+/i)?.[0]);
    if (activeUrl && (autoRecordScreens || userPrompt?.toLowerCase().includes('record') || userPrompt?.toLowerCase().includes('screen') || userPrompt?.toLowerCase().includes('live'))) {
      try {
        console.log(`[Orchestrator BrowserAgent] Capturing live 1080p demonstration from: ${activeUrl}...`);
        dialogueEvents.push({
          agent: 'BrowserAgent',
          type: 'action',
          message: `Navigating to live application at ${activeUrl} to capture fresh 1080p demonstration blocks...`,
          timestamp: new Date().toISOString()
        });
        progressUpdates.push(`Capturing live 1080p screen recording from ${activeUrl}...`);

        const recResult = await recordAppWorkflow({
          url: activeUrl,
          targetDurationSeconds: 4,
          speedMultiplier: 1.25,
          outputDir: uploadsDir
        });

        const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const thumbnailName = `${clipId}.jpg`;
        const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
        await generateThumbnail(recResult.filePath, thumbnailPath, 1.0);

        let parsedHost = 'Live Application';
        try { parsedHost = new URL(activeUrl).hostname; } catch (_) {}

        const visionResult = await analyzeVideoClip({
          filePath: recResult.filePath,
          clipId,
          originalFilename: `Live Screen (${parsedHost})`,
          geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
          workDir: storageDir
        });

        const newLiveClip = {
          clipId,
          filename: recResult.filename,
          originalName: `Live Screen (${parsedHost})`,
          filePath: recResult.filePath,
          videoUrl: `/storage/uploads/${recResult.filename}`,
          thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
          ...visionResult,
          contentType: 'screen_recording'
        };

        clipDatabase.unshift(newLiveClip);
        saveClipDatabase();

        dialogueEvents.push({
          agent: 'BrowserAgent',
          type: 'finding',
          message: `Recorded and indexed live block: "${newLiveClip.title}" (${newLiveClip.keyActions?.join(', ') || 'demonstration'}).`,
          timestamp: new Date().toISOString()
        });
      } catch (recErr) {
        console.warn('[Orchestrator] Live screen capture warning:', recErr.message);
      }
    }

    if (clipDatabase.length === 0) {
      const fallbackUrl = activeUrl || currentAppUrl || 'https://krechet.academy';
      console.log(`[Orchestrator] Library is empty. BrowserAgent autonomously recording live demo from ${fallbackUrl}...`);
      dialogueEvents.push({
        agent: 'BrowserAgent',
        type: 'action',
        message: `Library empty: Navigating to ${fallbackUrl} to autonomously capture pristine 1080p demonstration blocks...`,
        timestamp: new Date().toISOString()
      });

      try {
        const recordedClips = await recordAppMultiClips({
          url: fallbackUrl,
          clipCount: 3,
          clipDuration: 4.5,
          speedMultiplier: 1.25,
          outputDir: uploadsDir,
          onProgress: (p) => {
            console.log(`[BrowserAgent Progress] ${p}`);
            progressUpdates.push(p);
          }
        });

        let parsedHost = 'Live Application';
        try { parsedHost = new URL(fallbackUrl).hostname; } catch (_) {}

        for (const rc of recordedClips) {
          const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const thumbnailName = `${clipId}.jpg`;
          const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
          await generateThumbnail(rc.filePath, thumbnailPath, 1.0);

          const visionResult = await analyzeVideoClip({
            filePath: rc.filePath,
            clipId,
            originalFilename: rc.title,
            geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
            workDir: storageDir
          });

          const newLiveClip = {
            clipId,
            filename: rc.filename,
            originalName: rc.title,
            filePath: rc.filePath,
            videoUrl: `/storage/uploads/${rc.filename}`,
            thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
            ...visionResult,
            contentType: 'screen_recording'
          };

          clipDatabase.push(newLiveClip);
          dialogueEvents.push({
            agent: 'BrowserAgent',
            type: 'finding',
            message: `Recorded and indexed live block: "${newLiveClip.title}".`,
            timestamp: new Date().toISOString()
          });
        }

        saveClipDatabase();
      } catch (recErr) {
        console.warn('[Orchestrator] Multi-clip recording warning:', recErr.message);
      }
    }

    // Proactive B-roll acquisition: ensure at least one contextual B-roll is available in the library
    const existingBrollClips = clipDatabase.filter(c => c.contentType === 'live_action' && !/match|flame|fire|smoke/i.test(c.title || ''));
    if (existingBrollClips.length === 0) {
      try {
        console.log('[Orchestrator Scout] Library lacks live-action B-roll. Proactively pulling 1080p footage from Coverr...');
        const brollQueries = ['coffee barista espresso', 'digital marketing team'];
        for (const bq of brollQueries) {
          const results = await searchBrollClips({ query: bq, count: 4, apiKey: req.headers['x-pexels-key'] || process.env.PEXELS_API_KEY });
          const clean = (results || []).filter(r => !/match|flame|fire|smoke/i.test(r.title || ''));
          if (clean.length > 0) {
            const pick = clean[0];
            const imported = await importBrollClip({ videoUrl: pick.videoUrl, title: pick.title, clipData: pick, outputDir: uploadsDir });
            const clipId = `clip_broll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const thumbnailName = `${clipId}.jpg`;
            const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
            await generateThumbnail(imported.filePath, thumbnailPath, 1.0);
            const visionResult = await analyzeVideoClip({
              filePath: imported.filePath,
              clipId,
              originalFilename: imported.title,
              geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
              workDir: storageDir
            });
            const brollEntry = {
              clipId,
              filename: imported.filename,
              originalName: imported.title,
              filePath: imported.filePath,
              videoUrl: `/storage/uploads/${imported.filename}`,
              thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
              ...visionResult,
              contentType: 'live_action'
            };
            clipDatabase.push(brollEntry);
            saveClipDatabase();
            dialogueEvents.push({
              agent: 'ScoutAgent',
              type: 'finding',
              message: `Proactively pulled 1080p B-roll from stock site: "${brollEntry.title}".`,
              timestamp: new Date().toISOString()
            });
            break;
          }
        }
      } catch (brollErr) {
        console.warn('[Orchestrator Scout] B-roll acquisition warning:', brollErr.message);
      }
    }

    let musicTrackPath = null;
    if (selectedMusicId && selectedMusicId !== 'none') {
      const candidatePath = path.join(musicDir, selectedMusicId);
      if (fs.existsSync(candidatePath)) musicTrackPath = candidatePath;
    } else if (selectedMusicId !== 'none' && fs.existsSync(defaultSampleMusicPath)) {
      musicTrackPath = defaultSampleMusicPath;
    }

    const orchestrator = new VideoAgentOrchestrator({
      geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
      deepgramApiKey: deepgramKey || process.env.DEEPGRAM_API_KEY,
      audioOutputDir: audioDir,
      onProgress: (p) => {
        console.log(`[Pipeline Progress] ${p}`);
        progressUpdates.push(p);
      },
      onDialogue: (d) => {
        console.log(`[Agent ${d.agent}] (${d.type}): ${d.message}`);
        dialogueEvents.push(d);
      },
      onMissingClipNeeded: async ({ beat, beatIndex, blueprint, usedClipIds, previousClipType }) => {
        const text = `${beat.text} ${beat.visualGoal || ''}`.toLowerCase();
        console.log(`[Autonomous Producer] Synthesizing missing shot for Beat #${beatIndex + 1}: "${beat.text.substring(0, 40)}..."`);
        
        // 1. Interleaving & Fatigue Breakaway:
        // Use B-Roll if beat text mentions human/lifestyle/team/student/career/coffee,
        // OR if previous shot was a screen recording and it's time for fatigue relief (alternating rhythm)!
        const isBrollExplicit = /student|frustrat|tired|confus|agency|career|interview|hire|office|coffee\s*shop|laptop|think|person|human|reaction|doubt|stress|success|proof|team|client/i.test(text);
        const needsFatigueRelief = (previousClipType === 'screen_recording') && (beatIndex === 0 || beatIndex % 2 === 0);
        
        if (isBrollExplicit || needsFatigueRelief) {
          try {
            // First Priority: Reuse existing approved / user-uploaded B-roll from library
            const existingBroll = clipDatabase.find(c => 
              c.contentType === 'live_action' && 
              !usedClipIds.includes(c.clipId) &&
              !/match|flame|fire|smoke/i.test(c.title || '')
            );
            if (existingBroll) {
              console.log(`[Autonomous Producer] Prioritizing approved B-roll from library: "${existingBroll.title}"`);
              return existingBroll;
            }

            console.log(`[Autonomous Producer] Beat #${beatIndex + 1} flagged as B-Roll / Fatigue Breakaway. Sourcing high-quality 1080p footage...`);
            let query = 'digital marketing agency team working';
            if (/coffee|artisan|cafe/i.test(text)) query = 'coffee barista espresso';
            else if (/interview|career|hire|success|proof/i.test(text)) query = 'business meeting professional success';
            else if (/laptop|computer|typing|strategy/i.test(text)) query = 'creative strategist working laptop';

            const results = await searchBrollClips({ query, count: 6, apiKey: req.headers['x-pexels-key'] || process.env.PEXELS_API_KEY });
            // Filter out any irrelevant clips
            const cleanResults = (results || []).filter(r => !/match|flame|fire|smoke/i.test(r.title || ''));
            if (cleanResults.length > 0) {
              const pick = cleanResults.find(r => !usedClipIds.includes(r.id)) || cleanResults[0];
              const imported = await importBrollClip({
                videoUrl: pick.videoUrl,
                title: pick.title,
                clipData: pick,
                targetCategory: 'A',
                outputDir: uploadsDir
              });

              const clipId = `clip_broll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const thumbnailName = `${clipId}.jpg`;
              const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
              await generateThumbnail(imported.filePath, thumbnailPath, 1.0);

              const visionResult = await analyzeVideoClip({
                filePath: imported.filePath,
                clipId,
                originalFilename: imported.title,
                geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
                workDir: storageDir
              });

              const newClip = {
                clipId,
                filename: imported.filename,
                originalName: imported.title,
                filePath: imported.filePath,
                videoUrl: `/storage/uploads/${imported.filename}`,
                thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
                ...visionResult,
                contentType: 'live_action'
              };

              clipDatabase.push(newClip);
              saveClipDatabase();
              dialogueEvents.push({
                agent: 'ScoutAgent',
                type: 'finding',
                message: `Autonomously imported 1080p B-roll: "${newClip.title}" for Beat #${beatIndex + 1}.`,
                timestamp: new Date().toISOString()
              });
              return newClip;
            }
          } catch (brollErr) {
            console.warn('[Autonomous Producer] B-roll search error:', brollErr.message);
          }
        }

        // 2. Is it an Application Demonstration / Screen Recording shot?
        try {
          console.log(`[Autonomous Producer] Beat #${beatIndex + 1} flagged as Screen Recording. Launching Browser Recording Agent with authentic actions...`);
          let targetRoute = 'https://krechet.academy';
          let actionNotes = 'Interactive showcase';
          let actions = [];
          
          if (/seo|website|keyword|studio|h1|headline|audit/i.test(text)) {
            targetRoute = 'https://krechet.academy/seo-simulation/1';
            actionNotes = 'SEO simulation studio H1 edit and publish';
            actions = [
              { type: 'scroll', y: 400 },
              { type: 'click', selector: 'button:has-text("CMS Optimizer")' },
              { type: 'wait', delayMs: 600 },
              { type: 'click', selector: 'button:has-text("Edit Website CMS")' },
              { type: 'wait', delayMs: 600 },
              { type: 'type', selector: 'input[placeholder*="Small-Batch"], input[placeholder*="Organic"]', text: "Artisan Roasted Coffee Beans — 100% Organic", delay: 25 },
              { type: 'wait', delayMs: 400 },
              { type: 'click', selector: 'button:has-text("Publish & Run Analytics")' },
              { type: 'wait', delayMs: 1500 }
            ];
          } else if (/tutorial|lesson|jenny|artisan|learn/i.test(text)) {
            targetRoute = 'https://krechet.academy/tutorials';
            actionNotes = 'Lesson tutorial modules and overview';
            actions = [
              { type: 'click', selector: 'button:has-text("Client Dossier")' },
              { type: 'wait', delayMs: 1200 },
              { type: 'press_key', key: 'Escape' },
              { type: 'scroll', y: 280 },
              { type: 'click', selector: 'button:has-text("Chapter 1.2"), div:has-text("Chapter 1.2")' },
              { type: 'wait', delayMs: 1000 }
            ];
          } else if (/dashboard|metric|analytics|radar/i.test(text)) {
            targetRoute = 'https://krechet.academy/dashboard';
            actionNotes = 'Skills radar and metrics';
            actions = [
              { type: 'cursor_to', selector: 'svg polygon, svg path', delayMs: 500 },
              { type: 'click', selector: 'button:has-text("Skills Radar")' },
              { type: 'wait', delayMs: 600 },
              { type: 'scroll', y: 350 },
              { type: 'click', selector: 'button:has-text("Launch Simulator"), button:has-text("Defend Decisions")' },
              { type: 'wait', delayMs: 1000 }
            ];
          } else {
            actions = [
              { type: 'scroll', y: 320 },
              { type: 'click', selector: 'button:has-text("15 Lessons"), a:has-text("15 Lessons"), a[href*="tutorials"]' },
              { type: 'wait', delayMs: 1200 }
            ];
          }

          dialogueEvents.push({
            agent: 'BrowserAgent',
            type: 'action',
            message: `Autonomously navigating to ${targetRoute} with authentic user interactions for Beat #${beatIndex + 1}...`,
            timestamp: new Date().toISOString()
          });

          const recResult = await recordAppWorkflow({
            url: targetRoute,
            actions,
            actionNotes,
            targetDurationSeconds: 4.5,
            speedMultiplier: 1.25,
            outputDir: uploadsDir
          });

          const clipId = `clip_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const thumbnailName = `${clipId}.jpg`;
          const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
          await generateThumbnail(recResult.filePath, thumbnailPath, 1.0);

          const visionResult = await analyzeVideoClip({
            filePath: recResult.filePath,
            clipId,
            originalFilename: `Live Screen: ${actionNotes}`,
            geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
            workDir: storageDir
          });

          const newScreenClip = {
            clipId,
            filename: recResult.filename,
            originalName: `Live Screen: ${actionNotes}`,
            filePath: recResult.filePath,
            videoUrl: `/storage/uploads/${recResult.filename}`,
            thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
            ...visionResult,
            contentType: 'screen_recording'
          };

          clipDatabase.push(newScreenClip);
          saveClipDatabase();
          dialogueEvents.push({
            agent: 'BrowserAgent',
            type: 'finding',
            message: `Autonomously recorded and indexed fresh block: "${newScreenClip.title}".`,
            timestamp: new Date().toISOString()
          });
          return newScreenClip;
        } catch (recErr) {
          console.warn('[Autonomous Producer] Browser recorder error:', recErr.message);
        }

        return null;
      }
    });

    const edl = await orchestrator.runPipeline({
      userPrompt,
      scriptMode,
      rawScript,
      blueprint: activeBlueprint,
      clips: assignBlockTaxonomy(clipDatabase),
      selectedVoice: selectedVoice || 'aura-orion-en',
      musicTrack: musicTrackPath,
      enableLightingEffects: enableLightingEffects ?? true,
      enableScreenRecordingSpotlight: enableScreenRecordingSpotlight ?? true,
      enableScreenRecordingSpeed: req.body.enableScreenRecordingSpeed ?? true,
      screenRecordingSpeed: req.body.screenRecordingSpeed ? Number(req.body.screenRecordingSpeed) : 1.25
    });

    res.json({
      success: true,
      edl,
      dialogue: dialogueEvents,
      progress: progressUpdates
    });
  } catch (err) {
    console.error('[Orchestration Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Autonomous End-to-End Producer: URL + Goal -> Screen Capture + Reaction B-Roll + Script + Aura Voice + EDL
app.post('/api/autopilot', async (req, res) => {
  try {
    const {
      url,
      goalPrompt,
      selectedVoice = 'aura-orion-en',
      selectedMusicId = 'chill_tech_ambient.mp3',
      geminiKey,
      deepgramKey,
      recordDuration = 8,
      speedMultiplier = 1.25
    } = req.body;

    if (!goalPrompt) {
      return res.status(400).json({ error: 'Video goal or prompt is required.' });
    }

    const dialogueEvents = [];
    const progressUpdates = [];
    const logDialogue = (agent, type, message) => {
      dialogueEvents.push({ agent, type, message, timestamp: new Date().toISOString() });
      console.log(`[AutoPilot ${agent}] ${message}`);
    };
    const logProgress = (msg) => {
      progressUpdates.push(msg);
      console.log(`[AutoPilot] ${msg}`);
    };

    logDialogue('Showrunner', 'insight', 'Autonomous Studio activated: Preparing full video production from URL and Goal.');

    const newClipsAdded = [];

    // 1. Autonomous Screen Recording (if URL provided)
    if (url && url.startsWith('http')) {
      logProgress(`Launching Playwright agent to record targeted micro-clips at ${url}...`);
      logDialogue('BrowserAgent', 'action', `Recording multiple 1080p micro-cuts across key page sections...`);
      try {
        const microResults = await recordAppMultiClips({
          url,
          clipCount: 3, // 3 distinct micro-clips (Hero, Simulation Workshop, Portfolio & Certification)
          clipDuration: recordDuration || 3.5,
          speedMultiplier: speedMultiplier ? Number(speedMultiplier) : 1.25,
          outputDir: uploadsDir,
          onProgress: (p) => logProgress(p)
        });

        for (const rec of microResults) {
          const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const thumbnailName = `${clipId}.jpg`;
          const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
          await generateThumbnail(rec.filePath, thumbnailPath, 1.0);

          let parsedHost = 'App Showcase';
          try { parsedHost = new URL(url).hostname; } catch (_) {}

          const visionResult = await analyzeVideoClip({
            filePath: rec.filePath,
            clipId,
            originalFilename: `${rec.title} (${parsedHost})`,
            geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
            workDir: storageDir
          });

          const screenClip = {
            clipId,
            filename: rec.filename,
            originalName: `${rec.title} (${parsedHost})`,
            filePath: rec.filePath,
            videoUrl: `/storage/uploads/${rec.filename}`,
            thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
            ...visionResult,
            title: rec.title,
            tags: [...(rec.tags || []), ...(visionResult.tags || [])],
            contentType: 'screen_recording'
          };

          clipDatabase.push(screenClip);
          saveClipDatabase();
          newClipsAdded.push(screenClip);
          logDialogue('BrowserAgent', 'agreement', `Recorded micro-clip: "${rec.title}" (${rec.duration.toFixed(1)}s).`);
        }
      } catch (recErr) {
        console.warn('[AutoPilot] Screen recording warning:', recErr.message);
        logDialogue('BrowserAgent', 'insight', `Note: Live screen recording skipped: ${recErr.message}. Proceeding with existing clips.`);
      }
    }

    // 2. Intelligent Stock B-Roll Acquisition
    logDialogue('ScoutAgent', 'action', 'Analyzing goal prompt for emotional reaction footage...');
    const goalLower = goalPrompt.toLowerCase();
    
    // Choose relevant B-Roll reactions based on narrative needs
    const candidateKeywords = [];
    if (goalLower.includes('fail') || goalLower.includes('lecture') || goalLower.includes('theory') || goalLower.includes('trust') || goalLower.includes('no one') || goalLower.includes('boring')) {
      candidateKeywords.push('shaking head');
    }
    if (goalLower.includes('job') || goalLower.includes('interview') || goalLower.includes('employer') || goalLower.includes('career')) {
      candidateKeywords.push('interview');
    }
    if (goalLower.includes('portfolio') || goalLower.includes('cert') || goalLower.includes('hire') || goalLower.includes('success')) {
      candidateKeywords.push('hired');
    }
    if (candidateKeywords.length === 0) candidateKeywords.push('simulation');

    for (const kw of candidateKeywords.slice(0, 2)) {
      try {
        const results = await searchBrollClips({ query: kw, apiKey: req.headers['x-pexels-key'] || process.env.PEXELS_API_KEY });
        if (results && results.length > 0) {
          const chosenBroll = results[0];
          const imported = await importBrollClip({ videoUrl: chosenBroll.videoUrl, title: chosenBroll.title, outputDir: uploadsDir });
          
          const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const thumbnailName = `${clipId}.jpg`;
          const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
          await generateThumbnail(imported.filePath, thumbnailPath, 1.0);

          const visionResult = await analyzeVideoClip({
            filePath: imported.filePath,
            clipId,
            originalFilename: imported.title,
            geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
            workDir: storageDir
          });

          const brollClipEntry = {
            clipId,
            filename: imported.filename,
            originalName: imported.title,
            filePath: imported.filePath,
            videoUrl: `/storage/uploads/${imported.filename}`,
            thumbnailUrl: `/storage/thumbnails/${thumbnailName}`,
            ...visionResult,
            contentType: 'live_action'
          };

          clipDatabase.push(brollClipEntry);
          saveClipDatabase();
          newClipsAdded.push(brollClipEntry);
          logDialogue('ScoutAgent', 'agreement', `Imported stock reaction clip: "${imported.title}".`);
        }
      } catch (brollErr) {
        console.warn(`[AutoPilot] Stock B-Roll import warning for "${kw}":`, brollErr.message);
      }
    }

    // 3. Multi-Agent Orchestration (Script, Voice, Direction)
    let musicTrackPath = null;
    if (selectedMusicId && selectedMusicId !== 'none') {
      const candidatePath = path.join(musicDir, selectedMusicId);
      if (fs.existsSync(candidatePath)) musicTrackPath = candidatePath;
    } else if (fs.existsSync(defaultSampleMusicPath)) {
      musicTrackPath = defaultSampleMusicPath;
    }

    const orchestrator = new VideoAgentOrchestrator({
      geminiApiKey: geminiKey || process.env.GEMINI_API_KEY,
      deepgramApiKey: deepgramKey || process.env.DEEPGRAM_API_KEY,
      audioOutputDir: audioDir,
      onProgress: (p) => {
        logProgress(p);
      },
      onDialogue: (d) => {
        dialogueEvents.push(d);
      }
    });

    logDialogue('ScreenplayAgent', 'action', 'Crafting persuasive spoken beats and hooks...');

    const edl = await orchestrator.runPipeline({
      userPrompt: goalPrompt,
      scriptMode: 'rewrite',
      rawScript: goalPrompt,
      clips: clipDatabase,
      selectedVoice: selectedVoice,
      musicTrack: musicTrackPath,
      enableLightingEffects: true,
      enableScreenRecordingSpotlight: true,
      enableScreenRecordingSpeed: true,
      screenRecordingSpeed: speedMultiplier ? Number(speedMultiplier) : 1.25
    });

    logDialogue('Showrunner', 'agreement', `Production assembly complete! Created ${edl.clips.length}-scene storyboard with Aura voiceover.`);

    res.json({
      success: true,
      newClips: newClipsAdded,
      allClips: clipDatabase,
      edl,
      dialogue: dialogueEvents,
      progress: progressUpdates
    });
  } catch (err) {
    console.error('[AutoPilot Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Render final timeline using FFmpeg
app.post('/api/render', async (req, res) => {
  try {
    const { edl } = req.body;
    if (!edl || !edl.clips || edl.clips.length === 0) {
      return res.status(400).json({ error: 'Invalid EDL provided for rendering.' });
    }

    const renderId = `render_${Date.now()}`;
    const outputFilename = `${renderId}.mp4`;
    const outputPath = path.join(rendersDir, outputFilename);

    console.log(`[Render] Starting FFmpeg assembly for ${edl.clips.length} clips...`);

    await renderTimeline({
      clips: edl.clips,
      voiceoverAudioPath: edl.voiceoverAudioPath,
      musicAudioPath: edl.musicTrack,
      musicVolume: 0.15,
      outputPath,
      onProgress: (p) => console.log(`[Render Progress] ${p}`)
    });

    const meta = await getVideoMetadata(outputPath);

    res.json({
      success: true,
      renderId,
      videoUrl: `/storage/renders/${outputFilename}`,
      duration: meta.duration,
      width: meta.width,
      height: meta.height
    });
  } catch (err) {
    console.error('[Render Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Add or replace voiceover audio on an existing rendered video without re-rendering clips
app.post('/api/add-voiceover', async (req, res) => {
  try {
    const { videoUrl, voiceoverText, selectedVoice, selectedMusicId } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'Source video URL is required.' });
    if (!voiceoverText?.trim() && (!selectedMusicId || selectedMusicId === 'none')) {
      return res.status(400).json({ error: 'Please provide either voiceover text or a music track to apply.' });
    }

    // Resolve source video path
    const filename = path.basename(videoUrl);
    let videoPath = path.join(rendersDir, filename);
    if (!fs.existsSync(videoPath)) {
      videoPath = path.join(uploadsDir, filename);
    }
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: `Video file not found: ${filename}` });
    }

    let voiceAudioPath = null;
    let voiceDuration = 0;
    if (voiceoverText && voiceoverText.trim()) {
      console.log(`[Add Voiceover] Generating audio for: "${voiceoverText.trim().substring(0, 40)}..."`);
      const voiceRes = await generateVoiceover({
        text: voiceoverText.trim(),
        voice: selectedVoice || 'aura-orion-en',
        apiKey: process.env.DEEPGRAM_API_KEY,
        outputDir: audioDir
      });
      voiceAudioPath = voiceRes.audioPath;
      voiceDuration = voiceRes.duration;
    }

    // 2. Resolve background music
    let musicTrackPath = null;
    if (selectedMusicId && selectedMusicId !== 'none') {
      const candidatePath = path.join(musicDir, selectedMusicId);
      if (fs.existsSync(candidatePath)) musicTrackPath = candidatePath;
    } else if (selectedMusicId !== 'none' && fs.existsSync(defaultSampleMusicPath)) {
      musicTrackPath = defaultSampleMusicPath;
    }

    // 3. Overlay Audio onto Video
    const newFilename = `remixed_${Date.now()}_${filename}`;
    const outputPath = path.join(rendersDir, newFilename);

    await addVoiceoverToVideo({
      videoPath,
      voiceoverAudioPath: voiceAudioPath,
      musicAudioPath: musicTrackPath,
      musicVolume: voiceAudioPath ? 0.28 : 0.6,
      outputPath
    });

    const meta = await getVideoMetadata(outputPath);

    res.json({
      success: true,
      videoUrl: `/storage/renders/${newFilename}`,
      duration: meta.duration,
      voiceoverDuration: voiceDuration
    });
  } catch (err) {
    console.error('[Add Voiceover Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Apply Timestamped Edit Instructions to Re-Master a Video
app.post('/api/video-feedback/apply', async (req, res) => {
  try {
    const {
      videoUrl,
      edits = [],
      selectedVoice = 'aura-orion-en',
      selectedMusicId = 'chill_tech_ambient.mp3',
      geminiKey,
      deepgramKey
    } = req.body;

    if (!videoUrl) return res.status(400).json({ error: 'Source video URL is required.' });

    // 1. Resolve source video path
    const filename = path.basename(videoUrl);
    let videoPath = path.join(rendersDir, filename);
    if (!fs.existsSync(videoPath)) videoPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: `Video file not found: ${filename}` });
    }

    const meta = await getVideoMetadata(videoPath);
    const duration = meta?.duration || 40;

    console.log(`[EditDirector] Processing ${edits.length} timestamped edits for ${filename} (~${duration.toFixed(1)}s)...`);

    // 2. Synthesize new narration text taking all edits into account
    let revisedScript = '';

    const effectiveGeminiKey = geminiKey || process.env.GEMINI_API_KEY;
    if (effectiveGeminiKey && edits.length > 0) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });

        const editsSummary = edits.map(e => `[Timestamp: ${e.timecode || e.timestamp + 's'}] (${e.category}): ${e.instruction}`).join('\n');

        const prompt = `You are an elite video director and master SaaS copywriter for Krechet Marketing Academy.
The user is reviewing a ~${Math.round(duration)}-second product demo video and submitted the following timestamped edit requests:

${editsSummary}

INSTRUCTIONS:
1. Write a complete, high-converting spoken narration script for this ~${Math.round(duration)}-second video that precisely incorporates and honors all the user's edits at the specified timestamps.
2. If the user noted the voice was robotic, ensure the tone is deeply conversational, human, punchy, and confident (like an experienced agency founder speaking to a peer).
3. Do NOT include bracketed tags like [00:14], timestamps, or stage directions. Output ONLY the exact spoken human script.
4. Keep the length appropriate to speak in ~${Math.min(Math.round(duration - 4), 38)} seconds (around 70 to 110 words total).`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt
        });

        revisedScript = response.text ? response.text.trim() : '';
        console.log(`[EditDirector] Gemini generated revised script: "${revisedScript.substring(0, 60)}..."`);
      } catch (geminiErr) {
        console.warn('[EditDirector] Gemini script rewrite warning:', geminiErr.message);
      }
    }

    // Fallback if no revised script was generated
    if (!revisedScript) {
      const scriptEdits = edits.filter(e => e.category === 'script' || e.instruction.toLowerCase().includes('say') || e.instruction.toLowerCase().includes('change to'));
      if (scriptEdits.length > 0) {
        revisedScript = scriptEdits.map(e => e.instruction.replace(/^(change words to|say|speak):?\s*/i, '')).join(' ');
      } else {
        revisedScript = "This is Krechet Academy. Meet your first real-world agency client, Jenny Miller. Her coffee roastery is bleeding twenty-eight dollars just to sell an eighteen dollar bag of beans, and it is your job to fix it. Step into the agency role, audit the unit economics, and build live ad campaigns from day one. Chat directly with simulated business owners, fix their customer acquisition cost, and graduate with a verified portfolio. Start your free trial today at Krechet dot Academy.";
      }
    }

    // 3. Generate high-fidelity Deepgram Aura voiceover (natural, non-robotic!)
    console.log(`[EditDirector] Synthesizing Deepgram voiceover with voice: ${selectedVoice}...`);
    const effectiveDeepgramKey = deepgramKey || process.env.DEEPGRAM_API_KEY;
    const voiceRes = await generateVoiceover({
      text: revisedScript,
      voice: selectedVoice || 'aura-orion-en',
      apiKey: effectiveDeepgramKey,
      outputDir: audioDir
    });

    // 4. Resolve background music
    let musicTrackPath = path.join(musicDir, 'chill_tech_ambient.mp3');
    if (selectedMusicId && selectedMusicId !== 'none') {
      const candidate = path.join(musicDir, selectedMusicId);
      if (fs.existsSync(candidate)) musicTrackPath = candidate;
    }

    // 5. Mix Voiceover + Ducked Music onto Video
    const newFilename = `mastered_edits_${Date.now()}_${filename}`;
    const outputPath = path.join(rendersDir, newFilename);

    await addVoiceoverToVideo({
      videoPath,
      voiceoverAudioPath: voiceRes.audioPath,
      musicAudioPath: musicTrackPath,
      musicVolume: 0.22,
      outputPath
    });

    const newMeta = await getVideoMetadata(outputPath);

    res.json({
      success: true,
      updatedVideoUrl: `/storage/renders/${newFilename}`,
      duration: newMeta?.duration || duration,
      revisedScript
    });
  } catch (err) {
    console.error('[Video Feedback Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Agentic Master TOFU Video Generator
app.post('/api/generate-premium-tofu', async (req, res) => {
  try {
    const {
      selectedVoice = 'flux-wade-en',
      selectedMusicId = 'cycles_upbeat_inspiration.mp3',
      geminiKey,
      deepgramKey
    } = req.body;

    const result = await producePremiumTofuVideo({
      storageDir,
      rendersDir,
      audioDir,
      musicDir,
      selectedVoice,
      selectedMusicId,
      geminiKey,
      deepgramKey
    });

    res.json({
      success: true,
      videoUrl: result.url,
      duration: result.duration,
      sizeMb: result.sizeMb,
      title: result.title
    });
  } catch (err) {
    console.error('[Generate Premium TOFU Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate AI Master Voiceover Script from user prompt
app.post('/api/generate-master-script', async (req, res) => {
  try {
    const { prompt, totalDuration = 60, partsCount = 4, geminiKey } = req.body;
    const key = geminiKey || process.env.GEMINI_API_KEY;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Please enter a prompt or notes for the script.' });
    }

    if (key) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const targetWords = Math.max(30, Math.min(250, Math.round((totalDuration || 60) * 2.2)));
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `You are an expert video director. The user is directing a ${partsCount}-part master video (~${Math.round(totalDuration)} seconds).
Transform the user's notes/prompt into an engaging, natural spoken voiceover script of around ${targetWords} words.
The narration must flow smoothly from hook, to practical workflow, to key advantages, to call to action.
Do not include stage directions like "(Upbeat music)" or "(Cut to)". Return ONLY the spoken words.

User notes: "${prompt.trim()}"`
        });

        const scriptText = response.text ? response.text.trim() : '';
        if (scriptText) {
          return res.json({ success: true, script: scriptText });
        }
      } catch (genErr) {
        console.warn('[Script Generation Warning]', genErr.message);
      }
    }

    // High quality offline fallback expansion
    const expanded = `Welcome to Krechet Academy. ${prompt.trim().replace(/^welcome to [^.]+\./i, '')} Learn by executing live digital marketing campaigns with real clients and modern AI workflows. Build your portfolio, master practical automation, and future-proof your career today.`;
    res.json({ success: true, script: expanded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stitch multiple rendered parts (e.g. Part 1, Part 2, Part 3) into a single unified master film
app.post('/api/stitch-parts', async (req, res) => {
  try {
    const { partUrls, selectedMusicId, voiceoverText, selectedVoice, voiceoverMode, geminiKey } = req.body;
    if (!partUrls || !Array.isArray(partUrls) || partUrls.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one part URL to stitch.' });
    }

    // Resolve local filepaths from URLs
    const videoPaths = partUrls.map(u => {
      const filename = path.basename(u);
      return path.join(rendersDir, filename);
    }).filter(p => fs.existsSync(p));

    if (videoPaths.length === 0) {
      return res.status(400).json({ error: 'Could not find the rendered part files on disk.' });
    }

    const masterFilename = `master_stitched_${Date.now()}.mp4`;
    const masterPath = path.join(rendersDir, masterFilename);

    let musicPath = null;
    if (selectedMusicId && selectedMusicId !== 'none' && selectedMusicId !== 'preserve') {
      const candidate = path.join(musicDir, selectedMusicId);
      if (fs.existsSync(candidate)) musicPath = candidate;
    } else if (selectedMusicId !== 'none' && selectedMusicId !== 'preserve' && fs.existsSync(defaultSampleMusicPath)) {
      musicPath = defaultSampleMusicPath;
    }

    console.log(`[Stitcher] Stitching ${videoPaths.length} parts into ${masterFilename}...`);
    await stitchVideoParts({
      videoPaths,
      musicAudioPath: voiceoverText && voiceoverText.trim() ? null : musicPath, // If adding voiceover, let addVoiceoverToVideo mix music with ducking
      outputPath: masterPath,
      onProgress: (p) => console.log(`[Stitch Progress] ${p}`)
    });

    let finalVideoPath = masterPath;
    let finalVideoUrl = `/storage/renders/${masterFilename}`;
    let voiceoverDuration = 0;

    // If Master Voiceover Script was requested, attach it directly!
    if (voiceoverText && voiceoverText.trim()) {
      let textToSpeak = voiceoverText.trim();
      const metaTemp = await getVideoMetadata(masterPath);

      // If AI generation mode requested
      if (voiceoverMode === 'ai_generate') {
        const key = geminiKey || process.env.GEMINI_API_KEY;
        if (key) {
          try {
            const ai = new GoogleGenAI({ apiKey: key });
            const targetWords = Math.max(30, Math.min(250, Math.round(metaTemp.duration * 2.2)));
            const aiRes = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: `Write an engaging spoken voiceover script (~${targetWords} words) across ${videoPaths.length} scenes (~${Math.round(metaTemp.duration)}s) based on: "${textToSpeak}". Do not include bracketed tags like [Part 1] or stage directions. Return ONLY the spoken text.`
            });
            if (aiRes.text && aiRes.text.trim()) textToSpeak = aiRes.text.trim();
          } catch (_) {}
        }
      }

      // Check if user specifically structured script by [Part 1], [Part 2], [Scene 1]...
      const partSections = parsePartSections(textToSpeak);
      let masterVoiceAudioPath = null;

      if (partSections && Object.keys(partSections).length > 0) {
        console.log(`[Stitcher] Found explicit scene markers: ${Object.keys(partSections).map(k => `Part ${k}`).join(', ')}. Generating timed per-part voiceover without speaking markers...`);
        const partDurations = [];
        for (const vp of videoPaths) {
          try {
            const m = await getVideoMetadata(vp);
            partDurations.push(m.duration || 15);
          } catch (_) {
            partDurations.push(15);
          }
        }

        let currentOffsetSec = 0;
        const timedClips = [];

        for (let i = 0; i < videoPaths.length; i++) {
          const partNum = i + 1;
          const sectionText = partSections[partNum] || partSections[String(partNum)];
          if (sectionText && sectionText.trim()) {
            const voRes = await generateVoiceover({
              text: sectionText, // Cleaned: markers like [Part 1] already stripped
              voice: selectedVoice || 'aura-orion-en',
              apiKey: process.env.DEEPGRAM_API_KEY,
              outputDir: audioDir
            });
            timedClips.push({
              audioPath: voRes.audioPath,
              delayMs: Math.round(currentOffsetSec * 1000)
            });
          }
          currentOffsetSec += partDurations[i];
        }

        if (timedClips.length > 0) {
          const timedVoFilename = `timed_vo_${Date.now()}.mp3`;
          const timedVoPath = path.join(audioDir, timedVoFilename);

          if (timedClips.length === 1 && timedClips[0].delayMs === 0) {
            masterVoiceAudioPath = timedClips[0].audioPath;
          } else {
            const ffmpegStatic = (await import('ffmpeg-static')).default;
            const { execFile } = await import('child_process');
            const inputs = [];
            const filterParts = [];
            const mixLabels = [];

            timedClips.forEach((clip, idx) => {
              inputs.push('-i', clip.audioPath);
              filterParts.push(`[${idx}:a]adelay=${clip.delayMs}|${clip.delayMs}[a${idx}]`);
              mixLabels.push(`[a${idx}]`);
            });

            const filterComplex = `${filterParts.join(';')};${mixLabels.join('')}amix=inputs=${timedClips.length}:dropout_transition=0:normalize=0[aout]`;
            const args = ['-nostdin', ...inputs, '-filter_complex', filterComplex, '-map', '[aout]', '-c:a', 'libmp3lame', '-y', timedVoPath];

            await new Promise((resTimed, rejTimed) => {
              execFile(ffmpegStatic, args, (err) => {
                if (err) return rejTimed(err);
                resTimed();
              });
            });
            masterVoiceAudioPath = timedVoPath;
          }
        }
      }

      if (!masterVoiceAudioPath) {
        // Continuous smooth narration across all parts
        console.log(`[Stitcher] Generating smooth continuous voiceover (~${metaTemp.duration}s)...`);
        const voiceRes = await generateVoiceover({
          text: sanitizeVoiceoverText(textToSpeak),
          voice: selectedVoice || 'aura-orion-en',
          apiKey: process.env.DEEPGRAM_API_KEY,
          outputDir: audioDir
        });
        masterVoiceAudioPath = voiceRes.audioPath;
        voiceoverDuration = voiceRes.duration;
      }

      const voicedFilename = `master_voiced_${Date.now()}.mp4`;
      const voicedPath = path.join(rendersDir, voicedFilename);

      await addVoiceoverToVideo({
        videoPath: masterPath,
        voiceoverAudioPath: masterVoiceAudioPath,
        musicAudioPath: musicPath,
        musicVolume: 0.28,
        outputPath: voicedPath
      });

      finalVideoPath = voicedPath;
      finalVideoUrl = `/storage/renders/${voicedFilename}`;
    }

    const meta = await getVideoMetadata(finalVideoPath);

    res.json({
      success: true,
      videoUrl: finalVideoUrl,
      duration: meta.duration,
      voiceoverDuration,
      width: meta.width,
      height: meta.height,
      partsCount: videoPaths.length
    });
  } catch (err) {
    console.error('[Stitch Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// STAGES 1 - 4: Knowledge Blocks & Semantic Intelligence Layer Endpoints
// ----------------------------------------------------------------------------

app.get('/api/knowledge/blocks', (req, res) => {
  try {
    const blocks = loadKnowledgeBlocks();
    res.json({
      success: true,
      count: blocks.length,
      blocks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/knowledge/graph', (req, res) => {
  res.json({
    success: true,
    graph: KNOWLEDGE_GRAPH
  });
});

app.post('/api/knowledge/search', async (req, res) => {
  try {
    const { query, limit = 5, minScore = 40 } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    const blocks = loadKnowledgeBlocks();
    const results = await searchKnowledgeBlocksSemantic({
      query,
      blocks,
      limit,
      minScore,
      geminiApiKey: process.env.GEMINI_API_KEY
    });
    res.json({
      success: true,
      query,
      count: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/knowledge/ingest-video', async (req, res) => {
  try {
    const { videoFilePath, videoId, sourceName } = req.body;
    if (!videoFilePath || !fs.existsSync(videoFilePath)) {
      return res.status(400).json({ error: `Video file not found: ${videoFilePath}` });
    }

    console.log(`[API Ingest] Ingesting video: ${videoFilePath}`);
    const deepAnalysis = await analyzeDeepVideo({
      videoFilePath,
      videoId: videoId || `video_${Date.now()}`,
      sourceName: sourceName || path.basename(videoFilePath),
      workDir: storageDir,
      geminiApiKey: process.env.GEMINI_API_KEY,
      deepgramApiKey: process.env.DEEPGRAM_API_KEY
    });

    const blocks = await createKnowledgeBlocksFromAnalysis({
      deepAnalysis,
      uploadsDir,
      thumbnailsDir,
      geminiApiKey: process.env.GEMINI_API_KEY
    });

    res.json({
      success: true,
      sourceName: deepAnalysis.sourceName,
      duration: deepAnalysis.duration,
      blocksCreated: blocks.length,
      blocks
    });
  } catch (err) {
    console.error('[API Ingest Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// STAGES 5 - 10: Story Composer & Master Demo Generator
// ----------------------------------------------------------------------------

app.post('/api/composer/generate-story', async (req, res) => {
  try {
    const {
      userPrompt,
      targetDurationCategory = 'master_demo',
      selectedVoice = 'aura-orion-en',
      musicTrack = 'chill_tech_ambient.mp3'
    } = req.body;

    let bgMusicPath = null;
    if (musicTrack) {
      const candidate = path.join(musicDir, musicTrack);
      if (fs.existsSync(candidate)) bgMusicPath = candidate;
    }

    console.log(`[API Composer] Generating Master Demo for prompt: "${userPrompt || 'Krechet Master Demo'}" (${targetDurationCategory})...`);

    const result = await composeAndRenderMasterDemo({
      userPrompt,
      targetDurationCategory,
      selectedVoice,
      backgroundMusicPath: bgMusicPath,
      geminiApiKey: process.env.GEMINI_API_KEY,
      deepgramApiKey: process.env.DEEPGRAM_API_KEY,
      pexelsApiKey: process.env.PEXELS_API_KEY,
      uploadsDir,
      audioDir,
      rendersDir,
      existingClips: clipDatabase,
      onProgress: (msg) => console.log(`[StoryComposer Progress] ${msg}`),
      onLog: (agent, role, message, type) => console.log(`[StoryComposer][${agent}] ${message}`)
    });

    res.json(result);
  } catch (err) {
    console.error('[API Composer Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Dynamic AI Client Persona Chat (Realism & Versatility)
// ----------------------------------------------------------------------------

app.get('/api/simulation/client-personas', (req, res) => {
  res.json({
    success: true,
    personas: Object.values(CLIENT_PERSONAS)
  });
});

app.post('/api/simulation/client-chat', async (req, res) => {
  try {
    const { clientId = 'jennys_artisan_java', studentMessage, conversationHistory = [] } = req.body;
    if (!studentMessage) {
      return res.status(400).json({ error: 'studentMessage is required' });
    }

    const result = await chatWithClientPersona({
      clientId,
      studentMessage,
      conversationHistory,
      geminiApiKey: process.env.GEMINI_API_KEY
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('[Client Persona Chat Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Commercial Director API (Gemini Omni AI + Interactive Polish Loop)
// ----------------------------------------------------------------------------

app.post('/api/commercial/plan', async (req, res) => {
  try {
    const { goal, targetDuration = 60 } = req.body;
    const plan = await planCommercial({
      goal,
      targetDuration,
      apiKey: process.env.GEMINI_API_KEY
    });
    res.json({ success: true, plan });
  } catch (err) {
    console.error('[Commercial Plan Error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/commercial/refine', async (req, res) => {
  try {
    const { currentPlan, feedbackPrompt } = req.body;
    if (!currentPlan || !feedbackPrompt) {
      return res.status(400).json({ error: 'currentPlan and feedbackPrompt are required' });
    }
    const updatedPlan = await refineCommercial({
      currentPlan,
      feedbackPrompt,
      apiKey: process.env.GEMINI_API_KEY
    });
    res.json({ success: true, plan: updatedPlan });
  } catch (err) {
    console.error('[Commercial Refine Error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/commercial/generate', async (req, res) => {
  try {
    const { plan, voiceId = 'aura-orion-en', musicTrack = 'chill_tech_ambient.mp3' } = req.body;
    if (!plan || !plan.scenes || plan.scenes.length === 0) {
      return res.status(400).json({ error: 'Valid commercial plan with scenes is required' });
    }

    const result = await produceCommercialVideo({
      plan,
      voiceId,
      musicTrack,
      onProgress: (msg) => console.log(`[Commercial Pipeline] ${msg}`)
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Commercial Generate Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Get latest rendered commercial
app.get('/api/commercial/latest', async (req, res) => {
  try {
    if (!fs.existsSync(rendersDir)) {
      return res.json({ success: false, error: 'No renders directory found' });
    }
    const files = fs.readdirSync(rendersDir)
      .filter(f => f.endsWith('.mp4') && (f.startsWith('commercial_') || f.startsWith('krechet_commercial_')))
      .map(f => {
        const full = path.join(rendersDir, f);
        try {
          const stat = fs.statSync(full);
          return { name: f, full, mtime: stat.mtimeMs, size: stat.size };
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean)
      .filter(f => f.size > 500000)
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return res.json({ success: false, error: 'No commercial rendered yet' });
    }

    const latest = files[0];
    const meta = await getVideoMetadata(latest.full);

    // Look up matching storyboard plan.json & voiceId if available
    let latestPlan = null;
    let latestVoiceId = 'aura-angus-en';
    try {
      const idMatch = latest.name.match(/commercial_(\d+)\.mp4/);
      if (idMatch) {
        const buildDir = path.join(rendersDir, `commercial_build_${idMatch[1]}`);
        const planPath = path.join(buildDir, 'plan.json');
        const buildMetaPath = path.join(buildDir, 'meta.json');
        if (fs.existsSync(planPath)) {
          latestPlan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
        }
        if (fs.existsSync(buildMetaPath)) {
          const bm = JSON.parse(fs.readFileSync(buildMetaPath, 'utf8'));
          if (bm.voiceId) latestVoiceId = bm.voiceId;
        }
      }
      if (!latestPlan) {
        const fallbackPlan = path.join(storageDir, 'last_commercial_plan.json');
        if (fs.existsSync(fallbackPlan)) {
          latestPlan = JSON.parse(fs.readFileSync(fallbackPlan, 'utf8'));
        }
      }
    } catch (_) {}

    res.json({
      success: true,
      filename: latest.name,
      renderUrl: `/storage/renders/${latest.name}`,
      duration: meta.duration,
      plan: latestPlan,
      voiceId: latestVoiceId
    });
  } catch (err) {
    console.error('[Commercial Latest Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Segment In/Out Trimming & Gemini Omni Transform API
// ----------------------------------------------------------------------------

app.post('/api/segment/slice', async (req, res) => {
  try {
    const { videoUrl, startTime = 0, endTime = 5, label = 'Sliced Segment' } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

    const filename = path.basename(videoUrl);
    let srcPath = path.join(rendersDir, filename);
    if (!fs.existsSync(srcPath)) srcPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(srcPath)) {
      return res.status(404).json({ error: `Video file not found: ${filename}` });
    }

    const startSec = Math.max(0, parseFloat(startTime) || 0);
    const endSec = parseFloat(endTime) || (startSec + 5);
    const durationSec = Math.max(0.5, endSec - startSec);

    const sliceId = `slice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const outFilename = `${sliceId}.mp4`;
    const outPath = path.join(uploadsDir, outFilename);
    const thumbFilename = `${sliceId}.jpg`;
    const thumbPath = path.join(thumbnailsDir, thumbFilename);

    await trimSegment({
      inputPath: srcPath,
      outputPath: outPath,
      startSec,
      durationSec,
      keepAudio: true
    });

    await generateThumbnail(outPath, thumbPath, 0.5);
    const meta = await getVideoMetadata(outPath);

    const newClip = {
      id: sliceId,
      filename: outFilename,
      originalName: `${label} (${startSec.toFixed(1)}s - ${endSec.toFixed(1)}s)`,
      filePath: outPath,
      videoUrl: `/storage/uploads/${outFilename}`,
      thumbnailUrl: `/storage/thumbnails/${thumbFilename}`,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      aspectRatio: meta.aspectRatio,
      hasAudio: meta.hasAudio,
      sizeBytes: meta.sizeBytes,
      createdAt: Date.now()
    };

    clipDatabase.unshift(newClip);
    saveClipDatabase();

    res.json({
      success: true,
      clip: newClip,
      videoUrl: `/storage/uploads/${outFilename}`
    });
  } catch (err) {
    console.error('[Segment Slice Error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/segment/omni-transform', async (req, res) => {
  try {
    const { videoUrl, startTime = 0, endTime = 5, prompt } = req.body;
    if (!videoUrl || !prompt) {
      return res.status(400).json({ error: 'videoUrl and prompt are required' });
    }

    const filename = path.basename(videoUrl);
    let srcPath = path.join(rendersDir, filename);
    if (!fs.existsSync(srcPath)) srcPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(srcPath)) {
      return res.status(404).json({ error: `Video file not found: ${filename}` });
    }

    const startSec = Math.max(0, parseFloat(startTime) || 0);
    const endSec = parseFloat(endTime) || (startSec + 5);
    const durationSec = Math.min(15, Math.max(3, Math.round(endSec - startSec)));

    const sliceId = `omni_src_${Date.now()}`;
    const trimmedPath = path.join(rendersDir, `${sliceId}.mp4`);
    const transformedOut = path.join(rendersDir, `omni_xform_${Date.now()}.mp4`);

    await trimSegment({
      inputPath: srcPath,
      outputPath: trimmedPath,
      startSec,
      durationSec,
      keepAudio: false
    });

    const pythonBin = 'C:\\Users\\katyc\\AppData\\Local\\Python\\bin\\python3.exe';
    const scriptPath = 'C:\\Users\\katyc\\.gemini\\config\\plugins\\gemini-api\\skills\\gemini-omni-flash-api\\scripts\\video\\generate_video.py';

    await new Promise((resolve, reject) => {
      const proc = spawn(pythonBin, [
        scriptPath,
        prompt,
        '--video', trimmedPath,
        '--model', 'gemini-omni-1.2-flash',
        '--resolution', '720p',
        '--output', transformedOut
      ], {
        env: { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY }
      });

      proc.stdout.on('data', (d) => console.log('[Omni Transform]', d.toString().trim()));
      proc.stderr.on('data', (d) => console.warn('[Omni Transform Stderr]', d.toString().trim()));

      proc.on('close', (code) => {
        try { fs.unlinkSync(trimmedPath); } catch (_) {}
        if (code !== 0) return reject(new Error(`Gemini Omni transformation exited with code ${code}`));
        resolve();
      });
    });

    const outMeta = await getVideoMetadata(transformedOut);
    res.json({
      success: true,
      videoUrl: `/storage/renders/${path.basename(transformedOut)}`,
      duration: outMeta.duration
    });
  } catch (err) {
    console.error('[Omni Transform Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------------
// Social Cookie Auth & One-Click Publisher API (TikTok & Facebook)
// ----------------------------------------------------------------------------

app.get('/api/social/status', (req, res) => {
  const auth = getSocialAuth();
  res.json({
    success: true,
    tiktok: {
      connected: auth.tiktok?.connected || false,
      username: auth.tiktok?.username || null,
      cookieCount: auth.tiktok?.cookies?.length || 0,
      updatedAt: auth.tiktok?.updatedAt || null
    },
    facebook: {
      connected: auth.facebook?.connected || false,
      name: auth.facebook?.name || null,
      cookieCount: auth.facebook?.cookies?.length || 0,
      updatedAt: auth.facebook?.updatedAt || null
    }
  });
});

app.post('/api/social/connect', async (req, res) => {
  try {
    const { platform, cookieData } = req.body;
    if (!platform || !cookieData) {
      return res.status(400).json({ error: 'Platform and cookieData are required.' });
    }

    if (platform === 'tiktok') {
      const result = await connectTikTok(cookieData);
      return res.json(result);
    } else if (platform === 'facebook') {
      const result = await connectFacebook(cookieData);
      return res.json(result);
    } else {
      return res.status(400).json({ error: 'Unsupported platform: ' + platform });
    }
  } catch (err) {
    console.error('[Social Connect Error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/social/disconnect', (req, res) => {
  const { platform } = req.body;
  if (!platform) return res.status(400).json({ error: 'Platform is required' });
  const result = disconnectSocial(platform);
  res.json(result);
});

app.post('/api/social/post', async (req, res) => {
  try {
    const { videoUrl, platforms = ['tiktok'], caption = '', hashtags = [] } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });
    if (!platforms || platforms.length === 0) return res.status(400).json({ error: 'At least one platform must be selected' });

    // Resolve local video file path
    const filename = path.basename(videoUrl.split('?')[0]);
    let srcPath = path.join(rendersDir, filename);
    if (!fs.existsSync(srcPath)) srcPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(srcPath)) {
      return res.status(404).json({ error: `Video file not found: ${filename}` });
    }

    const results = {};
    const errors = {};

    for (const plat of platforms) {
      console.log(`[Social Post] Initiating post to ${plat} for ${filename}...`);
      try {
        if (plat === 'tiktok') {
          results.tiktok = await publishToTikTok({
            videoPath: srcPath,
            caption,
            hashtags,
            onProgress: (msg) => console.log(`[TikTok Publisher] ${msg}`)
          });
        } else if (plat === 'facebook') {
          results.facebook = await publishToFacebook({
            videoPath: srcPath,
            caption,
            hashtags,
            onProgress: (msg) => console.log(`[Facebook Publisher] ${msg}`)
          });
        }
      } catch (err) {
        console.error(`[Social Post Error on ${plat}]:`, err.message);
        errors[plat] = err.message;
      }
    }

    res.json({
      success: Object.keys(results).length > 0,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('[Social Post Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Video AI Studio Backend listening on http://localhost:${PORT}`);
  console.log(`   Uploads:    ${uploadsDir}`);
  console.log(`   Renders:    ${rendersDir}`);
  console.log(`   Audio:      ${audioDir}`);
  console.log(`======================================================\n`);
});
