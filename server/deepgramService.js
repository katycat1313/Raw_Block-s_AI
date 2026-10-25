import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { getVideoMetadata } from './ffmpegService.js';

export const DEEPGRAM_VOICES = [
  { id: 'aura-asteria-en', name: 'Asteria', gender: 'Female', style: 'Warm & Conversational' },
  { id: 'aura-luna-en', name: 'Luna', gender: 'Female', style: 'Calm & Friendly' },
  { id: 'aura-stella-en', name: 'Stella', gender: 'Female', style: 'Professional & Clear' },
  { id: 'aura-athena-en', name: 'Athena', gender: 'Female', style: 'Authoritative & Crisp' },
  { id: 'aura-hera-en', name: 'Hera', gender: 'Female', style: 'Expressive & Engaging' },
  { id: 'aura-orion-en', name: 'Orion', gender: 'Male', style: 'Natural & Modern' },
  { id: 'aura-arcas-en', name: 'Arcas', gender: 'Male', style: 'Friendly & Youthful' },
  { id: 'aura-perseus-en', name: 'Perseus', gender: 'Male', style: 'Paced & Instructional' },
  { id: 'aura-angus-en', name: 'Angus', gender: 'Male', style: 'Casual & Approachable' },
  { id: 'aura-orpheus-en', name: 'Orpheus', gender: 'Male', style: 'Confident & Dynamic' },
  { id: 'aura-helios-en', name: 'Helios', gender: 'Male', style: 'Energetic & Bright' },
  { id: 'aura-zeus-en', name: 'Zeus', gender: 'Male', style: 'Deep & Commanding' }
];

/**
 * Generate synthetic fallback audio when API key is not present
 */
async function generateFallbackAudio(text, outputPath) {
  return new Promise((resolve, reject) => {
    // Standard speaking rate: ~140 words per minute (~2.3 words per second)
    const wordCount = text.trim().split(/\s+/).length;
    const duration = Math.max(2.0, wordCount / 2.3);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Creates a soft speech-cadence tone so the timeline has real audio and duration
    const filter = `
      aevalsrc=
        sin(2*PI*300*t)*0.08*min(1\\,sin(2*PI*3*t)+0.5):
      d=${duration.toFixed(2)}:s=44100
      ,afade=t=in:ss=0:d=0.2
      ,afade=t=out:st=${(duration - 0.2).toFixed(2)}:d=0.2
    `.replace(/\s+/g, '');

    const args = [
      '-f', 'lavfi',
      '-i', filter,
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      '-y',
      outputPath
    ];

    execFile(ffmpegStatic, args, (err) => {
      if (err) return reject(err);
      resolve({ duration });
    });
  });
}

/**
 * Call Deepgram Aura Text-To-Speech API
 */
export async function generateVoiceover({
  text,
  voice = 'aura-orion-en',
  apiKey,
  outputDir
}) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required to generate voiceover');
  }

  const cleanText = text.trim();
  const fileId = `vo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const outputPath = path.join(outputDir, `${fileId}.mp3`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const effectiveApiKey = apiKey || process.env.DEEPGRAM_API_KEY;

  if (!effectiveApiKey) {
    console.warn('[Deepgram] No API key provided. Using fallback voice cadence generator.');
    const { duration } = await generateFallbackAudio(cleanText, outputPath);
    return {
      id: fileId,
      audioPath: outputPath,
      duration,
      voice,
      text: cleanText,
      isSimulated: true
    };
  }

  console.log(`[Deepgram] Generating voiceover (${voice}): "${cleanText.substring(0, 40)}..."`);
  const endpoint = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voice)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${effectiveApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: cleanText }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Deepgram API Warning ${response.status}] ${errorText}. Using fallback audio generator.`);
      const { duration } = await generateFallbackAudio(cleanText, outputPath);
      return {
        id: fileId,
        audioPath: outputPath,
        duration,
        voice,
        text: cleanText,
        isSimulated: true
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

    // Probe exact audio duration
    const meta = await getVideoMetadata(outputPath);

    return {
      id: fileId,
      audioPath: outputPath,
      duration: meta.duration || 3.0,
      voice,
      text: cleanText,
      isSimulated: false
    };
  } catch (netErr) {
    console.warn(`[Deepgram Network Warning] ${netErr.message}. Gracefully using fallback audio generator so production never stops.`);
    const { duration } = await generateFallbackAudio(cleanText, outputPath);
    return {
      id: fileId,
      audioPath: outputPath,
      duration,
      voice,
      text: cleanText,
      isSimulated: true
    };
  }
}
