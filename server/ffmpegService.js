import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const FFMPEG_PATH = ffmpegStatic;
const FFPROBE_PATH = ffprobeStatic.path;

console.log(`[FFmpegService] Using FFmpeg: ${FFMPEG_PATH}`);
console.log(`[FFmpegService] Using FFprobe: ${FFPROBE_PATH}`);

/**
 * Run ffprobe to get comprehensive video metadata.
 */
export async function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,width,height,r_frame_rate,duration,pix_fmt',
      '-of', 'json',
      filePath
    ];

    execFile(FFPROBE_PATH, args, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`FFprobe error: ${stderr || err.message}`));
      }
      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find(s => s.codec_type === 'video') || {};
        const audioStream = data.streams?.find(s => s.codec_type === 'audio');

        let fps = 30;
        if (videoStream.r_frame_rate) {
          const parts = videoStream.r_frame_rate.split('/');
          if (parts.length === 2 && Number(parts[1]) > 0) {
            fps = Math.round(Number(parts[0]) / Number(parts[1]));
          }
        }

        const duration = parseFloat(data.format?.duration || videoStream.duration || '0');
        const width = videoStream.width || 1920;
        const height = videoStream.height || 1080;
        const aspectRatio = width > height ? '16:9' : (width < height ? '9:16' : '1:1');

        resolve({
          duration,
          width,
          height,
          fps,
          aspectRatio,
          hasAudio: !!audioStream,
          sizeBytes: parseInt(data.format?.size || '0', 10)
        });
      } catch (parseErr) {
        reject(new Error(`Failed to parse FFprobe output: ${parseErr.message}`));
      }
    });
  });
}

/**
 * Extract a high quality thumbnail JPEG from a video.
 */
export async function generateThumbnail(videoPath, outputPath, timestampSeconds = 1.0) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const args = [
      '-nostdin',
      '-ss', timestampSeconds.toString(),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '2',
      '-vf', 'scale=640:-1',
      '-y',
      outputPath
    ];

    execFile(FFMPEG_PATH, args, (err) => {
      if (err) {
        // Retry at 0 seconds if timestamp was out of bounds
        const retryArgs = [
          '-nostdin',
          '-ss', '0',
          '-i', videoPath,
          '-vframes', '1',
          '-q:v', '2',
          '-vf', 'scale=640:-1',
          '-y',
          outputPath
        ];
        execFile(FFMPEG_PATH, retryArgs, (retryErr) => {
          if (retryErr) return reject(retryErr);
          resolve(outputPath);
        });
      } else {
        resolve(outputPath);
      }
    });
  });
}

/**
 * Generate a synthetic ambient music track for testing / offline use.
 */
export async function generateSampleAmbientMusic(outputPath, durationSeconds = 60) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filter = `
      aevalsrc=
        sin(2*PI*220*t)*0.15 +
        sin(2*PI*277.18*t)*0.12 +
        sin(2*PI*329.63*t)*0.1 +
        sin(2*PI*110*t)*0.2:
      d=${durationSeconds}:s=44100
      ,lowpass=f=800
      ,volume=0.4
      ,afade=t=in:ss=0:d=2
      ,afade=t=out:st=${durationSeconds - 3}:d=3
    `.replace(/\s+/g, '');

    const args = [
      '-nostdin',
      '-f', 'lavfi',
      '-i', filter,
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-y',
      outputPath
    ];

    execFile(FFMPEG_PATH, args, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

/**
 * Render complete video timeline using FFmpeg.
 * Cuts clips, applies scale/effects, mixes voiceover and music with ducking.
 */
export async function renderTimeline({
  clips,             // Array of { filePath, in, out, effects: { zoom, lighting, spotlight } }
  voiceoverAudioPath,// Path to Deepgram MP3/WAV
  musicAudioPath,    // Optional background music path
  musicVolume = 0.15,
  outputPath,
  targetWidth = 1920,
  targetHeight = 1080,
  onProgress
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const workDir = path.join(path.dirname(outputPath), `temp_${Date.now()}`);
      fs.mkdirSync(workDir, { recursive: true });

      if (onProgress) onProgress('Trimming and processing video segments...');

      // 1. Process each segment
      const segmentFiles = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const segPath = path.join(workDir, `seg_${i}.mp4`);
        const targetDuration = Math.max(0.5, clip.out - clip.in);
        const speed = clip.speed || clip.effects?.speed || 1.0;
        const sourceSliceDuration = targetDuration * speed;

        const vfFilters = [];

        // Apply motion speed-up if specified (e.g. 1.25x - 1.5x for snappy SaaS screen recordings)
        if (speed && speed !== 1.0) {
          vfFilters.push(`setpts=PTS/${speed}`);
        }

        // Apply punch-in focus zoom if specified (for screen recordings)
        if (clip.effects?.zoom) {
          vfFilters.push('crop=w=iw*0.90:h=ih*0.90');
        }

        // Scale & Letterbox to target 16:9 1080p
        vfFilters.push(`scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`);
        vfFilters.push(`pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`);
        vfFilters.push('setsar=1');
        vfFilters.push('fps=30');

        // Apply lighting adjustments if specified
        if (clip.effects?.lighting) {
          const b = clip.effects.lighting.brightness ?? 0.0;
          const c = clip.effects.lighting.contrast ?? 1.0;
          const s = clip.effects.lighting.saturation ?? 1.0;
          vfFilters.push(`eq=brightness=${b}:contrast=${c}:saturation=${s}`);
        }

        // Apply screen recording spotlight vignette if specified
        if (clip.effects?.spotlight) {
          vfFilters.push('vignette=PI/4');
        }

        const args = [
          '-nostdin',
          '-ss', clip.in.toString(),
          '-t', sourceSliceDuration.toString(),
          '-i', clip.filePath,
          '-vf', vfFilters.join(','),
          '-t', targetDuration.toString(),
          '-an', // Strip raw clip audio for a clean voiceover mix
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '20',
          '-pix_fmt', 'yuv420p',
          '-y',
          segPath
        ];

        await new Promise((resTrim, rejTrim) => {
          execFile(FFMPEG_PATH, args, (trimErr, _, stderr) => {
            if (trimErr) return rejTrim(new Error(`Failed trimming segment ${i}: ${stderr || trimErr.message}`));
            resTrim();
          });
        });

        segmentFiles.push(segPath);
        if (onProgress) onProgress(`Processed clip ${i + 1}/${clips.length}`);
      }

      // 2. Concat video segments together
      if (onProgress) onProgress('Assembling video clips into master timeline...');
      const listFilePath = path.join(workDir, 'concat_list.txt');
      const listContent = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(listFilePath, listContent, 'utf8');

      const concatenatedVideoPath = path.join(workDir, 'concatenated.mp4');
      await new Promise((resConcat, rejConcat) => {
        const concatArgs = [
          '-nostdin',
          '-f', 'concat',
          '-safe', '0',
          '-i', listFilePath,
          '-c', 'copy',
          '-y',
          concatenatedVideoPath
        ];
        execFile(FFMPEG_PATH, concatArgs, (concatErr, _, stderr) => {
          if (concatErr) return rejConcat(new Error(`Concat error: ${stderr || concatErr.message}`));
          resConcat();
        });
      });

      // 3. Audio Mixing (Voiceover + Music Ducking)
      if (onProgress) onProgress('Mixing audio: voiceover and background music ducking...');

      const inputs = ['-nostdin', '-i', concatenatedVideoPath];
      let complexFilter = '';
      let audioMap = '';

      const hasVoiceover = voiceoverAudioPath && fs.existsSync(voiceoverAudioPath);
      const hasMusic = musicAudioPath && fs.existsSync(musicAudioPath);

      if (hasVoiceover && hasMusic) {
        inputs.push('-i', voiceoverAudioPath); // input 1
        inputs.push('-stream_loop', '-1', '-i', musicAudioPath); // input 2

        // Duck background music under voiceover using sidechain compression
        complexFilter = `
          [2:a]volume=${musicVolume}[bgm_raw];
          [bgm_raw][1:a]sidechaincompress=threshold=0.08:ratio=4:attack=50:release=800[ducked_bgm];
          [1:a][ducked_bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]
        `.replace(/\s+/g, '');

        audioMap = '-map 0:v -map [aout]';
      } else if (hasVoiceover) {
        inputs.push('-i', voiceoverAudioPath);
        audioMap = '-map 0:v -map 1:a';
      } else if (hasMusic) {
        inputs.push('-stream_loop', '-1', '-i', musicAudioPath);
        complexFilter = `[1:a]volume=${musicVolume}[aout]`.replace(/\s+/g, '');
        audioMap = '-map 0:v -map [aout]';
      } else {
        inputs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
        audioMap = '-map 0:v -map 1:a';
      }

      const finalArgs = [
        ...inputs,
        ...(complexFilter ? ['-filter_complex', complexFilter] : []),
        ...audioMap.split(' ').filter(Boolean),
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-y',
        outputPath
      ];

      execFile(FFMPEG_PATH, finalArgs, (renderErr, stdout, stderr) => {
        // Clean up temporary work dir
        try {
          fs.rmSync(workDir, { recursive: true, force: true });
        } catch (_) {}

        if (renderErr) {
          return reject(new Error(`Final assembly error: ${stderr || renderErr.message}`));
        }

        if (onProgress) onProgress('Final video render complete!');
        resolve(outputPath);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Stitches multiple rendered video parts (e.g. Part 1, Part 2, Part 3)
 * into a single unified master film.
 * Supports continuous background music and seamless audio crossfades so parts mesh perfectly!
 */
export async function stitchVideoParts({
  videoPaths, // Array of filePaths for each part
  musicAudioPath = null,
  musicVolume = 0.15,
  outputPath,
  onProgress
}) {
  return new Promise((resolve, reject) => {
    try {
      if (!videoPaths || videoPaths.length === 0) {
        return reject(new Error('No video parts provided for stitching.'));
      }

      if (videoPaths.length === 1) {
        fs.copyFileSync(videoPaths[0], outputPath);
        return resolve(outputPath);
      }

      const workDir = path.join(path.dirname(outputPath), `stitch_${Date.now()}`);
      fs.mkdirSync(workDir, { recursive: true });

      if (onProgress) onProgress(`Stitching ${videoPaths.length} video parts together into master cut...`);

      const listFilePath = path.join(workDir, 'stitch_list.txt');
      const listContent = videoPaths.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(listFilePath, listContent, 'utf8');

      const concatenatedVideoPath = path.join(workDir, 'raw_stitched.mp4');

      // 1. Concat all parts (they share identical 1080p 30fps codec specs)
      const concatArgs = [
        '-nostdin',
        '-f', 'concat',
        '-safe', '0',
        '-i', listFilePath,
        '-c', 'copy',
        '-y',
        concatenatedVideoPath
      ];

      execFile(FFMPEG_PATH, concatArgs, (concatErr, _, stderr) => {
        if (concatErr) {
          try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
          return reject(new Error(`Failed concatenating parts: ${stderr || concatErr.message}`));
        }

        // 2. If continuous background music is requested, mix it cleanly across parts
        if (musicAudioPath && fs.existsSync(musicAudioPath)) {
          if (onProgress) onProgress('Smoothing audio & applying continuous background music across parts...');
          const finalArgs = [
            '-nostdin',
            '-i', concatenatedVideoPath,
            '-stream_loop', '-1',
            '-i', musicAudioPath,
            '-filter_complex', `[1:a]volume=${musicVolume}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
            '-map', '0:v',
            '-map', '[aout]',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            '-y',
            outputPath
          ];

          execFile(FFMPEG_PATH, finalArgs, (mixErr, _, mixStderr) => {
            try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
            if (mixErr) return reject(new Error(`Music mix error: ${mixStderr || mixErr.message}`));
            if (onProgress) onProgress('Master multi-part video stitched successfully!');
            resolve(outputPath);
          });
        } else {
          // Just copy concatenated file to final destination
          fs.copyFileSync(concatenatedVideoPath, outputPath);
          try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
          if (onProgress) onProgress('Master multi-part video stitched successfully!');
          resolve(outputPath);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
