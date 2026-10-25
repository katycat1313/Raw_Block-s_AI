import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { generateThumbnail, getVideoMetadata } from './ffmpegService.js';

/**
 * Extract multiple sample frames across the duration of a video.
 */
async function extractSampleFrames(videoPath, tempDir, count = 3) {
  const meta = await getVideoMetadata(videoPath);
  const duration = Math.max(1.0, meta.duration);
  const step = duration / (count + 1);

  const frames = [];
  for (let i = 1; i <= count; i++) {
    const time = i * step;
    const framePath = path.join(tempDir, `frame_${i}_${Date.now()}.jpg`);
    try {
      await generateThumbnail(videoPath, framePath, time);
      if (fs.existsSync(framePath)) {
        frames.push({
          time,
          path: framePath,
          base64: fs.readFileSync(framePath).toString('base64')
        });
      }
    } catch (err) {
      console.warn(`[Vision] Could not extract frame at ${time}s:`, err.message);
    }
  }
  return frames;
}

/**
 * Analyze an uploaded video clip using Gemini Multimodal Vision.
 */
export async function analyzeVideoClip({
  filePath,
  clipId,
  originalFilename = '',
  geminiApiKey,
  workDir
}) {
  const meta = await getVideoMetadata(filePath);
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;

  // Extract representative keyframes for multimodal analysis
  const tempFramesDir = path.join(workDir, `frames_${clipId}`);
  let frames = [];
  try {
    frames = await extractSampleFrames(filePath, tempFramesDir, 3);
  } catch (frameErr) {
    console.warn(`[Vision] Keyframe extraction warning:`, frameErr.message);
  }

  if (!apiKey || frames.length === 0) {
    // Intelligent fallback heuristic when offline or no API key
    const isScreenLike = originalFilename.toLowerCase().includes('screen') ||
                         originalFilename.toLowerCase().includes('rec') ||
                         originalFilename.toLowerCase().includes('demo') ||
                         originalFilename.toLowerCase().includes('capture');

    const cleanTitle = originalFilename
      ? originalFilename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      : `Clip #${clipId.substring(0, 5)}`;

    // Clean up temporary frames
    try { fs.rmSync(tempFramesDir, { recursive: true, force: true }); } catch (_) {}

    return {
      clipId,
      title: cleanTitle,
      description: `User clip (${meta.width}x${meta.height}, ${meta.duration.toFixed(1)}s). ${isScreenLike ? 'Screen recording walkthrough.' : 'Video footage.'}`,
      contentType: isScreenLike ? 'screen_recording' : 'live_action',
      lightingProfile: 'balanced',
      keyActions: [
        'Main interface / subject visible',
        'Demonstration in progress'
      ],
      suggestedHighlights: ['center', 'top-right'],
      tags: [isScreenLike ? 'screen-recording' : 'live-action', 'demo', `${meta.aspectRatio}`],
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      aspectRatio: meta.aspectRatio
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `You are an expert video director and asset annotator.
Analyze these 3 sequential frames extracted from video clip: "${originalFilename}".
Total duration: ${meta.duration.toFixed(1)}s, Resolution: ${meta.width}x${meta.height}.

Return ONLY valid JSON matching this exact structure:
{
  "title": "Short 3-5 word descriptive title of what is shown",
  "description": "Clear 1-2 sentence description of the action, UI screens, or subjects",
  "contentType": "screen_recording" or "live_action",
  "lightingProfile": "screen_light" | "screen_dark" | "natural" | "underexposed" | "harsh",
  "keyActions": ["action 1", "action 2"],
  "suggestedHighlights": ["top-right", "center-modal", "sidebar", "main-canvas"],
  "tags": ["keyword1", "keyword2", "keyword3"]
}`
          },
          ...frames.map(f => ({
            inlineData: {
              mimeType: 'image/jpeg',
              data: f.base64
            }
          }))
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    // Clean up temporary frames
    try { fs.rmSync(tempFramesDir, { recursive: true, force: true }); } catch (_) {}

    return {
      clipId,
      title: parsed.title || originalFilename || 'Untitled Clip',
      description: parsed.description || 'Video clip',
      contentType: parsed.contentType || 'screen_recording',
      lightingProfile: parsed.lightingProfile || 'screen_light',
      keyActions: parsed.keyActions || ['Demonstration'],
      suggestedHighlights: parsed.suggestedHighlights || ['center'],
      tags: parsed.tags || ['demo', 'screen'],
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      aspectRatio: meta.aspectRatio
    };
  } catch (err) {
    console.error(`[Vision Error] Gemini vision analysis failed:`, err.message);
    try { fs.rmSync(tempFramesDir, { recursive: true, force: true }); } catch (_) {}

    return {
      clipId,
      title: originalFilename || 'Clip',
      description: `Clip (${meta.duration.toFixed(1)}s).`,
      contentType: 'screen_recording',
      lightingProfile: 'balanced',
      keyActions: ['UI interaction'],
      suggestedHighlights: ['center'],
      tags: ['demo'],
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      aspectRatio: meta.aspectRatio
    };
  }
}
