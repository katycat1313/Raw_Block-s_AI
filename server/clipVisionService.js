import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { generateThumbnail, getVideoMetadata } from './ffmpegService.js';
import { transcribeMediaAudio } from './deepgramService.js';

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
  workDir,
  userDirective = ''
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
            text: `You are an expert video director and asset annotator for commercial video blocks.
Analyze these 3 sequential frames extracted from a ${meta.duration.toFixed(1)}s video block: "${originalFilename}".
${userDirective ? `Recording Directive / Goal: "${userDirective}"` : ''}
Resolution: ${meta.width}x${meta.height}.

Identify the EXACT application section/widget and the specific action occurring.
Return ONLY valid JSON matching this exact structure:
{
  "title": "Short 3-5 word descriptive title of the specific screen or action",
  "description": "Clear 1-2 sentence description explaining exactly what section of the application is shown and what action is taking place",
  "contentType": "screen_recording" or "live_action",
  "blockRole": "metrics_results" | "live_demo" | "hook_problem" | "social_proof" | "call_to_action",
  "categoryLetter": "C" | "B" | "A" | "D" | "E",
  "lightingProfile": "screen_light" | "screen_dark" | "natural",
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
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    // Clean up temporary frames
    try { fs.rmSync(tempFramesDir, { recursive: true, force: true }); } catch (_) {}

    const inferredCategory = parsed.categoryLetter || (parsed.blockRole === 'metrics_results' ? 'C' : (parsed.blockRole === 'social_proof' ? 'D' : (parsed.blockRole === 'call_to_action' ? 'E' : (parsed.blockRole === 'hook_problem' ? 'A' : 'B'))));
    const inferredRole = parsed.blockRole || (inferredCategory === 'C' ? 'metrics_results' : (inferredCategory === 'D' ? 'social_proof' : (inferredCategory === 'E' ? 'call_to_action' : (inferredCategory === 'A' ? 'hook_problem' : 'live_demo'))));

    return {
      clipId,
      title: parsed.title || originalFilename || 'Untitled Block',
      description: parsed.description || 'Application video block',
      contentType: parsed.contentType || 'screen_recording',
      blockRole: inferredRole,
      categoryLetter: inferredCategory,
      lightingProfile: parsed.lightingProfile || 'screen_dark',
      keyActions: parsed.keyActions || ['Demonstration'],
      suggestedHighlights: parsed.suggestedHighlights || ['center'],
      tags: parsed.tags || ['screen-recording', 'demo'],
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

/**
 * Analyze a user's rough walkthrough tour video to extract the "App Blueprint Map".
 * Learns the location of features, edit triggers, and interactive elements.
 */
export async function analyzeTourBlueprint({
  filePath,
  geminiApiKey,
  deepgramApiKey,
  workDir,
  targetUrl = ''
}) {
  const meta = await getVideoMetadata(filePath);
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;

  // 1. Transcribe the user's spoken voice explanation using Deepgram Nova-2
  let spokenTranscript = '';
  try {
    spokenTranscript = await transcribeMediaAudio(filePath, deepgramApiKey);
  } catch (sttErr) {
    console.warn('[Blueprint STT Warning]:', sttErr.message);
  }

  const tempFramesDir = path.join(workDir, `tour_frames_${Date.now()}`);
  let frames = [];
  try {
    frames = await extractSampleFrames(filePath, tempFramesDir, 6);
  } catch (err) {
    console.warn('[Blueprint Vision] Keyframe extraction warning:', err.message);
  }

  if (!apiKey || frames.length === 0) {
    try { fs.rmSync(tempFramesDir, { recursive: true, force: true }); } catch (_) {}
    return {
      appName: 'Demo Application',
      overview: 'Interactive web application demonstration tour.',
      targetUrl,
      keyFeatures: [
        {
          id: 'main_dashboard',
          title: 'Main Dashboard & Workspace',
          locationOrRoute: 'Homepage / Initial view',
          editOrActionTrigger: 'Click the primary action or navigation tabs',
          description: 'Overview of the application workspace.',
          suggestedHighlights: ['center']
        }
      ],
      suggestedStoryline: [
        { beat: 1, type: 'hook', text: 'Struggling with complex marketing tools?' },
        { beat: 2, type: 'app_feature', text: 'Step inside the interactive workspace.' }
      ],
      duration: meta.duration,
      timestamp: new Date().toISOString()
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `You are the Executive Technical Director and UI/UX Cartographer for an automated video studio.
The user has recorded a rough screen tour walkthrough of their web application (Target URL: "${targetUrl || 'Web App'}").
Duration: ${meta.duration.toFixed(1)}s, Resolution: ${meta.width}x${meta.height}.
${spokenTranscript ? `
USER SPOKEN VOICE EXPLANATION (Recorded live during the tour):
"""
${spokenTranscript}
"""
(CRITICAL: The user was speaking out loud into their microphone while demonstrating the app. Use their spoken words as the ultimate ground truth for how the buttons, edit toggles, and features work!)
` : ''}
Analyze these sequential keyframes across the user's tour to map out "what does what" and create the Master App Blueprint.
Pay extreme attention to:
1. What interactive features, modules, or simulations are demonstrated?
2. How does the user activate "Edit" modes, toggles, buttons, or inputs (e.g. pencil icons, Edit buttons, action triggers)?
3. What key screens or results are revealed (e.g., SEO score, crisis modals, analytics charts)?

Return ONLY valid JSON matching this exact structure:
{
  "appName": "Name of the web application",
  "overview": "Clear 1-2 sentence summary of what this application does and who it is for",
  "keyFeatures": [
    {
      "id": "feature_slug",
      "title": "Clear Feature Title (e.g., On-Page SEO Simulation Workbench)",
      "locationOrRoute": "Where this lives or how to navigate there (e.g., Click 'Coffee Shop Project' from main dashboard)",
      "editOrActionTrigger": "Crucial instruction on how to edit or activate (e.g., Click the Edit Mode pencil icon at top right to unlock H1 inputs)",
      "description": "Visual description of what this tool looks like and what actions happen on screen",
      "suggestedHighlights": ["top-right", "center", "left-sidebar"]
    }
  ],
  "suggestedStoryline": [
    {
      "step": 1,
      "title": "The Hook",
      "voiceoverGoal": "Address student pain points with real-world B-roll",
      "visualAction": "Lifestyle B-roll or starting dashboard"
    },
    {
      "step": 2,
      "title": "Interactive Execution",
      "voiceoverGoal": "Show real hands-on tool execution",
      "visualAction": "Navigate to the feature and activate edit mode"
    }
  ]
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
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    try { fs.rmSync(tempFramesDir, { recursive: true, force: true }); } catch (_) {}

    return {
      appName: parsed.appName || 'Web Application',
      overview: parsed.overview || 'Interactive web application.',
      targetUrl,
      keyFeatures: parsed.keyFeatures || [],
      suggestedStoryline: parsed.suggestedStoryline || [],
      duration: meta.duration,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[Blueprint Vision Error]:', err.message);
    try { fs.rmSync(tempFramesDir, { recursive: true, force: true }); } catch (_) {}
    return {
      appName: 'Web Application',
      overview: 'Interactive web application demonstration tour.',
      targetUrl,
      keyFeatures: [],
      suggestedStoryline: [],
      duration: meta.duration,
      timestamp: new Date().toISOString()
    };
  }
}
