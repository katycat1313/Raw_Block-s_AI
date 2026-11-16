import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { assignBlockTaxonomy, syncProjectKeyFile, CATEGORY_DEFINITIONS } from './projectKeyService.js';
import { scoutDirectiveBlocks } from './browserRecorder.js';
import { generateThumbnail, getVideoMetadata, renderTimeline } from './ffmpegService.js';
import { analyzeVideoClip } from './clipVisionService.js';
import { VideoAgentOrchestrator } from './agentOrchestrator.js';
import { publishToTikTok, publishToFacebook } from './socialService.js';

/**
 * Factory to create the V1 External Agent API Router.
 * Protected with API key authentication for external Social Media Agents.
 */
export function createAgentApiRouter(deps) {
  const router = express.Router();
  const {
    getClips,
    addClips,
    saveClipDatabase,
    getCurrentProject,
    getCurrentAppUrl,
    storageDir,
    uploadsDir,
    thumbnailsDir,
    audioDir,
    rendersDir,
    musicDir,
    getAllRenderedVideos
  } = deps;

  // --------------------------------------------------------------------------
  // API Key Authentication Middleware
  // --------------------------------------------------------------------------
  router.use((req, res, next) => {
    const configuredKey = process.env.RAW_BLOCKS_API_KEY;
    if (!configuredKey) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'RAW_BLOCKS_API_KEY is not configured in server environment (.env).'
      });
    }

    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];

    let providedKey = null;
    if (apiKeyHeader) {
      providedKey = apiKeyHeader.trim();
    } else if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      providedKey = authHeader.substring(7).trim();
    }

    if (!providedKey || providedKey !== configuredKey.trim()) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing API key. Provide the header "x-api-key: <key>" or "Authorization: Bearer <key>".'
      });
    }

    next();
  });

  // --------------------------------------------------------------------------
  // 1. Health & Auth Verification
  // --------------------------------------------------------------------------
  router.get('/auth/verify', async (req, res) => {
    const clips = getClips ? getClips() : [];
    const renders = getAllRenderedVideos ? await getAllRenderedVideos() : [];

    res.json({
      status: 'ok',
      authenticated: true,
      service: 'Raw Blocks AI Agent Gateway',
      version: '1.0.0',
      project: getCurrentProject ? getCurrentProject() : 'krechet_academy',
      targetAppUrl: getCurrentAppUrl ? getCurrentAppUrl() : 'https://krechet.academy',
      totalBlocks: clips.length,
      totalRenders: renders.length,
      endpoints: {
        verify: 'GET /api/v1/auth/verify',
        blocks: 'GET /api/v1/blocks',
        scout: 'POST /api/v1/scout',
        produce: 'POST /api/v1/produce',
        renders: 'GET /api/v1/renders',
        publish: 'POST /api/v1/publish'
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Query Categorized Blocks
  // --------------------------------------------------------------------------
  router.get('/blocks', (req, res) => {
    try {
      const rawClips = getClips ? getClips() : [];
      const enriched = assignBlockTaxonomy(rawClips);
      const host = req.get('host') || 'localhost:3005';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      const { category, minDuration, maxDuration, search } = req.query;

      let filtered = enriched;
      if (category) {
        filtered = filtered.filter(c => (c.categoryLetter || '').toUpperCase() === String(category).toUpperCase());
      }
      if (minDuration) {
        filtered = filtered.filter(c => (c.duration || 0) >= parseFloat(minDuration));
      }
      if (maxDuration) {
        filtered = filtered.filter(c => (c.duration || 0) <= parseFloat(maxDuration));
      }
      if (search) {
        const q = String(search).toLowerCase();
        filtered = filtered.filter(c =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.tags || []).some(t => String(t).toLowerCase().includes(q))
        );
      }

      const formattedBlocks = filtered.map(clip => ({
        blockCode: clip.blockCode,
        category: clip.categoryLetter,
        title: clip.title,
        description: clip.description,
        duration: clip.duration ? Math.round(clip.duration * 10) / 10 : 0,
        actionType: clip.actionType || 'demonstration',
        reusability: clip.reusability || 'modular',
        tags: clip.tags || [],
        streamUrl: clip.videoUrl ? `${baseUrl}${clip.videoUrl}` : null,
        thumbnailUrl: clip.thumbnailUrl ? `${baseUrl}${clip.thumbnailUrl}` : null,
        downloadUrl: clip.videoUrl ? `${baseUrl}/api/download?file=${path.basename(clip.videoUrl)}` : null
      }));

      res.json({
        success: true,
        count: formattedBlocks.length,
        totalInLibrary: enriched.length,
        categories: CATEGORY_DEFINITIONS,
        blocks: formattedBlocks
      });
    } catch (err) {
      console.error('[Agent API /blocks Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 3. Autonomous Screen Scout
  // --------------------------------------------------------------------------
  router.post('/scout', async (req, res) => {
    try {
      const {
        url = (getCurrentAppUrl ? getCurrentAppUrl() : 'https://krechet.academy'),
        directive,
        clipCount = 3,
        clipDuration = 5.0,
        speedMultiplier = 1.25
      } = req.body;

      if (!directive || !directive.trim()) {
        return res.status(400).json({ error: 'directive is required (e.g. "Scout the A/B testing simulator and live campaign analytics")' });
      }

      console.log(`[Agent API /scout] Initiating autonomous scout: "${directive}" on ${url} (${clipCount} clips @ ${clipDuration}s)...`);

      const scoutResults = await scoutDirectiveBlocks({
        url,
        directive,
        clipCount: Math.min(Math.max(parseInt(clipCount) || 3, 1), 6),
        clipDuration: Math.min(Math.max(parseFloat(clipDuration) || 5.0, 3.0), 10.0),
        speedMultiplier: parseFloat(speedMultiplier) || 1.25,
        outputDir: uploadsDir,
        onProgress: (p) => console.log(`[Agent Scout] ${p}`)
      });

      const scoutedClips = [];
      const host = req.get('host') || 'localhost:3005';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      for (let i = 0; i < scoutResults.length; i++) {
        const item = scoutResults[i];
        const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const thumbnailName = `${clipId}.jpg`;
        const thumbnailPath = path.join(thumbnailsDir, thumbnailName);

        try {
          await generateThumbnail(item.filePath, thumbnailPath, 1.0);
        } catch (_) {}

        let metaDuration = item.duration || 5.0;
        try {
          const meta = await getVideoMetadata(item.filePath);
          if (meta?.duration) metaDuration = meta.duration;
        } catch (_) {}

        const clipEntry = {
          clipId,
          filename: item.filename,
          originalName: item.title,
          filePath: item.filePath,
          videoUrl: `/storage/uploads/${item.filename}`,
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
          tags: ['Scouted Block', item.actionType, item.reusability, '1080p'],
          duration: metaDuration,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9'
        };

        if (addClips) {
          addClips([clipEntry]);
        }
        scoutedClips.push(clipEntry);
      }

      if (saveClipDatabase) {
        saveClipDatabase();
      }

      const formatted = scoutedClips.map(clip => ({
        blockCode: clip.blockCode,
        category: clip.categoryLetter,
        title: clip.title,
        description: clip.description,
        duration: Math.round(clip.duration * 10) / 10,
        streamUrl: `${baseUrl}${clip.videoUrl}`,
        thumbnailUrl: `${baseUrl}${clip.thumbnailUrl}`
      }));

      res.json({
        success: true,
        count: formatted.length,
        directive,
        blocks: formatted
      });
    } catch (err) {
      console.error('[Agent API /scout Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 4. Produce Video Commercial & Social Copy
  // --------------------------------------------------------------------------
  router.post('/produce', async (req, res) => {
    try {
      const {
        goal,
        prompt,
        voiceId = 'aura-orion-en',
        targetPlatform = 'tiktok', // 'tiktok', 'instagram', 'youtube_shorts', 'linkedin', 'facebook'
        aspectRatio = '9:16',
        generateSocialCopy = true,
        musicTrack = 'chill_tech_ambient.mp3',
        speedMultiplier = 1.25
      } = req.body;

      const userGoal = goal || prompt;
      if (!userGoal || !userGoal.trim()) {
        return res.status(400).json({ error: 'goal or prompt is required (e.g. "Create a high-energy TikTok ad showing how students run live campaigns")' });
      }

      const rawClips = getClips ? getClips() : [];
      if (rawClips.length === 0) {
        return res.status(400).json({ error: 'No video blocks found in asset library. Please scout or upload blocks first.' });
      }

      console.log(`[Agent API /produce] Generating commercial for goal: "${userGoal}" (Voice: ${voiceId}, Platform: ${targetPlatform})...`);

      // 1. Run Multi-Agent Orchestrator to generate EDL & Voiceover
      const defaultMusicPath = path.join(musicDir, musicTrack);
      const musicPath = fs.existsSync(defaultMusicPath) ? defaultMusicPath : null;

      const orchestrator = new VideoAgentOrchestrator({
        geminiApiKey: process.env.GEMINI_API_KEY,
        deepgramApiKey: process.env.DEEPGRAM_API_KEY,
        audioOutputDir: audioDir,
        onProgress: (p) => console.log(`[Agent Produce Progress] ${p}`)
      });

      const edl = await orchestrator.runPipeline({
        userPrompt: userGoal,
        scriptMode: 'prompt_generate',
        rawScript: userGoal,
        clips: assignBlockTaxonomy(rawClips),
        selectedVoice: voiceId,
        musicTrack: musicPath,
        enableLightingEffects: true,
        enableScreenRecordingSpotlight: true,
        enableScreenRecordingSpeed: true,
        screenRecordingSpeed: parseFloat(speedMultiplier) || 1.25
      });

      // 2. Render final video using FFmpeg
      const renderId = `agent_render_${Date.now()}`;
      const outputFilename = `${renderId}.mp4`;
      const outputPath = path.join(rendersDir, outputFilename);

      console.log(`[Agent API /produce] Rendering master MP4 (${edl.clips.length} scenes)...`);
      await renderTimeline({
        clips: edl.clips,
        voiceoverAudioPath: edl.voiceoverAudioPath,
        musicAudioPath: edl.musicTrack,
        musicVolume: 0.15,
        outputPath,
        onProgress: (p) => console.log(`[Agent Render] ${p}`)
      });

      const meta = await getVideoMetadata(outputPath);
      const host = req.get('host') || 'localhost:3005';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      // 3. Generate Social Media Copy via Gemini
      let socialCopy = null;
      if (generateSocialCopy && process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const promptContent = `You are an elite digital marketing agency social media copywriter.
Task: Write compelling, high-converting social media post copy for a video ad promoting Krechet Marketing Academy (https://krechet.academy).
Target Platform: ${targetPlatform}
Video Duration: ${meta?.duration ? meta.duration.toFixed(1) : '30'} seconds
Video Creative Goal: "${userGoal}"
Storyboard Voiceover Script: "${edl.clips.map(c => c.narration || '').filter(Boolean).join(' ')}"

Return ONLY a valid JSON object with the following schema:
{
  "platform": "${targetPlatform}",
  "headline": "punchy 1-line headline or title",
  "hook": "first 3 seconds video caption or visual hook text",
  "caption": "compelling post body text with emojis and clear call to action to visit krechet.academy",
  "hashtags": ["#marketing", "#abtesting", "#digitalmarketing", "...4 to 6 relevant tags"],
  "callToAction": "e.g. Test your marketing instinct at krechet.academy"
}`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptContent,
            config: { responseMimeType: 'application/json' }
          });

          if (response?.text) {
            socialCopy = JSON.parse(response.text.trim());
          }
        } catch (copyErr) {
          console.warn('[Agent API /produce] Social copy generation warning:', copyErr.message);
        }
      }

      res.json({
        success: true,
        renderId,
        filename: outputFilename,
        videoUrl: `${baseUrl}/storage/renders/${outputFilename}`,
        downloadUrl: `${baseUrl}/api/download?file=${outputFilename}`,
        duration: meta?.duration ? Math.round(meta.duration * 10) / 10 : null,
        width: meta?.width || 1920,
        height: meta?.height || 1080,
        sceneCount: edl.clips.length,
        socialCopy
      });
    } catch (err) {
      console.error('[Agent API /produce Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 5. List All Rendered Videos
  // --------------------------------------------------------------------------
  router.get('/renders', async (req, res) => {
    try {
      const renders = getAllRenderedVideos ? await getAllRenderedVideos() : [];
      const host = req.get('host') || 'localhost:3005';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      const formatted = renders.map(r => ({
        filename: r.filename,
        title: r.title,
        badge: r.badge,
        duration: r.duration,
        sizeMb: r.sizeMb,
        createdAt: r.createdAt,
        videoUrl: `${baseUrl}${r.url}`,
        downloadUrl: `${baseUrl}/api/download?file=${r.filename}`
      }));

      res.json({
        success: true,
        count: formatted.length,
        renders: formatted
      });
    } catch (err) {
      console.error('[Agent API /renders Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 6. Direct Publish to Connected Social Accounts
  // --------------------------------------------------------------------------
  router.post('/publish', async (req, res) => {
    try {
      const { videoFilename, platform = 'tiktok', caption = '', hashtags = [] } = req.body;
      if (!videoFilename) {
        return res.status(400).json({ error: 'videoFilename is required (e.g. krechet_commercial_master.mp4)' });
      }

      let srcPath = path.join(rendersDir, path.basename(videoFilename));
      if (!fs.existsSync(srcPath)) srcPath = path.join(uploadsDir, path.basename(videoFilename));
      if (!fs.existsSync(srcPath)) {
        return res.status(404).json({ error: `Video file not found: ${videoFilename}` });
      }

      let result;
      if (platform === 'tiktok') {
        result = await publishToTikTok({
          videoPath: srcPath,
          caption,
          hashtags,
          onProgress: (msg) => console.log(`[Agent TikTok Publish] ${msg}`)
        });
      } else if (platform === 'facebook') {
        result = await publishToFacebook({
          videoPath: srcPath,
          caption,
          hashtags,
          onProgress: (msg) => console.log(`[Agent Facebook Publish] ${msg}`)
        });
      } else {
        return res.status(400).json({ error: `Platform ${platform} not supported yet` });
      }

      res.json({ success: true, platform, result });
    } catch (err) {
      console.error('[Agent API /publish Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
