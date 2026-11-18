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
            model: 'gemini-3.8-flash',
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

/**
 * Compatibility Bridge Router for Meridian Social Media Agent App.
 * Implements POST /api/extract and POST /api/assemble matching Meridian's
 * RawVideoBlock and AssembledVideoCut TypeScript schemas.
 */
export function createMeridianBridgeRouter(deps) {
  const router = express.Router();
  const { getClips } = deps;

  function requireApiKey(req, res, next) {
    const configuredKey = process.env.RAW_BLOCKS_API_KEY;
    if (!configuredKey) return next();

    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];
    let providedKey = null;
    if (apiKeyHeader) {
      providedKey = String(apiKeyHeader).trim();
    } else if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      providedKey = authHeader.substring(7).trim();
    }

    if (!providedKey || providedKey !== configuredKey.trim()) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing API key.'
      });
    }
    next();
  }

  function mapCategoryToMeridian(letter) {
    switch (String(letter || 'B').toUpperCase()) {
      case 'A': return 'Hook Capture';
      case 'B': return 'Product Walkthrough';
      case 'C': return 'Quantitative Proof';
      case 'D': return 'Quantitative Proof';
      case 'E': return 'CTA Endcard';
      default: return 'Product Walkthrough';
    }
  }

  // POST /api/extract — Meridian Raw Footage Scene Decomposition
  router.post('/extract', requireApiKey, async (req, res) => {
    try {
      const { sourceName = 'capture.mp4', notes = '', mediaBase64, mediaMimeType } = req.body || {};
      const host = req.get('host') || 'localhost:3005';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      // If Gemini key is configured, decompose the submitted media/notes into 3 Meridian RawVideoBlocks
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const parts = [];
        if (mediaBase64 && mediaMimeType) {
          parts.push({ inlineData: { mimeType: mediaMimeType, data: mediaBase64 } });
        }
        parts.push({
          text: `You are Raw_Block-s_AI's Intelligent Scene Extractor.
Decompose this raw capture into 3 reusable modular video blocks.
Source File: ${sourceName}
Notes: ${notes}

Return ONLY valid JSON: an array of 3 objects, each with:
{
  "title": "concise descriptive block title",
  "category": "Hook Capture" | "Product Walkthrough" | "Quantitative Proof" | "B-Roll Cutaway" | "CTA Endcard",
  "durationSec": 6,
  "sourceTimecode": "00:00-00:06",
  "semanticSummary": "1-2 sentence visual summary",
  "visualTags": ["tag1", "tag2", "tag3"],
  "transcriptExcerpt": "optional spoken line or empty string"
}`
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: { responseMimeType: 'application/json' }
        });

        const items = JSON.parse((response.text || '[]').trim());
        const allowed = ['Hook Capture', 'Product Walkthrough', 'Quantitative Proof', 'B-Roll Cutaway', 'CTA Endcard'];
        const isImage = mediaBase64 && mediaMimeType && mediaMimeType.startsWith('image/');
        const isVideo = mediaBase64 && mediaMimeType && mediaMimeType.startsWith('video/');

        const blocks = (Array.isArray(items) ? items : []).map((item, idx) => ({
          id: `rb-${Date.now().toString(36)}-${idx}`,
          title: item.title || `${sourceName} — Block ${idx + 1}`,
          sourceFileName: sourceName,
          category: allowed.includes(item.category) ? item.category : 'Product Walkthrough',
          durationSec: Math.max(4, Math.min(20, Number(item.durationSec) || 6)),
          sourceTimecode: item.sourceTimecode || `00:0${idx * 5}-00:0${(idx + 1) * 5}`,
          semanticSummary: item.semanticSummary || notes || 'Extracted via Raw_Block-s_AI engine.',
          visualTags: Array.isArray(item.visualTags) ? item.visualTags.slice(0, 4) : ['Raw Blocks AI'],
          transcriptExcerpt: item.transcriptExcerpt || '',
          previewImageUrl: isImage ? `data:${mediaMimeType};base64,${mediaBase64}` : undefined,
          videoDataUrl: isVideo ? `data:${mediaMimeType};base64,${mediaBase64}` : undefined,
          createdAt: new Date().toISOString()
        }));

        if (blocks.length > 0) {
          return res.json({ success: true, engine: 'raw-blocks-ai', blocks });
        }
      }

      // Fallback: return matching blocks from Raw Blocks AI live catalog
      const rawClips = assignBlockTaxonomy(getClips ? getClips() : []);
      const blocks = rawClips.slice(0, 6).map((clip, idx) => ({
        id: clip.clipId || `rb-lib-${idx}`,
        title: clip.title || clip.originalName || `Block ${idx + 1}`,
        sourceFileName: clip.filename || sourceName,
        category: mapCategoryToMeridian(clip.categoryLetter),
        durationSec: Math.max(4, Math.min(20, Math.round(clip.duration || 6))),
        sourceTimecode: `00:00-00:${String(Math.round(clip.duration || 6)).padStart(2, '0')}`,
        semanticSummary: clip.description || 'Live block from Raw_Block-s_AI library.',
        visualTags: (clip.tags || []).slice(0, 4),
        transcriptExcerpt: '',
        previewImageUrl: clip.thumbnailUrl ? `${baseUrl}${clip.thumbnailUrl}` : undefined,
        videoUrl: clip.videoUrl ? `${baseUrl}${clip.videoUrl}` : undefined,
        createdAt: new Date().toISOString()
      }));

      res.json({ success: true, engine: 'raw-blocks-ai', blocks });
    } catch (err) {
      console.error('[Meridian Bridge /api/extract Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/assemble — Meridian 4-Agent Director's Cut Assembly
  router.post('/assemble', requireApiKey, async (req, res) => {
    try {
      const startedAt = Date.now();
      const {
        selectedBlocks = [],
        campaignGoal = 'Create a high-converting digital marketing promo cut',
        targetChannel = 'TikTok',
        aspectRatio = '9:16',
        voiceName = 'Kore',
        activeStrategy = { productName: 'Krechet Academy', url: 'https://krechet.academy', positioningThesis: '' }
      } = req.body || {};

      // Use Meridian's selected blocks, or fall back to Raw Blocks AI's catalog if empty
      const catalog = selectedBlocks.length > 0
        ? selectedBlocks
        : assignBlockTaxonomy(getClips ? getClips() : []).slice(0, 5).map((clip, idx) => ({
            id: clip.clipId || `rb-${idx}`,
            title: clip.title || `Block ${idx + 1}`,
            category: mapCategoryToMeridian(clip.categoryLetter),
            durationSec: Math.max(4, Math.min(18, Math.round(clip.duration || 6))),
            semanticSummary: clip.description || '',
            transcriptExcerpt: ''
          }));

      if (catalog.length === 0) {
        return res.status(400).json({ error: 'No blocks available to assemble.' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const blockList = catalog
        .map((b, i) => `[${i + 1}] id="${b.id}" | title="${b.title}" | category="${b.category}" | duration=${b.durationSec}s | summary="${b.semanticSummary || ''}"`)
        .join('\n');

      const prompt = `You are Raw_Block-s_AI External Production Engine ("Director's Cut" Multi-Agent Assembler).
Orchestrate 4 specialist agents (BlockIndexer-01, DirectorCut-02, VoxNarrator-03, ScoreSync-04) to sequence the blocks below into a high-converting ${targetChannel} (${aspectRatio}) promo video.

Product: ${activeStrategy.productName || 'Krechet Academy'} (${activeStrategy.url || 'https://krechet.academy'})
Positioning: ${activeStrategy.positioningThesis || 'Hands-on digital marketing agency simulator'}
Campaign Goal: ${campaignGoal}

Blocks:
${blockList}

Return ONLY valid JSON with this exact schema:
{
  "title": "punchy cut title",
  "scorePrompt": "instrumental music style prompt",
  "segments": [
    {
      "blockId": "exact id from list above",
      "durationSec": 6,
      "kineticCaption": "short on-screen caption (no hashtags)",
      "voiceoverSegment": "spoken narration timed to durationSec (~2.3 words/sec)",
      "cameraDirective": "zoom/pan/highlight directive"
    }
  ],
  "agentSummaries": [
    { "agentName": "BlockIndexer-01", "role": "Scene Indexer", "outputSummary": "..." },
    { "agentName": "DirectorCut-02", "role": "Retention Editor", "outputSummary": "..." },
    { "agentName": "VoxNarrator-03", "role": "Voiceover Writer", "outputSummary": "..." },
    { "agentName": "ScoreSync-04", "role": "Audio Director", "outputSummary": "..." }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      const blockMap = new Map(catalog.map(b => [b.id, b]));
      let runningStart = 0;

      const segments = (parsed.segments || []).map((seg, idx) => {
        const matched = blockMap.get(seg.blockId) || catalog[idx % catalog.length];
        const dur = Math.max(4, Math.min(18, Number(seg.durationSec) || matched?.durationSec || 6));
        const out = {
          order: idx + 1,
          blockId: matched?.id || seg.blockId,
          blockTitle: matched?.title || `Block ${idx + 1}`,
          category: matched?.category || 'Product Walkthrough',
          startSec: runningStart,
          durationSec: dur,
          kineticCaption: seg.kineticCaption || matched?.title || '',
          voiceoverSegment: seg.voiceoverSegment || '',
          cameraDirective: seg.cameraDirective || 'Subtle 105% push-in on active metric'
        };
        runningStart += dur;
        return out;
      });

      const elapsed = Date.now() - startedAt;
      const agentSummaries = Array.isArray(parsed.agentSummaries) && parsed.agentSummaries.length > 0
        ? parsed.agentSummaries
        : [
            { agentName: 'BlockIndexer-01', role: 'Scene Indexer', outputSummary: `Indexed ${catalog.length} raw blocks via Raw_Block-s_AI.` },
            { agentName: 'DirectorCut-02', role: 'Retention Editor', outputSummary: `Sequenced ${segments.length} high-retention segments (${runningStart}s).` },
            { agentName: 'VoxNarrator-03', role: 'Voiceover Writer', outputSummary: `Timed spoken script for ${targetChannel}.` },
            { agentName: 'ScoreSync-04', role: 'Audio Director', outputSummary: 'Matched background score pulse to cut pacing.' }
          ];

      res.json({
        id: `cut-${Date.now().toString(36)}`,
        title: parsed.title || `${activeStrategy.productName || 'Krechet Academy'} — Raw Blocks AI Cut`,
        campaignGoal,
        targetChannel,
        aspectRatio,
        totalDurationSec: runningStart || 24,
        segments,
        fullNarrationScript: segments.map(s => s.voiceoverSegment).join(' ').trim(),
        voiceName,
        scorePrompt: parsed.scorePrompt || 'Focused modern electronic instrumental pulse with clean synth bass, 110 BPM.',
        agentPipeline: agentSummaries.map((a, i) => ({
          agentName: a.agentName,
          role: a.role,
          outputSummary: a.outputSummary,
          durationMs: Math.round(elapsed / Math.max(1, agentSummaries.length)) + i * 45
        })),
        engineMode: 'external-api',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Meridian Bridge /api/assemble Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
