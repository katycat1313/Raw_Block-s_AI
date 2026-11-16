import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { generateVoiceover } from './deepgramService.js';
import { getVideoMetadata } from './ffmpegService.js';

/**
 * Agentic Master TOFU Video Director & Producer
 * Synchronizes narrator speech, on-screen text, visual transitions,
 * and kinetic badges in frame-accurate lockstep across the entire timeline.
 */
export async function producePremiumTofuVideo({
  storageDir,
  rendersDir,
  audioDir,
  musicDir,
  selectedVoice = 'flux-wade-en',
  selectedMusicId = 'cycles_upbeat_inspiration.mp3',
  customScenes = null,
  geminiKey = null,
  deepgramKey = null
}) {
  console.log('[TofuDirector] Initializing Precision-Synced Master TOFU Video Producer...');

  const uploadsDir = path.join(storageDir, 'uploads');
  const workDir = path.join(rendersDir, `tofu_precision_${Date.now()}`);
  fs.mkdirSync(workDir, { recursive: true });

  // 1. Discover Best Available Source Footage
  let capcutFile = null;
  const uploadFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
  
  // Prefer the user's latest mobile CapCut take
  const capcutCandidate = uploadFiles.find(f => f.startsWith('202611030334') && f.endsWith('.mp4'));
  if (capcutCandidate) {
    capcutFile = path.join(uploadsDir, capcutCandidate);
  } else {
    const fallback = uploadFiles.find(f => f.endsWith('.mp4') && fs.statSync(path.join(uploadsDir, f)).size > 100000);
    if (fallback) capcutFile = path.join(uploadsDir, fallback);
  }

  if (!capcutFile || !fs.existsSync(capcutFile)) {
    throw new Error('No valid source footage found in uploads to edit.');
  }

  const rawMeta = await getVideoMetadata(capcutFile);
  const totalDuration = rawMeta?.duration ? Number(rawMeta.duration.toFixed(2)) : 43.93;
  console.log(`[TofuDirector] Source: ${path.basename(capcutFile)} (${totalDuration}s)`);

  // 2. Precision-Locked Timeline Beats
  // Each beat is mapped to the exact on-screen video text and visual transition
  const beats = [
    {
      id: 'beat_1',
      startSec: 0.0,
      endSec: 3.5,
      voiceDelayMs: 300,
      text: 'Welcome to Krechet Academy.',
      topPill: '>> KRECHET ACADEMY',
      topPillColor: '0x6366f1@0.95',
      headline: 'THE HANDS-ON MARKETING SIMULATOR',
      headlineColor: '0xfacc15',
      subBadge: 'Act Out Real Marketer Workflows in a Safe Environment'
    },
    {
      id: 'beat_2',
      startSec: 3.5,
      endSec: 8.2,
      voiceDelayMs: 3600,
      text: 'Here we teach hands-on digital marketing with simulations, workshops, and quizzes.',
      topPill: '>> SAFE LEARNING SANDBOX',
      topPillColor: '0x0284c7@0.95',
      headline: 'SIMULATIONS • WORKSHOPS • QUIZZES',
      headlineColor: '0x38bdf8',
      subBadge: 'Learn by Acting Out Real Workflows'
    },
    {
      id: 'beat_3',
      startSec: 8.2,
      endSec: 14.5,
      voiceDelayMs: 8500,
      text: 'Each week you get a new client, and work together to hit real goals to pass.',
      topPill: '>> WEEKLY AGENCY CLIENTS',
      topPillColor: '0x8b5cf6@0.95',
      headline: 'WORK TOGETHER TO HIT CLIENT GOALS',
      headlineColor: '0xc084fc',
      subBadge: 'Pass Only When Your Client Succeeds'
    },
    {
      id: 'beat_4',
      startSec: 14.5,
      endSec: 19.5,
      voiceDelayMs: 14600,
      text: 'Like Jenny Miller. Audit her analytics and test creative approaches before guessing.',
      topPill: '>> CLIENT DOSSIER: JENNY MILLER',
      topPillColor: '0xef4444@0.95',
      headline: 'AUDIT ANALYTICS & TEST CREATIVE',
      headlineColor: '0xf87171',
      subBadge: 'See What Converts Before Going All-In'
    },
    {
      id: 'beat_5',
      startSec: 19.5,
      endSec: 25.5,
      voiceDelayMs: 19600,
      text: 'No boring videos here. You handle live curveballs with surprise havoc calls.',
      topPill: '>> ZERO BORING VIDEOS',
      topPillColor: '0xd97706@0.95',
      headline: 'LIVE CURVEBALLS & SURPRISE HAVOC CALLS',
      headlineColor: '0xfbbf24',
      subBadge: 'Curveballs Keep Your Mind Always Ready'
    },
    {
      id: 'beat_6a',
      startSec: 25.5,
      endSec: 28.5,
      voiceDelayMs: 25600,
      text: 'Run full SEO site audits.',
      topPill: '>> TECHNICAL AUDITS',
      topPillColor: '0x10b981@0.95',
      headline: 'DEEP SEO SITE AUDITS',
      headlineColor: '0x4ade80',
      subBadge: 'Real Agency Deliverables'
    },
    {
      id: 'beat_6b',
      startSec: 28.5,
      endSec: 31.8,
      voiceDelayMs: 28600,
      text: 'Build ad campaigns and A-B test creative.',
      topPill: '>> CAMPAIGN OPERATIONS',
      topPillColor: '0x06b6d4@0.95',
      headline: 'BUILD AD CAMPAIGNS & A/B TEST',
      headlineColor: '0x22d3ee',
      subBadge: 'Data-Driven Growth Strategies'
    },
    {
      id: 'beat_6c',
      startSec: 31.8,
      endSec: 34.8,
      voiceDelayMs: 31900,
      text: 'Message your client live, and defend your work.',
      topPill: '>> LIVE COLLABORATION',
      topPillColor: '0x8b5cf6@0.95',
      headline: 'MESSAGE CLIENTS & DEFEND YOUR WORK',
      headlineColor: '0xa78bfa',
      subBadge: 'Interview Prep for Day 1 on the Job'
    },
    {
      id: 'beat_7a',
      startSec: 34.8,
      endSec: 38.5,
      voiceDelayMs: 35000,
      text: 'Try your first week free. No credit card required.',
      topPill: '>> 100% FREE TRIAL',
      topPillColor: '0x10b981@0.95',
      headline: 'START WEEK 1 • ZERO RISK',
      headlineColor: '0x4ade80',
      subBadge: 'No Credit Card Required'
    },
    {
      id: 'beat_7b',
      startSec: 38.5,
      endSec: totalDuration,
      voiceDelayMs: 38600,
      text: 'What are you waiting for? Head to Krechet dot Academy today.',
      topPill: '>> CLAIM YOUR ACCESS',
      topPillColor: '0xfacc15@0.95',
      headline: 'VISIT KRECHET.ACADEMY TODAY',
      headlineColor: '0xfacc15',
      subBadge: 'The Safe Sandbox For Real Marketers'
    }
  ];

  // 3. Synthesize Studio Voiceover
  console.log(`[TofuDirector] Synthesizing studio voiceover with ${selectedVoice}...`);
  const effectiveDeepgramKey = deepgramKey || process.env.DEEPGRAM_API_KEY;
  const audioTracks = [];

  for (const beat of beats) {
    const res = await generateVoiceover({
      text: beat.text,
      voice: selectedVoice || 'flux-wade-en',
      apiKey: effectiveDeepgramKey,
      outputDir: audioDir
    });
    console.log(`[TofuDirector] Voice [${beat.id}] (${res.duration.toFixed(2)}s) scheduled at ${beat.voiceDelayMs}ms`);
    audioTracks.push({ ...beat, audioPath: res.audioPath, duration: res.duration });
  }

  // 4. Mix Voiceover Track with Exact Timestamp Offsets
  console.log('[TofuDirector] Assembling frame-locked voiceover timeline...');
  const voInputs = ['-nostdin'];
  const delayFilters = [];
  for (let i = 0; i < audioTracks.length; i++) {
    voInputs.push('-i', audioTracks[i].audioPath);
    delayFilters.push(`[${i}:a]adelay=${audioTracks[i].voiceDelayMs}|${audioTracks[i].voiceDelayMs}[delayed_${i}]`);
  }
  const delayedLabels = audioTracks.map((_, i) => `[delayed_${i}]`).join('');
  const mixFilter = `${delayFilters.join(';')};${delayedLabels}amix=inputs=${audioTracks.length}:normalize=0:dropout_transition=0,apad=whole_dur=${totalDuration}[combined_vo]`;

  const fullVoiceWav = path.join(workDir, 'full_voice.wav');
  await new Promise((res, rej) => {
    execFile(ffmpegStatic, [
      ...voInputs,
      '-filter_complex', mixFilter,
      '-map', '[combined_vo]',
      '-ar', '44100',
      '-ac', '2',
      '-y', fullVoiceWav
    ], (err, stdout, stderr) => {
      if (err) return rej(new Error(`Voice mix error: ${stderr || err.message}`));
      res();
    });
  });

  // 5. Mix with Ducked Background Music
  const musicFile = path.join(musicDir, selectedMusicId || 'cycles_upbeat_inspiration.mp3');
  const finalAudioWav = path.join(workDir, 'final_ducked_audio.wav');
  if (fs.existsSync(musicFile)) {
    console.log(`[TofuDirector] Ducking music track (${path.basename(musicFile)}) under voice...`);
    const duckFilter = `[1:a]aloop=loop=-1:size=2e+09,volume=0.28[bg_loop];[bg_loop][0:a]sidechaincompress=threshold=0.08:ratio=6:attack=30:release=350[ducked_bg];[0:a]volume=1.25[boosted_vo];[ducked_bg][boosted_vo]amix=inputs=2:weights=1 1[final_a]`;
    await new Promise((res, rej) => {
      execFile(ffmpegStatic, [
        '-nostdin',
        '-i', fullVoiceWav,
        '-i', musicFile,
        '-filter_complex', duckFilter,
        '-map', '[final_a]',
        '-t', totalDuration.toString(),
        '-y', finalAudioWav
      ], (err, stdout, stderr) => {
        if (err) return rej(new Error(`Music ducking error: ${stderr || err.message}`));
        res();
      });
    });
  } else {
    fs.copyFileSync(fullVoiceWav, finalAudioWav);
  }

  // 6. Build Frame-Locked Kinetic Typography Overlays
  console.log('[TofuDirector] Burning frame-locked kinetic typography badges...');
  const targetW = 1080;
  const targetH = 1920;
  const vf = [
    `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase`,
    `crop=${targetW}:${targetH}`,
    'setsar=1',
    'fps=30',
    'eq=contrast=1.06:saturation=1.12:brightness=0.01'
  ];

  for (const b of beats) {
    const s = b.startSec.toFixed(1);
    const e = b.endSec.toFixed(1);

    // 1. Top Category Pill Badge
    const safeTop = b.topPill.replace(/'/g, "\\'").replace(/:/g, '\\:');
    vf.push(`drawtext=text='${safeTop}':fontcolor=white:fontsize=34:box=1:boxcolor=${b.topPillColor}:boxborderw=10:x=(w-text_w)/2:y=130:enable='between(t\\,${s}\\,${e})'`);

    // 2. Center-Lower Headline Badge
    const safeHeadline = b.headline.replace(/'/g, "\\'").replace(/:/g, '\\:');
    vf.push(`drawtext=text='${safeHeadline}':fontcolor=${b.headlineColor}:fontsize=44:box=1:boxcolor=black@0.78:boxborderw=14:x=(w-text_w)/2:y=h*0.74:enable='between(t\\,${s}\\,${e})'`);

    // 3. Sub-Badge
    const safeSub = b.subBadge.replace(/'/g, "\\'").replace(/:/g, '\\:');
    vf.push(`drawtext=text='${safeSub}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.65:boxborderw=8:x=(w-text_w)/2:y=h*0.81:enable='between(t\\,${s}\\,${e})'`);
  }

  // 7. Render Final Master Video
  const outputFilename = `krechet_precision_synced_tofu_${Date.now()}.mp4`;
  const finalVideoPath = path.join(rendersDir, outputFilename);

  console.log('[TofuDirector] Rendering final synchronized master video...');
  await new Promise((res, rej) => {
    execFile(ffmpegStatic, [
      '-nostdin',
      '-i', capcutFile,
      '-i', finalAudioWav,
      '-filter_complex', `[0:v]${vf.join(',')}[v_out]`,
      '-map', '[v_out]',
      '-map', '1:a',
      '-t', totalDuration.toString(),
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '19',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y', finalVideoPath
    ], (err, stdout, stderr) => {
      if (err) return rej(new Error(`Final render error: ${stderr || err.message}`));
      res();
    });
  });

  const finalMeta = await getVideoMetadata(finalVideoPath);
  const sizeMb = (fs.statSync(finalVideoPath).size / 1024 / 1024).toFixed(2);

  console.log(`[TofuDirector] Master render complete: ${outputFilename} (${finalMeta.duration}s, ${sizeMb} MB)`);

  // Cleanup temporary working directory
  try {
    fs.rmSync(workDir, { recursive: true, force: true });
  } catch (_) {}

  return {
    filename: outputFilename,
    path: finalVideoPath,
    url: `/storage/renders/${outputFilename}`,
    duration: finalMeta.duration,
    sizeMb,
    title: '🔥 Krechet Master TOFU Video Ad (Precision Frame & Audio Locked)',
    badge: '🔥 Master Synced'
  };
}
