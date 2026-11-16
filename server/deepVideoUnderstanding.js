import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (_) {}
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { GoogleGenAI } from '@google/genai';
import { getVideoMetadata, generateThumbnail } from './ffmpegService.js';

/**
 * Extract audio track from video file as an optimized 16kHz mono WAV for Deepgram Nova-2.
 */
export async function extractAudioFromVideo(videoFilePath, outputWavPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputWavPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const args = [
      '-nostdin',
      '-i', videoFilePath,
      '-vn',
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      '-y',
      outputWavPath
    ];

    execFile(ffmpegStatic, args, (err, stdout, stderr) => {
      if (err) {
        console.warn(`[DeepAudio] Note: Audio extraction warning (video might have no audio track):`, stderr || err.message);
        return resolve(null); // Return null rather than failing, video might be silent screen recording
      }
      resolve(outputWavPath);
    });
  });
}

/**
 * Transcribe audio track with Deepgram Nova-2 with exact word timestamps, utterances, and smart formatting.
 */
export async function transcribeWithDeepgram(audioWavPath, apiKey) {
  const effectiveKey = apiKey || process.env.DEEPGRAM_API_KEY;
  if (!effectiveKey || !audioWavPath || !fs.existsSync(audioWavPath)) {
    return { transcript: '', words: [], utterances: [] };
  }

  const stat = fs.statSync(audioWavPath);
  if (stat.size < 1000) {
    return { transcript: '', words: [], utterances: [] };
  }

  try {
    const fileBuffer = fs.readFileSync(audioWavPath);
    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&utterances=true&diarize=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${effectiveKey}`,
          'Content-Type': 'audio/wav'
        },
        body: fileBuffer
      }
    );

    if (!response.ok) {
      console.warn(`[Deepgram STT] API returned HTTP ${response.status}`);
      return { transcript: '', words: [], utterances: [] };
    }

    const data = await response.json();
    const alt = data.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alt?.transcript || '';
    const words = alt?.words || [];
    const utterances = data.results?.utterances || [];

    console.log(`[Deepgram STT] Extracted ${words.length} words across ${utterances.length} utterances. Transcript: "${transcript.substring(0, 80)}..."`);
    return { transcript, words, utterances };
  } catch (err) {
    console.warn(`[Deepgram STT Error]:`, err.message);
    return { transcript: '', words: [], utterances: [] };
  }
}

/**
 * Sample sequential keyframes across video duration for visual event analysis.
 */
export async function sampleVideoKeyframes(videoFilePath, workDir, sampleIntervalSec = 3.0) {
  const meta = await getVideoMetadata(videoFilePath);
  const duration = Math.max(1.0, meta.duration);
  const framesDir = path.join(workDir, `deep_frames_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  fs.mkdirSync(framesDir, { recursive: true });

  const timestamps = [];
  for (let t = 1.0; t < duration; t += sampleIntervalSec) {
    timestamps.push(t);
  }
  if (timestamps.length === 0) timestamps.push(duration / 2);

  const sampledFrames = [];
  for (const t of timestamps.slice(0, 15)) { // Cap at 15 keyframes per video for efficiency
    const framePath = path.join(framesDir, `frame_${t.toFixed(1)}.jpg`);
    try {
      await generateThumbnail(videoFilePath, framePath, t);
      if (fs.existsSync(framePath)) {
        sampledFrames.push({
          timeSec: t,
          filePath: framePath,
          base64: fs.readFileSync(framePath).toString('base64')
        });
      }
    } catch (_) {}
  }

  return { sampledFrames, framesDir, duration, meta };
}

/**
 * Stage 1: Deep Video Understanding.
 * Simultaneously analyzes both audio and visual streams to create a unified multimodal event stream.
 */
export async function analyzeDeepVideo({
  videoFilePath,
  videoId,
  sourceName,
  workDir,
  geminiApiKey,
  deepgramApiKey
}) {
  console.log(`[DeepUnderstanding] Analyzing video: "${sourceName || path.basename(videoFilePath)}"...`);
  const meta = await getVideoMetadata(videoFilePath);
  const duration = Math.max(1.0, meta.duration);

  // 1. Audio stream understanding
  const tempWavPath = path.join(workDir, `temp_audio_${videoId}.wav`);
  const extractedWav = await extractAudioFromVideo(videoFilePath, tempWavPath);
  const audioData = await transcribeWithDeepgram(extractedWav, deepgramApiKey);

  if (extractedWav && fs.existsSync(extractedWav)) {
    try { fs.unlinkSync(extractedWav); } catch (_) {}
  }

  // 2. Visual stream understanding
  const { sampledFrames, framesDir } = await sampleVideoKeyframes(videoFilePath, workDir, Math.max(2.5, duration / 10));

  let visualEvents = [];
  let detectedFeatures = [];
  let detectedScenes = [];

  const effectiveGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (effectiveGeminiKey && sampledFrames.length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: `You are an expert video understanding AI.
Analyze these sequential frames from video: "${sourceName || path.basename(videoFilePath)}" (${duration.toFixed(1)}s total).
Transcript extracted from audio (if any): "${audioData.transcript || '(Silent / demo screen)'}"

Frame Timestamps:
${sampledFrames.map((f, i) => `Frame ${i + 1}: ${f.timeSec.toFixed(1)}s`).join('\n')}

TASK:
Identify exact visual events, UI components, feature demonstrations, and scene shifts.
Return JSON format:
{
  "scenes": [
    {
      "startSec": 0.0,
      "endSec": 15.0,
      "label": "Day 1 Lesson Cockpit & Mode Selection",
      "feature": "Day 1 Simulation Launcher",
      "uiElements": ["mode selector", "curriculum roadmap", "launch button"]
    }
  ],
  "visualEvents": [
    {
      "timeSec": 5.0,
      "event": "User toggles AI-Assisted learning mode",
      "actionType": "click_toggle",
      "focalArea": "center-left"
    }
  ],
  "featureMentions": [
    "Day 1 Simulation", "AI Mentor", "SEO Workbench", "Client Onboarding"
  ]
}`
            },
            ...sampledFrames.map(f => ({
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
        contents,
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(response.text || '{}');
      detectedScenes = parsed.scenes || [];
      visualEvents = parsed.visualEvents || [];
      detectedFeatures = parsed.featureMentions || [];
    } catch (err) {
      console.warn(`[DeepUnderstanding Visual Warning]:`, err.message);
    }
  }

  // Clean up temporary frames
  if (framesDir && fs.existsSync(framesDir)) {
    try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch (_) {}
  }

  // Fallback scenes if none generated
  if (detectedScenes.length === 0) {
    detectedScenes = [
      {
        startSec: 0,
        endSec: duration,
        label: sourceName || 'Application Demonstration',
        feature: 'Core Application Workflow',
        uiElements: ['main dashboard', 'interface canvas']
      }
    ];
  }

  const analysisPayload = {
    videoId,
    sourceFile: videoFilePath,
    sourceName: sourceName || path.basename(videoFilePath),
    duration,
    width: meta.width,
    height: meta.height,
    fps: meta.fps || 30,
    fullTranscript: audioData.transcript,
    wordTimestamps: audioData.words,
    utterances: audioData.utterances,
    scenes: detectedScenes,
    visualEvents,
    featureMentions: detectedFeatures,
    analyzedAt: Date.now()
  };

  console.log(`[DeepUnderstanding] Completed deep analysis for "${sourceName}". ${detectedScenes.length} scenes, ${visualEvents.length} visual events, ${audioData.words.length} words.`);
  return analysisPayload;
}
