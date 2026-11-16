import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, spawn } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import ffmpegStatic from 'ffmpeg-static';
import { generateVoiceover } from './deepgramService.js';
import { getVideoMetadata } from './ffmpegService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const storageDir = path.join(projectRoot, 'server', 'storage');
const rendersDir = path.join(storageDir, 'renders');
const audioDir = path.join(storageDir, 'audio');
const musicDir = path.join(storageDir, 'music');
const brainDir = 'C:/Users/katyc/.gemini/antigravity/brain/fb2a50f1-3988-4a29-9397-d361b482efae';

function execFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegStatic, args, { maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${err.message}\n${stderr}`));
      resolve(stdout);
    });
  });
}

const AVAILABLE_PLATFORM_ASSETS = [
  { name: 'APP_UI_MarketSim_Home.png', description: 'Krechet Academy catalog of active client simulations and syllabus' },
  { name: 'client_dossier.jpg', description: 'Client onboarding dossier with unit economics, CAC, margins, and brand brief' },
  { name: 'APP_UI_MarketSim_Ad_Simulation.png', description: 'Live Google Ads search query audit, identifying budget waste and negative match keywords' },
  { name: 'siteseo_116s.jpg', description: 'On-page conversion rate optimization, bounce rate analysis, and landing page audit' },
  { name: 'handled_master_gads.jpg', description: 'Google Ads auction engine replica with CPC bidding and audience targeting' },
  { name: 'APP_UI_MarketSim_AB_Testing_Lab.png', description: 'A/B testing split test laboratory with statistical significance metrics' },
  { name: 'dashboard_view.jpg', description: 'Client growth dashboard showing ROAS recovery and conversion lift' },
  { name: 'check_agent_rec.jpg', description: 'Recruiter resume review and portfolio proof verification' },
  { name: 'mentor_avatar_professional_a_png_1793823610982.jpg', description: 'Socratic AI mentor feedback and strategy evaluation' }
];

const SYSTEM_INSTRUCTION = `
You are the Executive Creative Director for Krechet Academy commercials and brand films.

BRAND CORE RULES:
1. PRODUCT: Krechet Academy is a hands-on Digital Marketing Simulation Academy where students manage simulated business clients, audit live PPC campaigns, fix website bounce issues, and defend their work in mock interviews.
2. STRICT VOCABULARY RULE: NEVER use aviation metaphors (NO "flight simulator", NO "cockpit", NO "flight hours", NO "drones", NO "aerospace"). Use agency terms: "simulation hours", "agency workbench", "client retainers", "PPC ad auction", "search query audit", "ROAS", "conversion rate", "case study portfolio".
3. REALISM MANDATE: Avoid all cheesy stock acting. Visual prompts for Gemini Omni MUST be grounded, naturalistic, 35mm documentary film cinematography (A24 / Apple / MasterClass style), with candid, authentic lighting and non-posed realism.
4. AVAILABLE ASSETS: When showing the software workbench or platform features, prefer using available platform screenshot filenames:
${AVAILABLE_PLATFORM_ASSETS.map(a => ` - "${a.name}": ${a.description}`).join('\n')}

Return JSON with this exact schema:
{
  "title": "Commercial Title",
  "logline": "1-sentence summary of the story arc",
  "targetDurationSeconds": 60,
  "scenes": [
    {
      "sceneNum": 1,
      "title": "Short Scene Title",
      "narration": "Exact spoken voiceover narration line.",
      "visualType": "omni_video" | "software_simulation",
      "visualPrompt": "Detailed prompt for Gemini Omni video generation OR description of software screen motion",
      "sourceAsset": "filename from available assets if software_simulation, else null",
      "durationSec": 3.5
    }
  ],
  "outroText": "Krechet Academy. Learn by doing. Get hired by proving you can."
}
`;

/**
 * 1. Plan a Commercial from User Goal / Scenario
 */
export async function planCommercial({ goal, targetDuration = 60, apiKey }) {
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) throw new Error('GEMINI_API_KEY is required.');

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const prompt = `Create a realistic, documentary-style commercial plan for Krechet Academy based on this user scenario / goal:
"${goal || 'A young marketer exhausted by 100 job rejections discovers practical simulation at Krechet Academy, manages real client crises, builds proof of work, and lands an agency job.'}"
Target Duration: ~${targetDuration} seconds. Typically 10 to 18 punchy scenes.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json'
    }
  });

  return JSON.parse(response.text);
}

/**
 * 2. Refine an Existing Commercial Plan Based on User Feedback Prompt
 */
export async function refineCommercial({ currentPlan, feedbackPrompt, apiKey }) {
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) throw new Error('GEMINI_API_KEY is required.');

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  const prompt = `Here is the current commercial plan:
${JSON.stringify(currentPlan, null, 2)}

The user provided this feedback / requested changes:
"${feedbackPrompt}"

Update the commercial plan according to the user's feedback. You can modify narration, change visual prompts, re-time scenes, or add/remove scenes. Return the complete updated JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json'
    }
  });

  return JSON.parse(response.text);
}

/**
 * 3. Generate Gemini Omni Video Clips via Python batch engine
 */
export async function generateOmniVideos(omniJobs, onProgress) {
  if (!omniJobs || omniJobs.length === 0) return [];

  const batchJsonPath = path.join(rendersDir, `omni_batch_${Date.now()}.json`);
  fs.writeFileSync(batchJsonPath, JSON.stringify(omniJobs, null, 2), 'utf8');

  const pythonBin = 'C:\\Users\\katyc\\AppData\\Local\\Python\\bin\\python3.exe';
  const scriptPath = 'C:\\Users\\katyc\\.gemini\\config\\plugins\\gemini-api\\skills\\gemini-omni-flash-api\\scripts\\video\\generate_video.py';

  return new Promise((resolve, reject) => {
    onProgress?.(`Starting Gemini Omni generation for ${omniJobs.length} video scene(s)...`);
    const proc = spawn(pythonBin, [
      scriptPath,
      '--batch', batchJsonPath,
      '--concurrency', '2'
    ], {
      env: { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY }
    });

    proc.stdout.on('data', (d) => {
      const line = d.toString();
      console.log('[Omni Batch]', line.trim());
      if (line.includes('Generation complete') || line.includes('SUCCESS') || line.includes('Downloading')) {
        onProgress?.(line.trim());
      }
    });

    proc.stderr.on('data', (d) => {
      console.warn('[Omni Batch Stderr]', d.toString().trim());
    });

    proc.on('close', (code) => {
      try { fs.unlinkSync(batchJsonPath); } catch (_) {}
      if (code !== 0) {
        return reject(new Error(`Gemini Omni batch generation failed with exit code ${code}`));
      }
      resolve(omniJobs.map(j => j.output));
    });
  });
}

/**
 * 4. Master Production: End-to-End Voiceover + Video + UI Motion + Sound Ducking
 */
export async function produceCommercialVideo({ plan, voiceId = 'aura-orion-en', musicTrack = 'chill_tech_ambient.mp3', onProgress }) {
  const buildId = Date.now();
  const workDir = path.join(rendersDir, `commercial_build_${buildId}`);
  fs.mkdirSync(workDir, { recursive: true });
  try {
    fs.writeFileSync(path.join(workDir, 'plan.json'), JSON.stringify(plan, null, 2), 'utf8');
    fs.writeFileSync(path.join(workDir, 'meta.json'), JSON.stringify({ voiceId, musicTrack, buildId }, null, 2), 'utf8');
    fs.writeFileSync(path.join(storageDir, 'last_commercial_plan.json'), JSON.stringify(plan, null, 2), 'utf8');
  } catch (_) {}

  const apiKey = process.env.DEEPGRAM_API_KEY || 'c9ebd467b6557a10491d40451e195769a48a9b36';

  // Step 1: Synthesize voiceovers with retry
  onProgress?.(`🎙️ [1/4] Synthesizing Deepgram voiceover (${voiceId}) tracks...`);
  const voiceTracks = [];
  for (let i = 0; i < plan.scenes.length; i++) {
    const sc = plan.scenes[i];
    onProgress?.(`  Generating voiceover ${sc.sceneNum}/${plan.scenes.length}: "${sc.narration.substring(0, 35)}..."`);
    let vo = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      vo = await generateVoiceover({
        text: sc.narration,
        voice: voiceId,
        apiKey,
        outputDir: audioDir
      });
      if (!vo.isSimulated) break;
      await new Promise(r => setTimeout(r, 600));
    }
    voiceTracks.push(vo);
  }

  // Step 2: Check which omni_video scenes need generation (with smart build-cache reuse)
  const omniJobs = [];
  const sceneVideoMap = {};

  for (let i = 0; i < plan.scenes.length; i++) {
    const sc = plan.scenes[i];
    if (sc.visualType === 'omni_video') {
      const vidOut = path.join(workDir, `omni_scene_${sc.sceneNum}.mp4`);
      sceneVideoMap[sc.sceneNum] = vidOut;

      let foundCached = false;
      try {
        const buildDirs = fs.readdirSync(rendersDir).filter(f => f.startsWith('commercial_build_') && f !== `commercial_build_${buildId}`);
        for (const b of buildDirs) {
          const candidate = path.join(rendersDir, b, `omni_scene_${sc.sceneNum}.mp4`);
          if (fs.existsSync(candidate) && fs.statSync(candidate).size > 100000) {
            fs.copyFileSync(candidate, vidOut);
            foundCached = true;
            console.log(`[Omni Cache] Reusing existing Omni video for Scene ${sc.sceneNum} from ${b}`);
            break;
          }
        }
      } catch (_) {}

      if (!foundCached) {
        omniJobs.push({
          prompt: sc.visualPrompt,
          duration: Math.min(10, Math.max(4, Math.round(sc.durationSec || 4))),
          resolution: '720p',
          aspect_ratio: '16:9',
          model: 'gemini-omni-1.2-flash',
          output: vidOut
        });
      }
    }
  }

  if (omniJobs.length > 0) {
    onProgress?.(`🎥 [2/4] Generating ${omniJobs.length} video scene(s) via Gemini Omni 1.2 Flash...`);
    await generateOmniVideos(omniJobs, onProgress);
  } else {
    onProgress?.('🎥 [2/4] Using pre-rendered/software simulation assets...');
  }

  // Step 3: Render individual scenes (1920x1080)
  onProgress?.('🎞️ [3/4] Assembling 1080p scenes and applying kinetic captions...');
  const segmentFiles = [];

  for (let i = 0; i < plan.scenes.length; i++) {
    const sc = plan.scenes[i];
    const vo = voiceTracks[i];
    const segFinal = path.join(workDir, `seg_${String(i).padStart(2, '0')}.mp4`);
    const sceneDuration = Number((Math.max(3.0, vo.duration + 0.8)).toFixed(2));

    let safeNarration = sc.narration.replace(/:/g, '\\:').replace(/'/g, '');
    if (safeNarration.length > 55) {
      const mid = Math.floor(safeNarration.length / 2);
      const spaceIdx = safeNarration.indexOf(' ', mid - 10);
      if (spaceIdx !== -1 && spaceIdx < mid + 15) {
        safeNarration = safeNarration.slice(0, spaceIdx) + '\n' + safeNarration.slice(spaceIdx + 1);
      }
    }

    const fontOption = "font=Segoe UI:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=12:line_spacing=6:x=(w-text_w)/2:y=h-130";
    const audioInputPath = path.resolve(projectRoot, vo.audioPath);

    const isVideo = sc.visualType === 'omni_video' && fs.existsSync(sceneVideoMap[sc.sceneNum]);

    if (isVideo) {
      await execFfmpeg([
        '-y',
        '-i', sceneVideoMap[sc.sceneNum],
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
      let imgPath = path.join(brainDir, sc.sourceAsset || 'APP_UI_MarketSim_Home.png');
      if (!fs.existsSync(imgPath)) imgPath = path.join(brainDir, 'APP_UI_MarketSim_Home.png');

      const numFrames = Math.round(sceneDuration * 30);
      const zoomFilter = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0010,1.18)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${numFrames}:s=1920x1080:fps=30`;

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
    onProgress?.(`  ✓ Rendered Scene ${sc.sceneNum}: duration ${sceneDuration.toFixed(1)}s`);
  }

  // Step 4: Outro card
  const titleCardOut = path.join(workDir, 'seg_outro.mp4');
  const outroVoice = await generateVoiceover({
    text: plan.outroText || "Krechet Academy. Learn by doing. Get hired by proving you can.",
    voice: voiceId,
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

  // Step 5: Concat & sidechain ducked music
  onProgress?.('🎶 [4/4] Stitching master timeline and ducking background music...');
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

  const musicPath = path.join(musicDir, musicTrack || 'chill_tech_ambient.mp3');
  const finalFilename = `commercial_${buildId}.mp4`;
  const finalOutputPath = path.join(rendersDir, finalFilename);
  const finalArtifactPath = path.join(brainDir, 'krechet_commercial_18_scenes_master.mp4');

  await execFfmpeg([
    '-y',
    '-i', unmixedMaster,
    '-stream_loop', '-1',
    '-i', musicPath,
    '-filter_complex', `[0:a]volume=1.55,acompressor=threshold=-18dB:ratio=3:attack=5:release=50[voice];[1:a]volume=0.045,equalizer=f=1000:width_type=h:width=2000:g=-4[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]`,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    finalOutputPath
  ]);

  fs.copyFileSync(finalOutputPath, finalArtifactPath);
  const finalMeta = await getVideoMetadata(finalOutputPath);

  return {
    filename: finalFilename,
    renderUrl: `/storage/renders/${finalFilename}`,
    duration: finalMeta.duration,
    artifactPath: finalArtifactPath
  };
}
