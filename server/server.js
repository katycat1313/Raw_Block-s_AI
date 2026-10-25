import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { getVideoMetadata, generateThumbnail, renderTimeline, generateSampleAmbientMusic, stitchVideoParts } from './ffmpegService.js';
import { analyzeVideoClip } from './clipVisionService.js';
import { DEEPGRAM_VOICES } from './deepgramService.js';
import { VideoAgentOrchestrator } from './agentOrchestrator.js';
import { recordAppWorkflow, recordAppMultiClips } from './browserRecorder.js';
import { searchBrollClips, importBrollClip } from './pexelsService.js';
import { assignBlockTaxonomy, syncProjectKeyFile, CATEGORY_DEFINITIONS } from './projectKeyService.js';

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
let currentAppUrl = 'https://krechetacademy.com';

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

// If database is empty, auto-index existing files in uploadsDir
if (clipDatabase.length === 0) {
  try {
    const existingFiles = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.mp4'));
    for (const f of existingFiles) {
      const filePath = path.join(uploadsDir, f);
      const clipId = `clip_${path.basename(f, '.mp4')}`;
      const thumbnailName = `${clipId}.jpg`;
      const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
      
      clipDatabase.push({
        clipId,
        filename: f,
        originalName: f,
        filePath,
        videoUrl: `/storage/uploads/${f}`,
        thumbnailUrl: fs.existsSync(thumbnailPath) ? `/storage/thumbnails/${thumbnailName}` : null,
        title: f.replace(/_\d+\.mp4$/, '').replace(/[_-]/g, ' '),
        description: 'Uploaded studio video block',
        tags: ['studio', 'b-roll', 'workflow', 'action'],
        duration: 4.0,
        width: 1920,
        height: 1080
      });
    }
    if (clipDatabase.length > 0) {
      console.log(`[DB] Auto-indexed ${clipDatabase.length} existing clips from uploads folder`);
      saveClipDatabase();
    }
  } catch (scanErr) {
    console.warn('[DB] Scan error:', scanErr.message);
  }
}

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static storage assets (uploads, thumbnails, renders, audio)
app.use('/storage', express.static(storageDir));

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

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiKeySet: !!(process.env.GEMINI_API_KEY),
    deepgramKeySet: !!(process.env.DEEPGRAM_API_KEY),
    pexelsKeySet: !!(process.env.PEXELS_API_KEY),
    clipsLoaded: clipDatabase.length
  });
});

// List Deepgram Voices
app.get('/api/voices', (req, res) => {
  res.json({ voices: DEEPGRAM_VOICES });
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

// Get all uploaded clips (auto-categorized and enriched with block taxonomy)
app.get('/api/clips', (req, res) => {
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
  res.json({ clips: enriched, project: currentProject, appUrl: currentAppUrl });
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

// -------------------------------------------------------------
// BROWSER RECORDING AGENT (Playwright Screen Capture)
// -------------------------------------------------------------
app.post('/api/record-app', async (req, res) => {
  try {
    const { url, actions, targetDuration, speedMultiplier } = req.body;
    if (!url) return res.status(400).json({ error: 'Target URL is required to record' });

    console.log(`[Record App] Starting Playwright recording of: ${url} (Speed: ${speedMultiplier || 1.25}x)`);
    const recResult = await recordAppWorkflow({
      url,
      actions: actions || [],
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

// Run Agent Orchestration Pipeline
app.post('/api/orchestrate', async (req, res) => {
  try {
    const {
      userPrompt,
      scriptMode,
      rawScript,
      selectedVoice,
      selectedMusicId,
      enableLightingEffects,
      enableScreenRecordingSpotlight,
      geminiKey,
      deepgramKey
    } = req.body;

    if (clipDatabase.length === 0) {
      return res.status(400).json({ error: 'Please upload or record at least one video clip first.' });
    }

    const dialogueEvents = [];
    const progressUpdates = [];

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
      }
    });

    const edl = await orchestrator.runPipeline({
      userPrompt,
      scriptMode,
      rawScript,
      clips: clipDatabase,
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

// Stitch multiple rendered parts (e.g. Part 1, Part 2, Part 3) into a single unified master film
app.post('/api/stitch-parts', async (req, res) => {
  try {
    const { partUrls, selectedMusicId } = req.body;
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
    if (selectedMusicId && selectedMusicId !== 'none') {
      const candidate = path.join(musicDir, selectedMusicId);
      if (fs.existsSync(candidate)) musicPath = candidate;
    }

    console.log(`[Stitcher] Stitching ${videoPaths.length} parts into ${masterFilename}...`);
    await stitchVideoParts({
      videoPaths,
      musicAudioPath: musicPath,
      outputPath: masterPath,
      onProgress: (p) => console.log(`[Stitch Progress] ${p}`)
    });

    const meta = await getVideoMetadata(masterPath);

    res.json({
      success: true,
      videoUrl: `/storage/renders/${masterFilename}`,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      partsCount: videoPaths.length
    });
  } catch (err) {
    console.error('[Stitch Error]', err);
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
