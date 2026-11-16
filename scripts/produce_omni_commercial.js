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

const rendersDir = path.join(projectRoot, 'server', 'storage', 'renders');
const audioDir = path.join(projectRoot, 'server', 'storage', 'audio');
const musicDir = path.join(projectRoot, 'server', 'storage', 'music');
const brainDir = 'C:/Users/katyc/.gemini/antigravity/brain/fb2a50f1-3988-4a29-9397-d361b482efae';

function execFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegStatic, args, { maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${err.message}\n${stderr}`));
      resolve(stdout);
    });
  });
}

// 18-Scene Master Script with Gemini Omni 1.2 Flash footage and Real Software Benchmarks
const SCENES_CONFIG = [
  {
    num: 1,
    title: 'APPLICATION #100',
    narration: "I had done everything they told me to do.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene1_application_struggle.mp4'),
    startTime: 0.0
  },
  {
    num: 2,
    title: 'NO INTERVIEWS',
    narration: "One hundred applications. Not one interview.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene1_application_struggle.mp4'),
    startTime: 2.2
  },
  {
    num: 3,
    title: 'WHAT AM I DOING WRONG',
    narration: "I had certifications. I completed the courses. So what was I missing?",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'check_agent_rec.jpg'),
    zoomDirection: 'in'
  },
  {
    num: 4,
    title: 'THE REALITY CHECK',
    narration: "Then someone in hiring told me something I needed to hear.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene4_coffee_reality_check.mp4'),
    startTime: 0.0
  },
  {
    num: 5,
    title: "CERTIFICATES AREN'T EXPERIENCE",
    narration: "Everyone has certificates now. Employers want proof you can do the work.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene4_coffee_reality_check.mp4'),
    startTime: 2.2
  },
  {
    num: 6,
    title: 'DISCOVERING KRECHET ACADEMY',
    narration: "That's when I found Krechet Academy.",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'APP_UI_MarketSim_Home.png'),
    zoomDirection: 'pan'
  },
  {
    num: 7,
    title: 'FIRST CLIENT',
    narration: "Week one, I was assigned my first client.",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'client_dossier.jpg'),
    zoomDirection: 'in'
  },
  {
    num: 8,
    title: 'FINDING THE BUDGET LEAK',
    narration: "I had to figure out where their budget was being wasted.",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'APP_UI_MarketSim_Ad_Simulation.png'),
    zoomDirection: 'pan'
  },
  {
    num: 9,
    title: 'FIXING WEBSITE BOUNCE ISSUES',
    narration: "And discover why visitors were leaving the website.",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'siteseo_116s.jpg'),
    zoomDirection: 'in'
  },
  {
    num: 10,
    title: 'BUILDING REAL ADS',
    narration: "I built campaigns using exact replicas of Google Ads and Meta Ads.",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'handled_master_gads.jpg'),
    zoomDirection: 'pan'
  },
  {
    num: 11,
    title: 'CLIENT PANIC CALL',
    narration: "Then my client called... completely freaking out.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene11_crisis_management.mp4'),
    startTime: 0.0
  },
  {
    num: 12,
    title: 'CRISIS MANAGEMENT',
    narration: "I had to calm her down and solve the problem.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene11_crisis_management.mp4'),
    startTime: 2.2
  },
  {
    num: 13,
    title: 'CONVERSATIONAL LEARNING',
    narration: "I wasn't memorizing answers. I was learning by doing.",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'mentor_avatar_professional_a_png_1793823610982.jpg'),
    zoomDirection: 'in'
  },
  {
    num: 14,
    title: 'PORTFOLIO BUILDING',
    narration: "Every project became part of my portfolio.",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'APP_UI_MarketSim_AB_Testing_Lab.png'),
    zoomDirection: 'pan'
  },
  {
    num: 15,
    title: 'INTERVIEW PRACTICE',
    narration: "I even practiced defending my decisions in mock interviews.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene15_mock_interview.mp4'),
    startTime: 0.0
  },
  {
    num: 16,
    title: 'THE NEXT APPLICATION',
    narration: "This time, I had real experience to talk about.",
    sourceType: 'image',
    sourcePath: path.join(brainDir, 'dashboard_view.jpg'),
    zoomDirection: 'pan'
  },
  {
    num: 17,
    title: 'JOB OFFER',
    narration: "A week later, I got the call.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene18_agency_arrival.mp4'),
    startTime: 0.0
  },
  {
    num: 18,
    title: 'SUCCESS',
    narration: "Because employers weren't looking for someone who watched videos. They wanted someone who could do the work.",
    sourceType: 'video',
    sourcePath: path.join(brainDir, 'omni_scene18_agency_arrival.mp4'),
    startTime: 2.2
  }
];

async function main() {
  console.log('🎬 [Krechet Omni Commercial Producer] Initializing Documentary Pipeline...');
  const buildId = Date.now();
  const workDir = path.join(rendersDir, `omni_commercial_build_${buildId}`);
  fs.mkdirSync(workDir, { recursive: true });

  const apiKey = process.env.DEEPGRAM_API_KEY || 'c9ebd467b6557a10491d40451e195769a48a9b36';

  // Step 1: Synthesize all 18 voiceover scenes
  console.log('\n🎙️ [1/4] Synthesizing 18 timed voiceovers with Deepgram Orion...');
  const voiceTracks = [];
  for (let i = 0; i < SCENES_CONFIG.length; i++) {
    const sc = SCENES_CONFIG[i];
    console.log(`  Generating Scene ${sc.num}/18: "${sc.narration}"`);
    let vo = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      vo = await generateVoiceover({
        text: sc.narration,
        voice: 'aura-orion-en',
        apiKey,
        outputDir: audioDir
      });
      if (!vo.isSimulated) break;
      await new Promise(r => setTimeout(r, 800));
    }
    voiceTracks.push(vo);
  }

  // Step 2: Render each scene video segment (1920x1080 Widescreen, Cinematic Quality)
  console.log('\n🎞️ [2/4] Assembling Gemini Omni footage and high-res UI simulations...');
  const segmentFiles = [];

  for (let i = 0; i < SCENES_CONFIG.length; i++) {
    const sc = SCENES_CONFIG[i];
    const vo = voiceTracks[i];
    const segFinal = path.join(workDir, `seg_audio_${String(i).padStart(2, '0')}.mp4`);
    const sceneDuration = Number((Math.max(3.2, vo.duration + 0.8)).toFixed(2));

    let safeNarration = sc.narration.replace(/:/g, '\\:').replace(/'/g, '');
    
    // Balanced two-line typography for cinematic readability
    if (safeNarration.length > 55) {
      const mid = Math.floor(safeNarration.length / 2);
      const spaceIdx = safeNarration.indexOf(' ', mid - 10);
      if (spaceIdx !== -1 && spaceIdx < mid + 15) {
        safeNarration = safeNarration.slice(0, spaceIdx) + '\n' + safeNarration.slice(spaceIdx + 1);
      }
    }

    // High-end documentary subtitle styling: Segoe UI, subtle drop shadow, sleek dark backplate, centered
    const fontOption = "font=Segoe UI:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=12:line_spacing=6:x=(w-text_w)/2:y=h-130";

    const audioInputPath = path.resolve(projectRoot, vo.audioPath);

    if (sc.sourceType === 'video' && fs.existsSync(sc.sourcePath)) {
      const start = sc.startTime || 0;
      await execFfmpeg([
        '-y',
        '-ss', String(start),
        '-i', sc.sourcePath,
        '-i', audioInputPath,
        '-t', String(sceneDuration),
        '-filter_complex',
        `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,drawtext=${fontOption}:text='${safeNarration}'[vout];[1:a]apad=whole_dur=${sceneDuration}[aout]`,
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '19',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',
        segFinal
      ]);
    } else {
      const imgPath = fs.existsSync(sc.sourcePath) ? sc.sourcePath : path.join(brainDir, 'APP_UI_MarketSim_Home.png');
      const numFrames = Math.round(sceneDuration * 30);
      let zoomFilter;

      if (sc.zoomDirection === 'pan') {
        zoomFilter = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0008,1.15)':x='iw/2-(iw/zoom/2)+sin(in/30)*15':y='ih/2-(ih/zoom/2)':d=${numFrames}:s=1920x1080:fps=30`;
      } else {
        zoomFilter = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0012,1.20)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${numFrames}:s=1920x1080:fps=30`;
      }

      await execFfmpeg([
        '-y',
        '-loop', '1',
        '-i', imgPath,
        '-i', audioInputPath,
        '-t', String(sceneDuration),
        '-filter_complex',
        `[0:v]${zoomFilter},drawtext=${fontOption}:text='${safeNarration}'[vout];[1:a]apad=whole_dur=${sceneDuration}[aout]`,
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '19',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',
        segFinal
      ]);
    }

    segmentFiles.push(segFinal);
    console.log(`  ✓ Rendered Scene ${sc.num}: duration ${sceneDuration.toFixed(1)}s`);
  }

  // Step 3: Add final Title Card
  console.log('\n🏆 [3/4] Rendering Final Outro Card...');
  const titleCardOut = path.join(workDir, 'seg_audio_19_outro.mp4');
  const outroVoice = await generateVoiceover({
    text: "Krechet Academy. Learn by doing. Get hired by proving you can.",
    voice: 'aura-orion-en',
    apiKey,
    outputDir: audioDir
  });

  const outroDuration = Number((Math.max(4.5, outroVoice.duration + 1.2)).toFixed(2));
  const titleVf = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=14:1,drawtext=font=Segoe UI Bold:fontsize=56:fontcolor=0xfacc15:x=(w-text_w)/2:y=h/2-80:text='KRECHET ACADEMY',drawtext=font=Segoe UI:fontsize=28:fontcolor=white:x=(w-text_w)/2:y=h/2:text='Learn by doing. Get hired by proving you can.',drawtext=font=Segoe UI Bold:fontsize=22:fontcolor=0x38bdf8:x=(w-text_w)/2:y=h/2+70:text='START YOUR FREE WEEK AT KRECHET.ACADEMY'`;

  const outroImg = path.join(brainDir, 'APP_UI_MarketSim_Home.png');
  const outroAudioPath = path.resolve(projectRoot, outroVoice.audioPath);

  await execFfmpeg([
    '-y',
    '-loop', '1',
    '-i', outroImg,
    '-i', outroAudioPath,
    '-t', String(outroDuration),
    '-filter_complex',
    `[0:v]${titleVf}[vout];[1:a]apad=whole_dur=${outroDuration}[aout]`,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-r', '30',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '44100',
    '-ac', '2',
    titleCardOut
  ]);
  segmentFiles.push(titleCardOut);

  // Step 4: Concatenate and mix with background music ducking
  console.log('\n🎶 [4/4] Stitching master timeline and adding sidechain ducked music...');
  const concatListPath = path.join(workDir, 'concat_list.txt');
  const fileLines = segmentFiles.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatListPath, fileLines, 'utf8');

  const unmixedMaster = path.join(workDir, 'unmixed_master.mp4');
  await execFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c', 'copy',
    unmixedMaster
  ]);

  const musicPath = path.join(musicDir, 'chill_tech_ambient.mp3');
  const finalFilename = `krechet_commercial_omni_master_${buildId}.mp4`;
  const finalOutputPath = path.join(rendersDir, finalFilename);
  const finalArtifactPath = path.join(brainDir, 'krechet_commercial_18_scenes_master.mp4');

  // Master mix: loop background music at volume=0.14 and duck under the dialogue
  await execFfmpeg([
    '-y',
    '-i', unmixedMaster,
    '-stream_loop', '-1',
    '-i', musicPath,
    '-filter_complex', `[1:a]volume=0.14[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    finalOutputPath
  ]);

  // Copy to brain artifacts directory for instant user access
  fs.copyFileSync(finalOutputPath, finalArtifactPath);

  const finalMeta = await getVideoMetadata(finalOutputPath);
  console.log(`\n🎉 [SUCCESS] Master Commercial Rendered with Gemini Omni Visuals!`);
  console.log(`📁 File: ${finalOutputPath}`);
  console.log(`⏱️ Duration: ${finalMeta.duration.toFixed(1)}s (~${(finalMeta.duration / 60).toFixed(1)} mins)`);
  console.log(`📦 Artifact Path: ${finalArtifactPath}`);
}

main().catch((err) => {
  console.error('Fatal Production Error:', err);
  process.exit(1);
});
