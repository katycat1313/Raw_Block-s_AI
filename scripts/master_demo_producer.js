import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { generateVoiceover } from '../server/deepgramService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FFMPEG = ffmpegStatic;

async function main() {
  const audioDir = path.join(rootDir, 'server', 'storage', 'audio');
  const musicPath = path.join(rootDir, 'server', 'storage', 'music', 'chill_tech_ambient.mp3');
  const videoPath = path.join(rootDir, 'server', 'storage', 'uploads', '202611030334_1793724181422.mp4');
  const rendersDir = path.join(rootDir, 'server', 'storage', 'renders');
  if (!fs.existsSync(rendersDir)) fs.mkdirSync(rendersDir, { recursive: true });

  const renderFilename = `krechet_demo_mastered_${Date.now()}.mp4`;
  const outputPath = path.join(rendersDir, renderFilename);

  console.log('[1/3] 🎙️ Synthesizing 4 timed voiceover acts with Deepgram Orion...');

  // Act 1: 0:00 - 0:08 (Platform Hook)
  const p1 = await generateVoiceover({
    text: "This is Krechet Academy. The hands-on marketing growth simulator where you learn by actually doing.",
    voice: "aura-orion-en",
    apiKey: "c9ebd467b6557a10491d40451e195769a48a9b36",
    outputDir: audioDir
  });
  console.log(`  ✅ Act 1 (Hook): ${p1.duration.toFixed(2)}s`);

  // Act 2: 0:08 - 0:20 (Client Dossier)
  const p2 = await generateVoiceover({
    text: "Meet your first real-world agency client: Jenny Miller at Jenny's Artisan Java and Roastery. Her business is bleeding twenty-eight dollars just to sell an eighteen dollar bag of beans. And it is your job to fix it.",
    voice: "aura-orion-en",
    apiKey: "c9ebd467b6557a10491d40451e195769a48a9b36",
    outputDir: audioDir
  });
  console.log(`  ✅ Act 2 (Client Dossier): ${p2.duration.toFixed(2)}s`);

  // Act 3: 0:20 - 0:30 (Live Campaigns & Testing)
  const p3 = await generateVoiceover({
    text: "No boring lectures. You step into the agency role, audit the unit economics, and build live ad campaigns with real A/B testing from day one.",
    voice: "aura-orion-en",
    apiKey: "c9ebd467b6557a10491d40451e195769a48a9b36",
    outputDir: audioDir
  });
  console.log(`  ✅ Act 3 (Agency Action): ${p3.duration.toFixed(2)}s`);

  // Act 4: 0:30 - 0:43.9 (Client Simulation & CTA)
  const p4 = await generateVoiceover({
    text: "Chat directly with simulated founders, fix their customer acquisition cost, and graduate with a verified portfolio. What are you waiting for? Start your free trial today at Krechet dot Academy.",
    voice: "aura-orion-en",
    apiKey: "c9ebd467b6557a10491d40451e195769a48a9b36",
    outputDir: audioDir
  });
  console.log(`  ✅ Act 4 (Simulation & CTA): ${p4.duration.toFixed(2)}s`);

  console.log('[2/3] 🎛️ Assembling multi-track audio with exact delays and sidechain ducking...');

  // Total target duration is 43.93s
  // Delays: Part 1 @ 0.5s, Part 2 @ 8.0s, Part 3 @ 20.0s, Part 4 @ 30.5s
  const filterComplex = [
    // Delay each voice part to its visual timestamp
    `[1:a]adelay=500|500,volume=1.4[v1]`,
    `[2:a]adelay=8000|8000,volume=1.4[v2]`,
    `[3:a]adelay=20000|20000,volume=1.4[v3]`,
    `[4:a]adelay=30500|30500,volume=1.4[v4]`,
    // Mix all voice parts into a single voice track
    `[v1][v2][v3][v4]amix=inputs=4:duration=longest:dropout_transition=0:normalize=0[vo_all]`,
    // Split voice track for mixing and sidechain trigger
    `[vo_all]asplit=2[vo_out][vo_sc]`,
    // Prepare background music with smooth fade-in and fade-out to 43.93s
    `[5:a]volume=0.22,afade=t=in:st=0:d=1.5,afade=t=out:st=41.0:d=2.9[bgm_raw]`,
    // Sidechain compress: duck music whenever voice speaks
    `[bgm_raw][vo_sc]sidechaincompress=threshold=0.10:ratio=3.5:attack=30:release=600[ducked_bgm]`,
    // Mix final voice and ducked music together
    `[vo_out][ducked_bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[final_audio]`
  ].join(';');

  const args = [
    '-nostdin',
    '-i', videoPath,    // Input 0: Video (43.93s)
    '-i', p1.audioPath, // Input 1: Part 1
    '-i', p2.audioPath, // Input 2: Part 2
    '-i', p3.audioPath, // Input 3: Part 3
    '-i', p4.audioPath, // Input 4: Part 4
    '-stream_loop', '-1', '-i', musicPath, // Input 5: Music
    '-filter_complex', filterComplex,
    '-map', '0:v',
    '-map', '[final_audio]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', '43.93',
    '-y',
    outputPath
  ];

  await new Promise((resolve, reject) => {
    execFile(FFMPEG, args, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve();
    });
  });

  console.log(`\n🎉 PERFECTED MASTER DEMO CREATED!`);
  console.log(`Duration:   43.93 seconds`);
  console.log(`File:       ${outputPath}`);
  console.log(`Web Stream: http://localhost:3001/storage/renders/${renderFilename}`);

  // Also update clips.json to store this master render
  const clipsJsonPath = path.join(rootDir, 'server', 'storage', 'clips.json');
  let clipsDb = [];
  try {
    if (fs.existsSync(clipsJsonPath)) clipsDb = JSON.parse(fs.readFileSync(clipsJsonPath, 'utf8'));
  } catch (_) {}

  // Check if clip exists or update it
  const existing = clipsDb.find(c => c.filename === '202611030334_1793724181422.mp4');
  if (existing) {
    existing.masterRenderUrl = `/storage/renders/${renderFilename}`;
    existing.masterVoiceoverScript = [
      "This is Krechet Academy. The hands-on marketing growth simulator where you learn by actually doing.",
      "Meet your first real-world agency client: Jenny Miller at Jenny's Artisan Java and Roastery. Her business is bleeding twenty-eight dollars just to sell an eighteen dollar bag of beans. And it is your job to fix it.",
      "No boring lectures. You step into the agency role, audit the unit economics, and build live ad campaigns with real A/B testing from day one.",
      "Chat directly with simulated founders, fix their customer acquisition cost, and graduate with a verified portfolio. What are you waiting for? Start your free trial today at Krechet dot Academy."
    ].join('\n\n');
    fs.writeFileSync(clipsJsonPath, JSON.stringify(clipsDb, null, 2), 'utf8');
    console.log(`[Database] Updated clips.json with master render reference.`);
  }
}

main().catch(err => {
  console.error('[Error]:', err);
  process.exit(1);
});
