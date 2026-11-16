import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();
import ffmpegStatic from 'ffmpeg-static';
import { generateVoiceover } from '../server/deepgramService.js';
import { getVideoMetadata } from '../server/ffmpegService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const uploadsDir = path.join(projectRoot, 'server', 'storage', 'uploads');
const rendersDir = path.join(projectRoot, 'server', 'storage', 'renders');
const audioDir = path.join(projectRoot, 'server', 'storage', 'audio');
const musicDir = path.join(projectRoot, 'server', 'storage', 'music');

async function run() {
  console.log('🚀 [Premium TOFU Producer] Starting Agentic Director Pipeline...');

  const capcutFile = path.join(uploadsDir, '202611030334_1793724181422.mp4');
  if (!fs.existsSync(capcutFile)) {
    throw new Error(`CapCut video not found at ${capcutFile}`);
  }

  const workDir = path.join(rendersDir, `tofu_build_${Date.now()}`);
  fs.mkdirSync(workDir, { recursive: true });

  // 1. Script with precise scene narration
  const scenes = [
    {
      id: 'scene_1_hook',
      in: 0.0,
      out: 4.8,
      speed: 1.0,
      topPill: '🚨 WAKE UP CALL',
      topPillColor: '0xef4444@0.9',
      headline: 'STOP STUDYING MARKETING THEORY',
      headlineColor: '0xfacc15',
      subBadge: 'Textbook Courses Waste Your Money',
      subColor: 'white',
      narration: "Stop wasting months studying outdated marketing theory.",
      zoom: false
    },
    {
      id: 'scene_2_dossier',
      in: 8.5,
      out: 16.5,
      speed: 1.15,
      topPill: '☕ CLIENT DOSSIER: JENNY MILLER',
      topPillColor: '0x6366f1@0.9',
      headline: 'BLEEDING $28 TO SELL AN $18 COFFEE BAG',
      headlineColor: '0xf87171',
      subBadge: 'Your Mission: Fix Customer Acquisition Cost',
      subColor: 'white',
      narration: "Meet your first client, Jenny Miller. Her coffee roastery is bleeding twenty-eight dollars just to sell an eighteen dollar bag of beans.",
      zoom: true
    },
    {
      id: 'scene_3_simulator',
      in: 30.5,
      out: 39.5,
      speed: 1.2,
      topPill: '⚡ LIVE SIMULATOR WORKBENCH',
      topPillColor: '0x0284c7@0.9',
      headline: 'CHAT WITH CLIENTS & RUN CAMPAIGNS',
      headlineColor: '0x38bdf8',
      subBadge: '100% Real-World Interactive Practice',
      subColor: 'white',
      narration: "You do not take multiple-choice quizzes. You chat directly with simulated business owners and solve real unit economics in live workbenches.",
      zoom: true
    },
    {
      id: 'scene_4_collaboration',
      in: 19.5,
      out: 27.5,
      speed: 1.0,
      topPill: '🎓 THE TRANSFORMATION',
      topPillColor: '0x10b981@0.9',
      headline: 'GRADUATE WITH A VERIFIED PORTFOLIO',
      headlineColor: '0x4ade80',
      subBadge: 'Prove Your Skills To Top Marketing Agencies',
      subColor: 'white',
      narration: "Master practical AI workflows, build confidence, and graduate with a battle-tested portfolio that top marketing agencies actually want to hire.",
      zoom: false
    },
    {
      id: 'scene_5_cta',
      in: 39.5,
      out: 43.93,
      speed: 0.9,
      topPill: '🚀 START YOUR FREE TRIAL',
      topPillColor: '0x10b981@0.95',
      headline: 'VISIT KRECHET.ACADEMY TODAY',
      headlineColor: '0xfacc15',
      subBadge: 'Real Clients • Real Campaigns • Zero Fluff',
      subColor: 'white',
      narration: "No outdated theory. Real clients, real campaigns, real results. Claim your free trial now at Krechet dot Academy.",
      zoom: false
    }
  ];

  // 2. Synthesize each scene voiceover with Deepgram Aura Orion
  console.log('🎙️ [Deepgram Aura] Synthesizing human voiceovers for each scene...');
  const voiceTracks = [];
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const voRes = await generateVoiceover({
      text: sc.narration,
      voice: 'aura-orion-en',
      apiKey: process.env.DEEPGRAM_API_KEY,
      outputDir: audioDir
    });
    console.log(`✓ Scene ${i + 1} voice: "${sc.narration.substring(0, 35)}..." (~${voRes.duration.toFixed(1)}s)`);
    voiceTracks.push({ ...voRes, sceneId: sc.id });
  }

  // Target 1080x1920 (standard high-end 9:16 vertical video)
  const targetW = 1080;
  const targetH = 1920;

  // 3. Process and cut each video segment with kinetic text overlays
  console.log('🎬 [FFmpeg Director] Cutting footage, adjusting speeds, and burning in dynamic text overlays...');
  const segmentPaths = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const vo = voiceTracks[i];
    const segOut = path.join(workDir, `cut_${i}.mp4`);

    // Ensure video segment matches or slightly exceeds voiceover duration
    const sourceSliceDuration = sc.out - sc.in;
    const effectiveSpeed = sc.speed || 1.0;
    const naturalCutDuration = sourceSliceDuration / effectiveSpeed;
    const finalDuration = Math.max(naturalCutDuration, vo.duration + 0.4);

    const vf = [];

    // Speed adjustment
    if (effectiveSpeed !== 1.0) {
      vf.push(`setpts=PTS/${effectiveSpeed}`);
    }

    // Punch-in zoom
    if (sc.zoom) {
      vf.push('crop=w=iw*0.92:h=ih*0.92');
    }

    // Scale & letterbox/crop to 1080x1920
    vf.push(`scale=${targetW}:${targetH}:force_original_aspect_ratio=increase`);
    vf.push(`crop=${targetW}:${targetH}`);
    vf.push('setsar=1');
    vf.push('fps=30');

    // Color saturation and contrast pop for professional look
    vf.push('eq=contrast=1.06:saturation=1.12:brightness=0.01');

    // Kinetic Direct-Response Text Overlays
    // 1. Top Category Pill Badge
    const safeTopPill = sc.topPill.replace(/'/g, "\\'").replace(/:/g, '\\:');
    vf.push(`drawtext=text='${safeTopPill}':fontcolor=white:fontsize=34:box=1:boxcolor=${sc.topPillColor}:boxborderw=10:x=(w-text_w)/2:y=130`);

    // 2. Main High-Converting Headline (Center-Lower)
    const safeHeadline = sc.headline.replace(/'/g, "\\'").replace(/:/g, '\\:');
    vf.push(`drawtext=text='${safeHeadline}':fontcolor=${sc.headlineColor}:fontsize=46:box=1:boxcolor=black@0.78:boxborderw=14:x=(w-text_w)/2:y=h*0.74`);

    // 3. Subtitle / Value Proof Badge (Below Headline)
    const safeSub = sc.subBadge.replace(/'/g, "\\'").replace(/:/g, '\\:');
    vf.push(`drawtext=text='${safeSub}':fontcolor=${sc.subColor}:fontsize=30:box=1:boxcolor=black@0.65:boxborderw=8:x=(w-text_w)/2:y=h*0.81`);

    const cutArgs = [
      '-nostdin',
      '-ss', sc.in.toString(),
      '-t', (finalDuration * effectiveSpeed).toString(),
      '-i', capcutFile,
      '-vf', vf.join(','),
      '-t', finalDuration.toFixed(2),
      '-an',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '19',
      '-pix_fmt', 'yuv420p',
      '-y',
      segOut
    ];

    await new Promise((res, rej) => {
      execFile(ffmpegStatic, cutArgs, (err, stdout, stderr) => {
        if (err) return rej(new Error(`Failed cutting scene ${i}: ${stderr || err.message}`));
        res();
      });
    });

    console.log(`✓ Processed Scene ${i + 1} (${sc.topPill}) -> ${finalDuration.toFixed(1)}s`);
    segmentPaths.push({ videoPath: segOut, audioPath: vo.audioPath, duration: finalDuration });
  }

  // 4. Concatenate segments together into master visual stream
  console.log('🎞️ [FFmpeg Assembler] Concatenating cut scenes into master visual stream...');
  const listFile = path.join(workDir, 'concat.txt');
  fs.writeFileSync(listFile, segmentPaths.map(s => `file '${s.videoPath.replace(/\\/g, '/')}'`).join('\n'));

  const masterVisualPath = path.join(workDir, 'master_visual.mp4');
  await new Promise((res, rej) => {
    execFile(ffmpegStatic, ['-nostdin', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-y', masterVisualPath], (err, stdout, stderr) => {
      if (err) return rej(new Error(`Concat error: ${stderr || err.message}`));
      res();
    });
  });

  const totalVisualMeta = await getVideoMetadata(masterVisualPath);
  const totalDuration = totalVisualMeta?.duration || 34.0;
  console.log(`✓ Master visual assembled: ~${totalDuration.toFixed(1)}s total runtime`);

  // 5. Build synchronized continuous voiceover audio track
  console.log('🎙️ [Audio Mix] Assembling synchronized voiceover track with exact scene timing...');
  const filterInputs = ['-nostdin'];
  let currentDelay = 300; // 300ms initial breather
  const delayFilters = [];

  for (let i = 0; i < segmentPaths.length; i++) {
    filterInputs.push('-i', segmentPaths[i].audioPath);
    delayFilters.push(`[${i}:a]adelay=${Math.round(currentDelay)}|${Math.round(currentDelay)}[delayed_${i}]`);
    currentDelay += (segmentPaths[i].duration * 1000);
  }

  // Mix all delayed voice segments into one single voice track
  const delayedLabels = segmentPaths.map((_, i) => `[delayed_${i}]`).join('');
  const combinedVoFilter = `${delayFilters.join(';')};${delayedLabels}amix=inputs=${segmentPaths.length}:normalize=0:dropout_transition=0[combined_vo]`;

  const fullVoicePath = path.join(workDir, 'full_voice.wav');
  await new Promise((res, rej) => {
    execFile(ffmpegStatic, [
      ...filterInputs,
      '-filter_complex', combinedVoFilter,
      '-map', '[combined_vo]',
      '-c:a', 'pcm_s16le',
      '-y',
      fullVoicePath
    ], (err, stdout, stderr) => {
      if (err) return rej(new Error(`Voice assembly error: ${stderr || err.message}`));
      res();
    });
  });

  // 6. Master Video: Mix Visual + Full Voice + Ducked Ambient Music
  console.log('🎵 [Mastering Pipeline] Mixing master visual, voiceover, and ducked background music...');
  const musicPath = path.join(musicDir, 'cycles_upbeat_inspiration.mp3');
  const finalFilename = `krechet_premium_tofu_ad_${Date.now()}.mp4`;
  const finalOutputPath = path.join(rendersDir, finalFilename);

  const masterFilter = `
    [1:a]volume=1.4,asplit=2[vo_loud][vo_sc];
    [2:a]volume=0.24[bgm_raw];
    [bgm_raw][vo_sc]sidechaincompress=threshold=0.12:ratio=3.5:attack=25:release=550[ducked_bgm];
    [vo_loud][ducked_bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,afade=t=out:st=${(totalDuration - 1.5).toFixed(1)}:d=1.5[aout]
  `.replace(/\s+/g, '');

  await new Promise((res, rej) => {
    execFile(ffmpegStatic, [
      '-nostdin',
      '-i', masterVisualPath,
      '-i', fullVoicePath,
      '-stream_loop', '-1',
      '-i', musicPath,
      '-filter_complex', masterFilter,
      '-map', '0:v',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-t', totalDuration.toFixed(2),
      '-y',
      finalOutputPath
    ], (err, stdout, stderr) => {
      if (err) return rej(new Error(`Final mastering error: ${stderr || err.message}`));
      res();
    });
  });

  // Cleanup temp files
  try {
    fs.rmSync(workDir, { recursive: true, force: true });
  } catch (_) {}

  const finalMeta = await getVideoMetadata(finalOutputPath);
  console.log(`\n🎉 [SUCCESS] Premium TOFU Video Ad Mastered!`);
  console.log(`📁 File: ${finalFilename}`);
  console.log(`⏱️ Duration: ${finalMeta.duration?.toFixed(1)}s`);
  console.log(`📐 Resolution: ${finalMeta.width}x${finalMeta.height}`);
  console.log(`🔗 URL: /storage/renders/${finalFilename}`);

  return {
    filename: finalFilename,
    url: `/storage/renders/${finalFilename}`,
    duration: finalMeta.duration
  };
}

run().catch(err => {
  console.error('❌ Pipeline failed:', err);
  process.exit(1);
});
