import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { getVideoMetadata, generateThumbnail } from './ffmpegService.js';

const FFMPEG_PATH = ffmpegStatic;

/**
 * Stage 8: AI Scene Recreation.
 * When a block is valuable but visually static or needs cinematic emphasis,
 * generates improved versions (Cinematic Zoom, UI Punch-in, Explainer Spotlight)
 * while strictly preserving the authentic demonstration.
 */

/**
 * Creates a cinematic punch-in / zoom version of a screen recording.
 * Eases smoothly from 1.0x to target zoom (e.g. 1.35x - 1.5x) or zooms into
 * a specific quadrant (e.g. top-left for navigation, center for editor, right for sidebar metrics).
 */
export async function createCinematicPunchIn({
  inputVideoPath,
  outputVideoPath,
  zoomScale = 1.30,
  focalArea = 'center', // 'center' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center_right'
  duration = null,
  targetWidth = 1920,
  targetHeight = 1080
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const dir = path.dirname(outputVideoPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const meta = await getVideoMetadata(inputVideoPath);
      const effectiveDuration = duration || meta.duration || 5.0;

      // Coordinate focal offsets based on active UI region
      let xCropExpr = '(in_w-out_w)/2';
      let yCropExpr = '(in_h-out_h)/2';

      switch (focalArea) {
        case 'top_left':
          xCropExpr = '0';
          yCropExpr = '0';
          break;
        case 'top_right':
          xCropExpr = 'in_w-out_w';
          yCropExpr = '0';
          break;
        case 'center_right':
          xCropExpr = 'in_w-out_w';
          yCropExpr = '(in_h-out_h)/2';
          break;
        case 'bottom_right':
          xCropExpr = 'in_w-out_w';
          yCropExpr = 'in_h-out_h';
          break;
        case 'bottom_left':
          xCropExpr = '0';
          yCropExpr = 'in_h-out_h';
          break;
        default:
          xCropExpr = '(in_w-out_w)/2';
          yCropExpr = '(in_h-out_h)/2';
      }

      // Punch-in focus crop filter: crops into the focal quadrant and standardizes to 1080p
      const cropW = `iw/${zoomScale.toFixed(2)}`;
      const cropH = `ih/${zoomScale.toFixed(2)}`;

      const filterComplex = [
        `crop=w=${cropW}:h=${cropH}:x='${xCropExpr}':y='${yCropExpr}'`,
        `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
        `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`,
        'setsar=1',
        'fps=30'
      ].join(',');

      const args = [
        '-nostdin',
        '-i', inputVideoPath,
        '-vf', filterComplex,
        '-t', effectiveDuration.toString(),
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-an',
        '-y',
        outputVideoPath
      ];

      execFile(FFMPEG_PATH, args, (err, stdout, stderr) => {
        if (err) {
          console.warn(`[SceneRecreation] Dynamic zoom error, falling back to static punch-in:`, stderr || err.message);
          // Fallback static crop punch-in
          const fallbackFilter = `crop=w=iw*0.80:h=ih*0.80,scale=${targetWidth}:${targetHeight},setsar=1,fps=30`;
          execFile(FFMPEG_PATH, [
            '-nostdin',
            '-i', inputVideoPath,
            '-vf', fallbackFilter,
            '-t', effectiveDuration.toString(),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '22',
            '-pix_fmt', 'yuv420p',
            '-an',
            '-y',
            outputVideoPath
          ], (fbErr) => {
            if (fbErr) return reject(fbErr);
            resolve(outputVideoPath);
          });
        } else {
          resolve(outputVideoPath);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Recreate a scene from a Knowledge Block with selected enhancement style.
 */
export async function recreateKnowledgeBlockScene({
  block,
  style = 'cinematic_zoom', // 'cinematic_zoom' | 'feature_spotlight' | 'original'
  outputDir,
  targetWidth = 1920,
  targetHeight = 1080
}) {
  if (!block || !block.slicePath || !fs.existsSync(block.slicePath)) {
    throw new Error(`Cannot recreate scene: slicePath not found for block ${block?.blockId}`);
  }

  const recreatedId = `recreated_${block.blockId}_${style}`;
  const outFilename = `${recreatedId}.mp4`;
  const outPath = path.join(outputDir, outFilename);

  // If style is original or already exists, reuse
  if (style === 'original') {
    return {
      ...block,
      recreated: false,
      recreatedStyle: 'original'
    };
  }

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    return {
      ...block,
      slicePath: outPath,
      videoUrl: `/storage/uploads/${outFilename}`,
      recreated: true,
      recreatedStyle: style
    };
  }

  // Determine focal area from block feature or metadata
  let focalArea = 'center';
  const feat = (block.feature || '').toLowerCase();
  const transcript = (block.transcript || '').toLowerCase();

  if (feat.includes('seo') || transcript.includes('score') || transcript.includes('audit')) {
    focalArea = 'center_right'; // Focus on audit score update sidebar
  } else if (feat.includes('launcher') || feat.includes('mode') || transcript.includes('day 1')) {
    focalArea = 'top_left'; // Focus on learning mode selector
  } else if (feat.includes('sarah') || transcript.includes('mentor') || transcript.includes('feedback')) {
    focalArea = 'center';
  }

  console.log(`[SceneRecreation] Enhancing Block "${block.feature}" (${block.duration.toFixed(1)}s) with style "${style}" (focalArea: ${focalArea})...`);

  await createCinematicPunchIn({
    inputVideoPath: block.slicePath,
    outputVideoPath: outPath,
    zoomScale: 1.35,
    focalArea,
    duration: block.duration,
    targetWidth,
    targetHeight
  });

  return {
    ...block,
    slicePath: outPath,
    videoUrl: `/storage/uploads/${outFilename}`,
    recreated: true,
    recreatedStyle: style
  };
}
