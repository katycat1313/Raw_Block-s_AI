import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (_) {}
import fs from 'fs';
import path from 'path';
import { exec, execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { getVideoMetadata } from './ffmpegService.js';

export const DEEPGRAM_VOICES = [
  // Flux Conversational (Recommended)
  { id: 'flux-wade-en', name: 'Wade', gender: 'Male', accent: 'American', tier: 'Flux', style: 'American • Warm, Natural & Conversational' },

  // Aura-2 Studio — Male (16 Voices)
  { id: 'aura-2-apollo-en', name: 'Apollo (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Confident, Comfortable, Casual' },
  { id: 'aura-2-arcas-en', name: 'Arcas (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Natural, Smooth, Clear' },
  { id: 'aura-2-aries-en', name: 'Aries (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Warm, Energetic, Caring' },
  { id: 'aura-2-atlas-en', name: 'Atlas (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Mature • Enthusiastic, Confident, Friendly' },
  { id: 'aura-2-draco-en', name: 'Draco (v2)', gender: 'Male', accent: 'British', tier: 'Aura 2', style: 'British • Warm, Approachable, Trustworthy Baritone' },
  { id: 'aura-2-hermes-en', name: 'Hermes (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Expressive, Engaging, Professional' },
  { id: 'aura-2-hyperion-en', name: 'Hyperion (v2)', gender: 'Male', accent: 'Australian', tier: 'Aura 2', style: 'Australian • Caring, Warm, Empathetic' },
  { id: 'aura-2-jupiter-en', name: 'Jupiter (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Expressive, Knowledgeable, Baritone' },
  { id: 'aura-2-mars-en', name: 'Mars (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Smooth, Patient, Trustworthy Baritone' },
  { id: 'aura-2-neptune-en', name: 'Neptune (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Professional, Patient, Polite' },
  { id: 'aura-2-odysseus-en', name: 'Odysseus (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Calm, Smooth, Comfortable' },
  { id: 'aura-2-orion-en', name: 'Orion (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Approachable, Comfortable, Calm' },
  { id: 'aura-2-orpheus-en', name: 'Orpheus (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Professional, Clear, Confident' },
  { id: 'aura-2-pluto-en', name: 'Pluto (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Smooth, Calm, Empathetic Baritone' },
  { id: 'aura-2-saturn-en', name: 'Saturn (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Knowledgeable, Confident, Baritone' },
  { id: 'aura-2-zeus-en', name: 'Zeus (v2)', gender: 'Male', accent: 'American', tier: 'Aura 2', style: 'American • Deep, Trustworthy, Smooth' },

  // Aura-2 Studio — Female (25 Voices)
  { id: 'aura-2-thalia-en', name: 'Thalia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Clear, Confident, Energetic' },
  { id: 'aura-2-amalthea-en', name: 'Amalthea (v2)', gender: 'Female', accent: 'Filipino', tier: 'Aura 2', style: 'Filipino • Young Adult • Engaging, Natural, Cheerful' },
  { id: 'aura-2-andromeda-en', name: 'Andromeda (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Casual, Expressive, Comfortable' },
  { id: 'aura-2-asteria-en', name: 'Asteria (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Clear, Confident, Knowledgeable' },
  { id: 'aura-2-athena-en', name: 'Athena (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Mature • Calm, Smooth, Professional' },
  { id: 'aura-2-aurora-en', name: 'Aurora (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Cheerful, Expressive, Energetic' },
  { id: 'aura-2-callista-en', name: 'Callista (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Clear, Energetic, Professional' },
  { id: 'aura-2-cora-en', name: 'Cora (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Smooth, Melodic, Caring' },
  { id: 'aura-2-cordelia-en', name: 'Cordelia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Young Adult • Approachable, Warm, Polite' },
  { id: 'aura-2-delia-en', name: 'Delia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Young Adult • Casual, Friendly, Cheerful' },
  { id: 'aura-2-electra-en', name: 'Electra (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Professional, Engaging, Knowledgeable' },
  { id: 'aura-2-harmonia-en', name: 'Harmonia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Empathetic, Clear, Calm' },
  { id: 'aura-2-helena-en', name: 'Helena (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Caring, Natural, Positive' },
  { id: 'aura-2-hera-en', name: 'Hera (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Smooth, Warm, Professional' },
  { id: 'aura-2-iris-en', name: 'Iris (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Young Adult • Cheerful, Positive, Approachable' },
  { id: 'aura-2-janus-en', name: 'Janus (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Southern, Smooth, Trustworthy' },
  { id: 'aura-2-juno-en', name: 'Juno (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Natural, Engaging, Melodic' },
  { id: 'aura-2-luna-en', name: 'Luna (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Young Adult • Friendly, Natural, Engaging' },
  { id: 'aura-2-minerva-en', name: 'Minerva (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Positive, Friendly, Natural' },
  { id: 'aura-2-ophelia-en', name: 'Ophelia (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Expressive, Enthusiastic, Cheerful' },
  { id: 'aura-2-pandora-en', name: 'Pandora (v2)', gender: 'Female', accent: 'British', tier: 'Aura 2', style: 'British • Smooth, Calm, Melodic' },
  { id: 'aura-2-phoebe-en', name: 'Phoebe (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Energetic, Warm, Casual' },
  { id: 'aura-2-selene-en', name: 'Selene (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Expressive, Engaging, Energetic' },
  { id: 'aura-2-theia-en', name: 'Theia (v2)', gender: 'Female', accent: 'Australian', tier: 'Aura 2', style: 'Australian • Expressive, Polite, Sincere' },
  { id: 'aura-2-vesta-en', name: 'Vesta (v2)', gender: 'Female', accent: 'American', tier: 'Aura 2', style: 'American • Natural, Expressive, Patient' },

  // Aura-1 Classics (12 Voices)
  { id: 'aura-angus-en', name: 'Angus', gender: 'Male', accent: 'Irish', tier: 'Aura 1', style: 'Irish • Casual, Friendly, Patient' },
  { id: 'aura-orion-en', name: 'Orion', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Approachable, Comfortable, Calm' },
  { id: 'aura-arcas-en', name: 'Arcas', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Natural, Smooth, Clear' },
  { id: 'aura-perseus-en', name: 'Perseus', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Expressive, Melodic, Charismatic' },
  { id: 'aura-orpheus-en', name: 'Orpheus', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Clear, Trustworthy, Professional' },
  { id: 'aura-helios-en', name: 'Helios', gender: 'Male', accent: 'British', tier: 'Aura 1', style: 'British • Positive, Comfortable, Polite' },
  { id: 'aura-zeus-en', name: 'Zeus', gender: 'Male', accent: 'American', tier: 'Aura 1', style: 'American • Deep, Trustworthy, Smooth' },
  { id: 'aura-asteria-en', name: 'Asteria', gender: 'Female', accent: 'American', tier: 'Aura 1', style: 'American • Clear, Confident, Knowledgeable' },
  { id: 'aura-luna-en', name: 'Luna', gender: 'Female', accent: 'American', tier: 'Aura 1', style: 'American • Young Adult • Friendly, Natural, Engaging' },
  { id: 'aura-stella-en', name: 'Stella', gender: 'Female', accent: 'American', tier: 'Aura 1', style: 'American • Raspy, Engaging, Cheerful' },
  { id: 'aura-athena-en', name: 'Athena', gender: 'Female', accent: 'British', tier: 'Aura 1', style: 'British • Smooth, Calm, Professional' },
  { id: 'aura-hera-en', name: 'Hera', gender: 'Female', accent: 'American', tier: 'Aura 1', style: 'American • Deep, Smooth, Warm' }
];

/**
 * Strips script tags, bracketed markers ([Part 1], [Part1], [Scene 2], [Hook]),
 * stage directions ((Upbeat music fades), (Cut to screen)), and header labels (Part 1:, EP #2:)
 * so the text-to-speech engine speaks ONLY pure spoken human words.
 */
export function sanitizeVoiceoverText(text) {
  if (!text) return '';
  return text
    // 1. Strip bracketed markers: [Part 1], [Part1], [Scene 2], [Hook], [Visual: screen], etc.
    .replace(/\[[^\]]*\]/g, ' ')
    // 2. Strip parenthetical stage/music directions: (Upbeat music), (Part 1), (Camera zooms), (Pause)
    .replace(/\([^)]*(?:music|sound|sfx|cut|voice|pause|beat|scene|part|camera|fade|intro|outro)[^)]*\)/gi, ' ')
    // 3. Strip standalone scene markers: Part 1:, Scene 1:, Episode 2:, EP #3:
    .replace(/\b(?:part|scene|episode|ep|act|chapter)\s*#?\d+\s*[:-]?/gi, ' ')
    // 4. Clean up spaces and trim
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

/**
 * Parses script into individual part/scene sections if the user specifically labeled
 * [Part 1], [Part 2], [Scene 1], etc.
 * Returns null if no part markers are found (indicating continuous narration).
 */
export function parsePartSections(text) {
  if (!text) return null;
  const markerRegex = /(?:\[\s*(?:part|scene|episode|ep|act)\s*#?(\d+)\s*\]|\b(?:part|scene|episode|ep|act)\s*#?(\d+)\s*[:-])/i;
  if (!markerRegex.test(text)) return null;

  const sections = {};
  const splitRegex = /(?:\[\s*(?:part|scene|episode|ep|act)\s*#?(\d+)\s*\]|\b(?:part|scene|episode|ep|act)\s*#?(\d+)\s*[:-])/gi;

  const matches = [];
  let match;
  while ((match = splitRegex.exec(text)) !== null) {
    const partNum = parseInt(match[1] || match[2], 10);
    matches.push({ partNum, index: match.index, length: match[0].length });
  }

  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const next = matches[i + 1];
    const textStart = curr.index + curr.length;
    const textEnd = next ? next.index : text.length;
    const partText = sanitizeVoiceoverText(text.substring(textStart, textEnd));
    if (partText) sections[curr.partNum] = partText;
  }
  return Object.keys(sections).length > 0 ? sections : null;
}

/**
 * Generate genuine spoken voiceover using local speech engine (Windows SAPI)
 * with natural human English voices (Microsoft David / Microsoft Zira).
 */
async function generateFallbackAudio(text, outputPath, requestedVoice = 'flux-wade-en') {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const spokenText = sanitizeVoiceoverText(text);

  if (!spokenText) {
    throw new Error('No voiceover text provided to synthesize.');
  }

  // Determine local Windows voice: David (Male) vs Zira (Female)
  const matchedMeta = DEEPGRAM_VOICES.find((v) => v.id === requestedVoice);
  const isFemale = matchedMeta
    ? matchedMeta.gender === 'Female'
    : /asteria|luna|stella|athena|hera|amalthea|andromeda|aurora|callista|cora|cordelia|delia|electra|harmonia|helena|iris|janus|juno|minerva|ophelia|pandora|phoebe|selene|thalia|theia|vesta|female|zira|hazel/i.test(requestedVoice);
  const preferredVoice = isFemale ? 'Microsoft Zira Desktop' : 'Microsoft David Desktop';

  // Windows SAPI SpeechSynthesizer for genuine spoken English
  if (process.platform === 'win32') {
    const fileBase = `sapi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempWav = path.join(dir, `${fileBase}.wav`);
    const ps1Path = path.join(dir, `${fileBase}.ps1`);

    try {
      const psContent = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0
$synth.Volume = 100
try {
  $installed = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
  if ($installed -contains '${preferredVoice}') {
    $synth.SelectVoice('${preferredVoice}')
  }
} catch {}
$synth.SetOutputToWaveFile('${tempWav.replace(/\\/g, '\\\\')}')
$synth.Speak(@"
${spokenText.replace(/"/g, '""')}
"@)
$synth.Dispose()
`.trim();

      fs.writeFileSync(ps1Path, psContent, 'utf8');

      await new Promise((resolve, reject) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ps1Path], (psErr, stdout, stderr) => {
          try { fs.unlinkSync(ps1Path); } catch (_) {}
          if (psErr || !fs.existsSync(tempWav)) {
            return reject(new Error(`Local TTS generation failed: ${stderr || psErr?.message}`));
          }
          resolve();
        });
      });

      // Convert WAV to high-quality MP3 using ffmpeg
      await new Promise((resolve, reject) => {
        execFile(ffmpegStatic, ['-i', tempWav, '-c:a', 'libmp3lame', '-b:a', '192k', '-y', outputPath], (convErr) => {
          try { fs.unlinkSync(tempWav); } catch (_) {}
          if (convErr) return reject(convErr);
          resolve();
        });
      });

      const meta = await getVideoMetadata(outputPath);
      const duration = meta?.duration || Math.max(2.0, spokenText.split(/\s+/).length / 2.3);
      console.log(`[Local Speech Engine] Generated real spoken English voiceover (${preferredVoice}, ~${duration.toFixed(1)}s): "${spokenText.substring(0, 45)}..."`);
      return { duration };
    } catch (winTtsErr) {
      try { if (fs.existsSync(ps1Path)) fs.unlinkSync(ps1Path); } catch (_) {}
      try { if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav); } catch (_) {}
      console.error('[Local Speech Engine Error]', winTtsErr.message);
      throw winTtsErr;
    }
  }

  throw new Error('Local speech synthesis requires Windows or Deepgram API key.');
}

/**
 * Call Deepgram Aura Text-To-Speech API
 */
export async function generateVoiceover({
  text,
  voice = 'flux-wade-en',
  apiKey,
  outputDir
}) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required to generate voiceover');
  }

  // Resolve voice aliases: e.g. aura-wade-en or wade -> flux-wade-en
  let resolvedVoice = voice;
  if (/wade/i.test(voice)) {
    resolvedVoice = 'flux-wade-en';
  }

  const cleanText = sanitizeVoiceoverText(text);
  if (!cleanText || cleanText.length === 0) {
    throw new Error('No valid voiceover narration text provided to synthesize.');
  }
  const fileId = `vo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const outputPath = path.join(outputDir, `${fileId}.mp3`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const effectiveApiKey = apiKey || process.env.DEEPGRAM_API_KEY;

  if (!effectiveApiKey) {
    console.warn('[Deepgram] No API key provided. Using local speech engine (Windows SAPI).');
    const { duration } = await generateFallbackAudio(cleanText, outputPath, resolvedVoice);
    return {
      id: fileId,
      audioPath: outputPath,
      duration,
      voice: resolvedVoice,
      text: cleanText,
      isSimulated: true
    };
  }

  console.log(`[Deepgram] Generating voiceover (${resolvedVoice}): "${cleanText.substring(0, 40)}..."`);
  const isFlux = resolvedVoice.startsWith('flux-');
  const endpoint = isFlux
    ? `https://api.deepgram.com/v2/speak?model=${encodeURIComponent(resolvedVoice)}`
    : `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(resolvedVoice)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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
      console.warn(`[Deepgram API Warning ${response.status}] ${errorText}. Using local speech engine.`);
      const { duration } = await generateFallbackAudio(cleanText, outputPath, resolvedVoice);
      return {
        id: fileId,
        audioPath: outputPath,
        duration,
        voice: resolvedVoice,
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
      voice: resolvedVoice,
      text: cleanText,
      isSimulated: false
    };
  } catch (netErr) {
    console.warn(`[Deepgram Network Warning] ${netErr.message}. Using local speech engine so production never stops.`);
    const { duration } = await generateFallbackAudio(cleanText, outputPath, resolvedVoice);
    return {
      id: fileId,
      audioPath: outputPath,
      duration,
      voice: resolvedVoice,
      text: cleanText,
      isSimulated: true
    };
  }
}

/**
 * Transcribe spoken voice explanation from a video/audio walkthrough using Deepgram Nova-2 STT.
 */
export async function transcribeMediaAudio(mediaFilePath, apiKey) {
  const effectiveKey = apiKey || process.env.DEEPGRAM_API_KEY;
  if (!effectiveKey || !fs.existsSync(mediaFilePath)) return '';

  try {
    const fileBuffer = fs.readFileSync(mediaFilePath);
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${effectiveKey}`,
        'Content-Type': 'video/webm'
      },
      body: fileBuffer
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    if (transcript) {
      console.log(`[Deepgram STT] Transcribed user walkthrough explanation: "${transcript.substring(0, 80)}..."`);
    }
    return transcript.trim();
  } catch (err) {
    console.warn('[Deepgram STT Warning]:', err.message);
    return '';
  }
}

/**
 * Generate & cache a short 2-3s sample audio clip for any voice ID so users can preview
 * every voice before rendering a full timeline.
 */
export async function generateVoicePreview({ voiceId = 'flux-wade-en', apiKey, audioDir, text }) {
  const safeId = String(voiceId || 'flux-wade-en').replace(/[^a-zA-Z0-9_-]/g, '');
  const previewsDir = path.join(audioDir, 'previews');
  if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir, { recursive: true });

  const cachedPath = path.join(previewsDir, `${safeId}.mp3`);
  if (!text && fs.existsSync(cachedPath) && fs.statSync(cachedPath).size > 2000) {
    return { audioPath: cachedPath, cached: true, voiceId: safeId };
  }

  const voiceMeta = DEEPGRAM_VOICES.find((v) => v.id === safeId);
  const cleanName = voiceMeta ? voiceMeta.name.replace(/\s*\(v2\)/, '') : safeId;
  const sampleText = text || `Hey, this is ${cleanName}. Your next Raw Blocks AI campaign is ready to launch.`;

  const res = await generateVoiceover({
    text: sampleText,
    voice: safeId,
    apiKey,
    outputDir: previewsDir
  });

  if (!text && !res.isSimulated && fs.existsSync(res.audioPath)) {
    try {
      fs.renameSync(res.audioPath, cachedPath);
      return { audioPath: cachedPath, cached: false, voiceId: safeId };
    } catch (_) {
      return { audioPath: res.audioPath, cached: false, voiceId: safeId };
    }
  }

  return { audioPath: res.audioPath, cached: false, voiceId: safeId };
}
