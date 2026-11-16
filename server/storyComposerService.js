import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { loadKnowledgeBlocks } from './knowledgeBlockService.js';
import { searchKnowledgeBlocksSemantic, KNOWLEDGE_GRAPH } from './knowledgeGraphService.js';
import { recreateKnowledgeBlockScene } from './sceneRecreationService.js';
import { generateVoiceover, sanitizeVoiceoverText } from './deepgramService.js';
import { renderTimeline } from './ffmpegService.js';
import { searchBrollClips, importBrollClip } from './pexelsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Knowledge Base & Product Bible
let directingPlaybook = {};
let productBible = {};
try {
  const pbPath = path.join(__dirname, 'knowledge', 'DEMO_DIRECTING_PLAYBOOK.json');
  if (fs.existsSync(pbPath)) directingPlaybook = JSON.parse(fs.readFileSync(pbPath, 'utf8'));
  const kbPath = path.join(__dirname, 'knowledge', 'KRECHET_PRODUCT_BIBLE.json');
  if (fs.existsSync(kbPath)) productBible = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
} catch (err) {
  console.warn('[StoryComposer] Knowledge base load warning:', err.message);
}

/**
 * Stage 5: Story Agent.
 * Builds narrative architecture FIRST, then queries Knowledge Blocks.
 */
export async function composeStoryArc({
  userPrompt,
  targetDurationCategory = 'master_demo', // 'quick_tour' (45-60s) | 'feature_spotlight' (60-90s) | 'master_demo' (90-180s)
  geminiApiKey
}) {
  const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) {
    throw new Error('GEMINI_API_KEY is required for Story Composer');
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  const systemInstruction = `
You are an elite Creative Director and Master Demo Storyteller for high-end SaaS product videos.
Product: "${productBible.productName || 'Krechet Marketing Academy'}"
Positioning: "${productBible.positioning || 'The Digital Marketing Flight Simulator'}"

CORE PHILOSOPHY & SIMULATION MECHANICS:
1. Weekly New Client & Simulation Cadence: Every week introduces a brand-new client with a dedicated simulation tailored to their business model and growth bottlenecks.
2. The Client Dossier & Dynamic Messaging: Students review detailed dossiers (margins, CAC, LTV, revenue targets) and message the client directly. The client is an AI persona with deep business realism—NO static canned replies!
3. Havoc Calls (Keeping 'Em On Their Toes): Unpredictable emergency client phone calls and crisis alerts interrupt student sandboxes mid-week, forcing real-time agency decisions under pressure with instant SMS feedback.
4. Just-In-Time Learning: Daily lessons and Socratic mentor sessions teach everything needed during the week so students have the exact tools to pass that week's simulation.
5. ZERO STOCK B-ROLL MANDATE: All visual footage MUST be authentic platform screen recordings showing the roadmap, dossier, havoc call, and workbench. Never use generic stock B-roll!

Target Duration Category: "${targetDurationCategory}"
User Request: "${userPrompt || 'Highlight the weekly client cadence, the client dossier with dynamic messaging, unpredictable havoc calls, and the hands-on simulation workbench.'}"

Return JSON:
{
  "title": "Krechet Academy: The Digital Marketing Flight Simulator",
  "narrativeTheme": "A new client every week, dynamic AI client messaging, unpredictable Havoc calls, and hands-on simulation mastery",
  "acts": [
    {
      "actIndex": 1,
      "actName": "Weekly Agency Cadence: A New Client Each Week",
      "storyGoal": "Introduce the weekly simulation roadmap: every week brings a new real client and dedicated simulation, teaching everything needed to pass",
      "semanticQuery": "weekly cadence new client syllabus curriculum pass simulation",
      "preferredVisualType": "screen_recording",
      "targetDuration": 14.0
    },
    {
      "actIndex": 2,
      "actName": "Client Dossier & Dynamic AI Messaging",
      "storyGoal": "Show the client dossier and messaging the client directly, powered by a dynamic AI client persona that answers with versatile realism rather than static text",
      "semanticQuery": "Jenny's Artisan Java client dossier unit economics messaging the client unfair advantage",
      "preferredVisualType": "screen_recording",
      "targetDuration": 20.0
    },
    {
      "actIndex": 3,
      "actName": "Havoc Calls: Keeping You On Your Toes",
      "storyGoal": "Demonstrate the unexpected emergency Havoc Call interrupting the session, forcing live triage and receiving real-time SMS feedback",
      "semanticQuery": "Havoc Calls crisis communications emergency client call pricing mistake text from Jenny",
      "preferredVisualType": "screen_recording",
      "targetDuration": 24.0
    },
    {
      "actIndex": 4,
      "actName": "Live Simulation Workbench & Defect Tracking",
      "storyGoal": "Walk through hands-on technical execution in the CMS sandbox, resolving defects and watching real-time audit score recalculation",
      "semanticQuery": "SEO Workbench CMS H1 editing defect tracking audit score recalculation GA4 organic growth",
      "preferredVisualType": "screen_recording",
      "targetDuration": 28.0
    },
    {
      "actIndex": 5,
      "actName": "Passing the Week & Verifiable Proof of Work",
      "storyGoal": "Validate the week's deliverable with Sarah Jenkins, receiving client praise and earning verified portfolio proof of work",
      "semanticQuery": "Sarah Jenkins tactical validation passing the simulation verified proof of work portfolio",
      "preferredVisualType": "screen_recording",
      "targetDuration": 16.0
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
    config: { responseMimeType: 'application/json' }
  });

  const parsed = JSON.parse(response.text || '{}');
  if (!parsed.acts || !Array.isArray(parsed.acts) || parsed.acts.length === 0) {
    throw new Error('Story Agent failed to compose narrative acts.');
  }

  return parsed;
}

/**
 * Stage 6: Voiceover Reconstruction Agent.
 * Analyzes the authentic spoken transcript of matched Knowledge Blocks,
 * elevates and rewrites it into broadcast-ready demo narration while
 * strictly preserving the original meaning and what is actually shown.
 */
export async function reconstructVoiceover({
  act,
  matchedBlock,
  previousActText = '',
  geminiApiKey
}) {
  const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) return act.storyGoal;

  const rawTranscript = matchedBlock?.transcript || matchedBlock?.transcriptSummary || '';
  const visualFeature = matchedBlock?.feature || act.actName;

  const prompt = `
You are the Lead Scriptwriter for a high-end Silicon Valley product documentary.
You are reconstructing authentic demo voiceover for Act: "${act.actName}".

Context of Previous Act: "${previousActText || 'Opening of the demo'}"
Current Act Goal: "${act.storyGoal}"
Feature on Screen: "${visualFeature}"
Original Spoken Words in Video Take:
"${rawTranscript || '(Visual screen demonstration of ' + visualFeature + ')'}"

RULES:
1. STRICT PRESERVATION: Keep the authentic technical explanation and what is actually happening on screen.
2. ELEVATE DELIVERY: Transform casual or hesitant spoken words into authoritative, articulate, broadcast-grade narration.
   - Bad: "I clicked here and then I changed this and it recalculated."
   - Good: "As soon as I update the H1 heading, the SEO audit automatically recalculates, showing exactly how each optimization impacts performance."
3. NO MARKETING FLUFF: Never inject generic buzzwords like "unleash synergy" or "game-changer". Focus on concrete mechanics and outcomes.
4. PACING: Aim for approximately 2.3 to 2.5 words per second. For an estimated duration of ${act.targetDuration || 15} seconds, write ${Math.round((act.targetDuration || 15) * 2.35)} words.
5. Return ONLY the spoken voiceover text. No brackets, no stage directions.
`;

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const reconstructed = sanitizeVoiceoverText(response.text || rawTranscript || act.storyGoal);
    return reconstructed;
  } catch (err) {
    console.warn('[VoiceoverReconstruction] Error:', err.message);
    return sanitizeVoiceoverText(rawTranscript || act.storyGoal);
  }
}

/**
 * Stage 7: Context-Aware B-Roll Retriever.
 * Uses semantic meaning of the transcript rather than literal words.
 */
export async function retrieveContextAwareBroll({
  intentDescription,
  existingClips = [],
  outputDir,
  pexelsApiKey
}) {
  // 1. Check user-uploaded B-roll first (User Primacy Mandate)
  const userBroll = existingClips.find(c => 
    c.contentType === 'b_roll' && 
    (c.source === 'user_upload' || c.isUserTake) &&
    fs.existsSync(c.filePath)
  );
  if (userBroll) {
    console.log(`[ContextAwareBroll] Reusing user-provided B-roll: "${userBroll.title}"`);
    return userBroll;
  }

  // 2. Query contextual stock with semantic intent
  const semanticQueries = [];
  const intentLower = (intentDescription || '').toLowerCase();

  if (intentLower.includes('coffee') || intentLower.includes('artisan') || intentLower.includes('java')) {
    semanticQueries.push('coffee barista espresso craft', 'cafe shop customer');
  } else if (intentLower.includes('student') || intentLower.includes('frustrat') || intentLower.includes('passive')) {
    semanticQueries.push('student studying laptop desk', 'frustrated working computer');
  } else if (intentLower.includes('agency') || intentLower.includes('team') || intentLower.includes('celebrat')) {
    semanticQueries.push('marketing agency team meeting', 'business colleagues collaboration');
  } else {
    semanticQueries.push('marketing strategy analytics dashboard', 'modern office professional laptop');
  }

  const effectivePexelsKey = pexelsApiKey || process.env.PEXELS_API_KEY;

  for (const q of semanticQueries) {
    try {
      const results = await searchBrollClips({ query: q, perPage: 4, apiKey: effectivePexelsKey });
      if (results && results.length > 0) {
        // Pick top result and import
        const best = results[0];
        const imported = await importBrollClip({ clipData: best, outputDir });
        if (imported && imported.filePath && fs.existsSync(imported.filePath)) {
          console.log(`[ContextAwareBroll] Secured intent-matched B-roll for "${intentDescription}": "${imported.title}"`);
          return imported;
        }
      }
    } catch (err) {
      console.warn(`[ContextAwareBroll] Stock search error for query "${q}":`, err.message);
    }
  }

  // Fallback to any existing B-roll clip in library
  const fallback = existingClips.find(c => c.contentType === 'b_roll' && fs.existsSync(c.filePath));
  return fallback || null;
}

/**
 * End-to-End Master Story Composer:
 * Executes Stages 5 through 10 to assemble a complete intelligent demo.
 */
export async function composeAndRenderMasterDemo({
  userPrompt,
  targetDurationCategory = 'master_demo',
  selectedVoice = 'aura-orion-en',
  backgroundMusicPath = null,
  geminiApiKey,
  deepgramApiKey,
  pexelsApiKey,
  uploadsDir,
  audioDir,
  rendersDir,
  existingClips = [],
  onProgress = () => {},
  onLog = () => {}
}) {
  onProgress('🧠 Stage 5: Story Agent crafting master narrative blueprint...');
  onLog('Story Agent', 'Creative Director', `Crafting narrative arc for: "${userPrompt || 'Krechet Master Demo'}" (${targetDurationCategory}).`, 'thought');

  // 1. Stage 5: Compose Story Blueprint
  const storyBlueprint = await composeStoryArc({
    userPrompt,
    targetDurationCategory,
    geminiApiKey
  });

  onLog('Story Agent', 'Creative Director', `Locked 5-Act Narrative: "${storyBlueprint.title}"\nTheme: ${storyBlueprint.narrativeTheme}`, 'finding');

  // 2. Load Knowledge Blocks (Stage 2 & 10)
  const allBlocks = loadKnowledgeBlocks();
  onLog('Block Retriever', 'Intelligence Layer', `Queried Knowledge Database: ${allBlocks.length} reusable Knowledge Blocks currently indexed.`, 'thought');

  const assembledTimelineSegments = [];
  const voiceoverBeats = [];
  let previousVoiceoverText = '';

  // 3. Process each Act through Stages 5, 6, 7, 8
  for (let i = 0; i < storyBlueprint.acts.length; i++) {
    const act = storyBlueprint.acts[i];
    onProgress(`🎬 Assembling Act ${i + 1}/${storyBlueprint.acts.length}: "${act.actName}"...`);
    onLog('Composer', 'Sequence Director', `Processing Act #${i + 1}: "${act.actName}" (Semantic Goal: ${act.storyGoal}).`, 'thought');

    let chosenVisualAsset = null;
    let isRecreated = false;

    // Search Knowledge Blocks with semantic matching (Stage 4)
    const matchingBlocks = await searchKnowledgeBlocksSemantic({
      query: act.semanticQuery,
      blocks: allBlocks,
      limit: 3,
      minScore: 40,
      geminiApiKey
    });

    if (act.preferredVisualType === 'screen_recording' && matchingBlocks.length > 0) {
      const topBlock = matchingBlocks[0];
      onLog('Block Retriever', 'Semantic Match', `Matched Block: "${topBlock.feature}" (Quality: ${topBlock.overallScore}, Relevance: ${topBlock.semanticRelevance}).`, 'finding');

      // Stage 8: Scene Recreation (Cinematic punch-in on active UI)
      try {
        const enhancedBlock = await recreateKnowledgeBlockScene({
          block: topBlock,
          style: 'cinematic_zoom',
          outputDir: uploadsDir
        });
        chosenVisualAsset = {
          filePath: enhancedBlock.slicePath,
          title: enhancedBlock.feature,
          duration: enhancedBlock.duration,
          contentType: 'screen_recording',
          effects: { zoom: false } // Already applied dynamically
        };
        isRecreated = true;
      } catch (recErr) {
        console.warn('[StoryComposer] Scene recreation fallback:', recErr.message);
        chosenVisualAsset = {
          filePath: topBlock.slicePath,
          title: topBlock.feature,
          duration: topBlock.duration,
          contentType: 'screen_recording'
        };
      }
    } else if (act.preferredVisualType === 'contextual_broll') {
      // Stage 7: Context-aware B-Roll
      const brollAsset = await retrieveContextAwareBroll({
        intentDescription: act.brollIntent || act.storyGoal,
        existingClips,
        outputDir: uploadsDir,
        pexelsApiKey
      });
      if (brollAsset) {
        chosenVisualAsset = {
          filePath: brollAsset.filePath,
          title: brollAsset.title,
          duration: brollAsset.duration || act.targetDuration,
          contentType: 'b_roll'
        };
      }
    }

    // Fallback if no matching asset found
    if (!chosenVisualAsset) {
      if (matchingBlocks.length > 0) {
        chosenVisualAsset = {
          filePath: matchingBlocks[0].slicePath,
          title: matchingBlocks[0].feature,
          duration: matchingBlocks[0].duration,
          contentType: 'screen_recording'
        };
      } else if (existingClips.length > 0) {
        chosenVisualAsset = {
          filePath: existingClips[i % existingClips.length].filePath,
          title: existingClips[i % existingClips.length].title,
          duration: act.targetDuration,
          contentType: existingClips[i % existingClips.length].contentType || 'screen_recording'
        };
      } else {
        throw new Error(`No visual assets or Knowledge Blocks available for Act #${i + 1}`);
      }
    }

    // Stage 6: Voiceover Reconstruction
    const elevatedScript = await reconstructVoiceover({
      act,
      matchedBlock: matchingBlocks[0] || null,
      previousActText: previousVoiceoverText,
      geminiApiKey
    });

    previousVoiceoverText = elevatedScript;

    onLog('Voiceover Agent', 'Voiceover Reconstruction', `Act #${i + 1} Spoken Script:\n"${elevatedScript}"`, 'finding');

    // Stage 9: Long Form Demo Timing - Respect authentic content duration!
    const assetMaxDuration = chosenVisualAsset.duration || 10.0;
    const requiredSpeechDuration = Math.max(3.0, elevatedScript.split(/\s+/).length / 2.3);
    const lockedDuration = Math.min(assetMaxDuration, Math.max(act.targetDuration, requiredSpeechDuration));

    assembledTimelineSegments.push({
      beatIndex: i,
      title: chosenVisualAsset.title,
      filePath: chosenVisualAsset.filePath,
      in: 0,
      out: lockedDuration,
      duration: lockedDuration,
      effects: chosenVisualAsset.effects || {}
    });

    voiceoverBeats.push({
      actIndex: i + 1,
      actName: act.actName,
      text: elevatedScript,
      duration: lockedDuration
    });
  }

  // 4. Synthesize Reconstructed Voiceover (Deepgram Aura)
  onProgress('🎙️ Stage 6: Synthesizing elevated voiceover narration via Deepgram Aura...');
  const combinedSpokenText = voiceoverBeats.map(b => b.text).join(' ');
  const voResult = await generateVoiceover({
    text: combinedSpokenText,
    voice: selectedVoice,
    apiKey: deepgramApiKey,
    outputDir: audioDir
  });

  onLog('Sound Producer', 'Audio Director', `Synthesized ${voResult.duration.toFixed(1)}s voiceover with voice "${selectedVoice}".`, 'thought');

  // 5. Render Master Timeline (Stages 8 & 9)
  onProgress('🎞️ Assembling & Rendering final 1080p Master Video Timeline...');
  const timestamp = Date.now();
  const outputFilename = `master_demo_${timestamp}.mp4`;
  const outputPath = path.join(rendersDir, outputFilename);

  await renderTimeline({
    clips: assembledTimelineSegments,
    voiceoverAudioPath: voResult.filePath,
    musicAudioPath: backgroundMusicPath,
    musicVolume: 0.14,
    outputPath,
    onProgress: (msg) => onProgress(msg)
  });

  const totalRuntime = assembledTimelineSegments.reduce((sum, s) => sum + s.duration, 0);

  // Stage 10: Block Reuse Statistics
  const reuseStats = {
    totalActs: storyBlueprint.acts.length,
    totalRuntimeSeconds: totalRuntime,
    knowledgeBlocksUsed: assembledTimelineSegments.filter(s => !s.title.toLowerCase().includes('b-roll')).length,
    contextualBrollUsed: assembledTimelineSegments.filter(s => s.title.toLowerCase().includes('b-roll')).length,
    blockReusePercentage: Math.round((assembledTimelineSegments.filter(s => !s.title.toLowerCase().includes('b-roll')).length / storyBlueprint.acts.length) * 100)
  };

  onLog('Reuse Engine', 'Block Intelligence Layer', 
    `Master Demo Complete! Runtime: ${totalRuntime.toFixed(1)}s. Composition: ${reuseStats.blockReusePercentage}% authentic Knowledge Blocks, ${100 - reuseStats.blockReusePercentage}% Contextual B-Roll.`, 
    'finding'
  );

  return {
    success: true,
    title: storyBlueprint.title,
    theme: storyBlueprint.narrativeTheme,
    outputPath,
    videoUrl: `/storage/renders/${outputFilename}`,
    totalDuration: totalRuntime,
    voiceoverUrl: voResult.audioUrl,
    voiceoverText: combinedSpokenText,
    voiceoverBeats,
    timelineSegments: assembledTimelineSegments,
    reuseStats
  };
}
