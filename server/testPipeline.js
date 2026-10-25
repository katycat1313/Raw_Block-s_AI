import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { fileURLToPath } from 'url';

import { getVideoMetadata, renderTimeline, generateThumbnail, generateSampleAmbientMusic } from './ffmpegService.js';
import { analyzeVideoClip } from './clipVisionService.js';
import { VideoAgentOrchestrator } from './agentOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

async function createSampleClip(outputPath, label, duration = 4, color = '0x1e1b4b') {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Use a simple colored video with test pattern
  const args = [
    '-f', 'lavfi',
    '-i', `color=c=${color}:s=1280x720:d=${duration}:r=30`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-t', duration.toString(),
    '-y',
    outputPath
  ];

  await runCommand(ffmpegStatic, args);
  console.log(`✓ Created sample test clip: ${path.basename(outputPath)} (${duration}s)`);
}

async function main() {
  console.log('\n=============================================================');
  console.log('🧪 Starting Full End-to-End Multi-Agent Assembly Test');
  console.log('=============================================================\n');

  const testDir = path.join(__dirname, 'test_fixtures');
  const clip1Path = path.join(testDir, 'sample_screen_dashboard.mp4');
  const clip2Path = path.join(testDir, 'sample_screen_export.mp4');
  const thumb1Path = path.join(testDir, 'thumb1.jpg');
  const thumb2Path = path.join(testDir, 'thumb2.jpg');
  const musicPath = path.join(testDir, 'test_music.mp3');
  const renderedOutputPath = path.join(testDir, 'test_final_master.mp4');

  // 1. Generate clips
  console.log('Step 1: Generating 2 synthetic screen recordings...');
  await createSampleClip(clip1Path, 'Dashboard', 5, '0x1e1b4b');
  await createSampleClip(clip2Path, 'Export Menu', 6, '0x0f766e');

  // 2. Generate Thumbnails & Extract Metadata
  console.log('\nStep 2: Probing metadata and generating thumbnails...');
  await generateThumbnail(clip1Path, thumb1Path, 1.0);
  await generateThumbnail(clip2Path, thumb2Path, 1.0);
  const meta1 = await getVideoMetadata(clip1Path);
  const meta2 = await getVideoMetadata(clip2Path);
  console.log(`✓ Clip 1: ${meta1.width}x${meta1.height}, ${meta1.duration}s, fps: ${meta1.fps}`);
  console.log(`✓ Clip 2: ${meta2.width}x${meta2.height}, ${meta2.duration}s, fps: ${meta2.fps}`);

  // 3. Vision Scout Analysis
  console.log('\nStep 3: Vision Scout indexing...');
  const vision1 = await analyzeVideoClip({
    filePath: clip1Path,
    clipId: 'clip-1',
    originalFilename: 'sample_screen_dashboard.mp4',
    workDir: testDir
  });
  const vision2 = await analyzeVideoClip({
    filePath: clip2Path,
    clipId: 'clip-2',
    originalFilename: 'sample_screen_export.mp4',
    workDir: testDir
  });
  console.log(`✓ Vision 1: "${vision1.title}" (${vision1.contentType})`);
  console.log(`✓ Vision 2: "${vision2.title}" (${vision2.contentType})`);

  // 4. Sample background music
  console.log('\nStep 4: Generating sample ambient background music...');
  await generateSampleAmbientMusic(musicPath, 20);
  console.log('✓ Ambient music track synthesized.');

  // 5. Multi-Agent Orchestration
  console.log('\nStep 5: Running Multi-Agent Pipeline (Scout, Screenplay, Sound, Director, Stylist)...');
  const mockClips = [
    { clipId: 'clip-1', filePath: clip1Path, ...vision1 },
    { clipId: 'clip-2', filePath: clip2Path, ...vision2 }
  ];

  const orchestrator = new VideoAgentOrchestrator({
    audioOutputDir: testDir,
    onProgress: (p) => console.log(`   [Progress] ${p}`),
    onDialogue: (d) => console.log(`   [Agent ${d.agent}] ${d.message}`)
  });

  const edl = await orchestrator.runPipeline({
    userPrompt: 'Demonstrate navigation from the main dashboard to the export menu.',
    scriptMode: 'prompt_generate',
    clips: mockClips,
    selectedVoice: 'aura-orion-en',
    musicTrack: musicPath,
    enableLightingEffects: true,
    enableScreenRecordingSpotlight: true
  });

  console.log(`\n✓ Master EDL Locked! Scenes: ${edl.clips.length}, Duration: ${edl.totalDuration.toFixed(1)}s`);

  // 6. Assembly & Rendering with FFmpeg
  console.log('\nStep 6: Executing FFmpeg Render with Effects & Audio Ducking...');
  await renderTimeline({
    clips: edl.clips,
    voiceoverAudioPath: edl.voiceoverAudioPath,
    musicAudioPath: edl.musicTrack,
    musicVolume: 0.15,
    outputPath: renderedOutputPath,
    onProgress: (p) => console.log(`   [Render] ${p}`)
  });

  // 7. Verify Output
  const finalMeta = await getVideoMetadata(renderedOutputPath);
  console.log('\n=============================================================');
  console.log('🎉 PIPELINE VERIFICATION SUCCESSFUL!');
  console.log(`   Final Video:     ${renderedOutputPath}`);
  console.log(`   Resolution:      ${finalMeta.width}x${finalMeta.height}`);
  console.log(`   Duration:        ${finalMeta.duration.toFixed(2)}s`);
  console.log(`   Has Audio Track: ${finalMeta.hasAudio}`);
  console.log(`   File Size:       ${(finalMeta.sizeBytes / 1024).toFixed(1)} KB`);
  console.log('=============================================================\n');
}

main().catch(err => {
  console.error('\n❌ Test Pipeline Failed:', err);
  process.exit(1);
});
