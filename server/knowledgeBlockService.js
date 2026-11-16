import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { sliceVideoSegment, generateThumbnail } from './ffmpegService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageDir = path.join(__dirname, 'storage');
const blocksStorePath = path.join(storageDir, 'knowledge_blocks.json');

/**
 * Load all stored Knowledge Blocks from disk.
 */
export function loadKnowledgeBlocks() {
  if (!fs.existsSync(blocksStorePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(blocksStorePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[KnowledgeBlocks] Error loading blocks from disk:', err.message);
    return [];
  }
}

/**
 * Save Knowledge Blocks to disk.
 */
export function saveKnowledgeBlocks(blocks) {
  try {
    const dir = path.dirname(blocksStorePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(blocksStorePath, JSON.stringify(blocks, null, 2), 'utf8');
    console.log(`[KnowledgeBlocks] Saved ${blocks.length} blocks to ${blocksStorePath}`);
  } catch (err) {
    console.error('[KnowledgeBlocks] Error saving blocks:', err.message);
  }
}

/**
 * Stage 2 & 3: Transform deep video analysis into scored, atomic Knowledge Blocks.
 */
export async function createKnowledgeBlocksFromAnalysis({
  deepAnalysis,
  uploadsDir,
  thumbnailsDir,
  geminiApiKey
}) {
  const { videoId, sourceFile, sourceName, duration, fullTranscript, wordTimestamps, scenes, visualEvents, utterances } = deepAnalysis;
  console.log(`[KnowledgeBlocks] Synthesizing Knowledge Blocks from "${sourceName}" (${scenes.length} detected scenes)...`);

  const effectiveGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  let rawBlocks = [];

  if (effectiveGeminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });

      const prompt = `
You are an elite video editor and knowledge architect.
Analyze this video breakdown to extract modular, reusable "Knowledge Blocks".

Video: "${sourceName}" (Duration: ${duration.toFixed(1)}s)
Spoken Transcript: "${fullTranscript || '(Visual screen demonstration)'}"

Detected Scenes:
${JSON.stringify(scenes, null, 2)}

Visual Events on Screen:
${JSON.stringify(visualEvents, null, 2)}

TASK:
Segment this video into distinct, atomic Knowledge Blocks (ranging from 4s to 45s each).
DO NOT artificially cut good teaching moments into 3 seconds! If an explanation takes 15s or 30s, keep the entire cohesive moment.

Classify each block into one of these archetypes:
- "feature_explanation": Clear explanation of a capability or mechanism.
- "aha_moment": A powerful realization, breakthrough, or strategic concept.
- "proof_demonstration": Tangible proof (live score updates, unit economics, data metrics).
- "workflow_execution": Hands-on user action (editing H1 tag, selecting learning mode, clicking publish).
- "hook_problem": A challenge, pain point, or status quo problem.
- "navigation_idle": Dead air, loading, or looking for cursor (scored low, marked non-reusable).

Assign Quality Scores (0 to 100):
- teachingScore (0-100)
- clarityScore (0-100)
- visualScore (0-100)
- energyScore (0-100)

Return JSON format:
{
  "blocks": [
    {
      "feature": "SEO Workbench",
      "startTime": 12.0,
      "endTime": 28.5,
      "blockType": "feature_explanation",
      "transcriptSummary": "Editing the H1 heading hierarchy for Jenny's Artisan Java and witnessing real-time audit score recalculation.",
      "teachingScore": 95,
      "clarityScore": 92,
      "visualScore": 90,
      "energyScore": 88,
      "tags": ["seo", "h1 tag", "audit score", "cms editor", "keywords"],
      "reusable": true
    }
  ]
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        rawBlocks = parsed.blocks;
      }
    } catch (err) {
      console.warn(`[KnowledgeBlocks] Gemini block synthesis error, using heuristic segmentation:`, err.message);
    }
  }

  // Fallback heuristic if Gemini synthesis was empty
  if (rawBlocks.length === 0) {
    rawBlocks = scenes.map((sc, i) => {
      const start = Math.max(0, sc.startSec || 0);
      const end = Math.min(duration, sc.endSec || duration);
      return {
        feature: sc.feature || sc.label || `Feature #${i + 1}`,
        startTime: start,
        endTime: end,
        blockType: 'feature_explanation',
        transcriptSummary: sc.label || 'Feature Walkthrough',
        teachingScore: 85,
        clarityScore: 85,
        visualScore: 88,
        energyScore: 82,
        tags: [sc.feature, 'demonstration', 'ui'],
        reusable: true
      };
    });
  }

  const synthesizedBlocks = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const b = rawBlocks[i];
    const blockDuration = Math.max(1.0, b.endTime - b.startTime);
    const blockId = `kb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i + 1}`;

    // Extract spoken transcript within this block's timecode
    let blockTranscript = '';
    if (wordTimestamps && wordTimestamps.length > 0) {
      const matchingWords = wordTimestamps.filter(w => w.start >= b.startTime && w.end <= b.endTime);
      blockTranscript = matchingWords.map(w => w.word).join(' ');
    }
    if (!blockTranscript) {
      blockTranscript = b.transcriptSummary || '';
    }

    // Overall composite quality score
    const overallScore = Math.round(
      (b.teachingScore * 0.40) +
      (b.clarityScore * 0.25) +
      (b.visualScore * 0.20) +
      (b.energyScore * 0.15)
    );

    const isReusable = b.reusable !== false && overallScore >= 45 && b.blockType !== 'navigation_idle';

    // Slice video segment and generate preview thumbnail
    const sliceFilename = `${blockId}.mp4`;
    const slicePath = path.join(uploadsDir, sliceFilename);
    const thumbFilename = `${blockId}.jpg`;
    const thumbPath = path.join(thumbnailsDir, thumbFilename);

    try {
      if (fs.existsSync(sourceFile)) {
        await sliceVideoSegment(sourceFile, slicePath, b.startTime, blockDuration);
        await generateThumbnail(slicePath, thumbPath, Math.min(1.0, blockDuration / 2));
      }
    } catch (sliceErr) {
      console.warn(`[KnowledgeBlocks] Slice creation error for block ${blockId}:`, sliceErr.message);
    }

    const blockEntry = {
      blockId,
      videoId,
      sourceFile,
      sourceName,
      startTime: b.startTime,
      endTime: b.endTime,
      duration: blockDuration,
      transcript: blockTranscript,
      transcriptSummary: b.transcriptSummary,
      feature: b.feature,
      blockType: b.blockType,
      teachingScore: b.teachingScore || 80,
      clarityScore: b.clarityScore || 80,
      visualScore: b.visualScore || 80,
      energyScore: b.energyScore || 80,
      overallScore,
      reusable: isReusable,
      tags: b.tags || [],
      slicePath: fs.existsSync(slicePath) ? slicePath : sourceFile,
      videoUrl: `/storage/uploads/${sliceFilename}`,
      thumbnailUrl: fs.existsSync(thumbPath) ? `/storage/thumbnails/${thumbFilename}` : null,
      createdAt: Date.now()
    };

    synthesizedBlocks.push(blockEntry);
  }

  // Update persistent knowledge block store
  let existingStore = loadKnowledgeBlocks();
  // Filter out any older versions from this same sourceFile
  existingStore = existingStore.filter(eb => eb.sourceFile !== sourceFile);
  const updatedStore = [...synthesizedBlocks, ...existingStore];
  saveKnowledgeBlocks(updatedStore);

  console.log(`[KnowledgeBlocks] Created ${synthesizedBlocks.length} knowledge blocks for "${sourceName}". (Overall store count: ${updatedStore.length})`);
  return synthesizedBlocks;
}
