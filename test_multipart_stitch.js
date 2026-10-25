import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3001';

async function testMultiPartStitch() {
  console.log('--- 1. Testing Part 1 Orchestration & Render ---');
  const part1Prompt = '[Part 1] Unlike regular digital marketing courses that only teach passive theory, Krechet Academy uses live simulations and workshops that mimic real clients.';
  
  const orch1Res = await fetch(`${API_BASE}/api/orchestrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userPrompt: part1Prompt,
      scriptMode: 'prompt_generate',
      selectedVoice: 'aura-orion-en',
      selectedMusicId: 'ambient-lofi.mp3',
      enableLightingEffects: true,
      enableScreenRecordingSpotlight: true,
      enableScreenRecordingSpeed: true,
      screenRecordingSpeed: 1.25
    })
  });

  const orch1 = await orch1Res.json();
  console.log(`Part 1 EDL locked: ${orch1.edl.clips.length} scenes, duration: ${orch1.edl.totalDuration.toFixed(1)}s, partInfo:`, orch1.edl.partInfo);

  console.log('Rendering Part 1...');
  const render1Res = await fetch(`${API_BASE}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edl: orch1.edl })
  });
  const render1 = await render1Res.json();
  console.log('Part 1 rendered successfully:', render1.videoUrl, `(${render1.duration}s)`);

  console.log('\n--- 2. Testing Part 2 Orchestration & Render ---');
  const part2Prompt = '[Part 2] All the work you complete goes directly into a live portfolio for your certification, proving to employers you have real hands-on experience. 1-week free trial, then $97 a month.';

  const orch2Res = await fetch(`${API_BASE}/api/orchestrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userPrompt: part2Prompt,
      scriptMode: 'prompt_generate',
      selectedVoice: 'aura-orion-en',
      selectedMusicId: 'ambient-lofi.mp3',
      enableLightingEffects: true,
      enableScreenRecordingSpotlight: true,
      enableScreenRecordingSpeed: true,
      screenRecordingSpeed: 1.25
    })
  });

  const orch2 = await orch2Res.json();
  console.log(`Part 2 EDL locked: ${orch2.edl.clips.length} scenes, duration: ${orch2.edl.totalDuration.toFixed(1)}s, partInfo:`, orch2.edl.partInfo);

  console.log('Rendering Part 2...');
  const render2Res = await fetch(`${API_BASE}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edl: orch2.edl })
  });
  const render2 = await render2Res.json();
  console.log('Part 2 rendered successfully:', render2.videoUrl, `(${render2.duration}s)`);

  console.log('\n--- 3. Testing Stitching Part 1 + Part 2 into Full Master Feature Video ---');
  const stitchRes = await fetch(`${API_BASE}/api/stitch-parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partUrls: [render1.videoUrl, render2.videoUrl],
      selectedMusicId: 'none'
    })
  });

  const stitchData = await stitchRes.json();
  console.log('Master Video Stitched Result:', stitchData);
  if (stitchData.success && stitchData.duration > 0) {
    console.log(`\n🎉 SUCCESS! Master Full-Length Video: ${stitchData.videoUrl}`);
    console.log(`Duration: ${stitchData.duration.toFixed(1)}s (1080p: ${stitchData.width}x${stitchData.height}), stitched ${stitchData.partsCount} parts.`);
  } else {
    throw new Error('Stitching failed: ' + JSON.stringify(stitchData));
  }
}

testMultiPartStitch().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
