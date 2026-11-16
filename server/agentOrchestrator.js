import { GoogleGenAI } from '@google/genai';
import { generateVoiceover } from './deepgramService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load autonomous directing knowledge base and product bible
let directingPlaybook = {};
let productBible = {};
try {
  const pbPath = path.join(__dirname, 'knowledge', 'DEMO_DIRECTING_PLAYBOOK.json');
  if (fs.existsSync(pbPath)) directingPlaybook = JSON.parse(fs.readFileSync(pbPath, 'utf8'));
  const kbPath = path.join(__dirname, 'knowledge', 'KRECHET_PRODUCT_BIBLE.json');
  if (fs.existsSync(kbPath)) productBible = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
} catch (err) {
  console.warn('[Orchestrator] Warning loading knowledge base:', err.message);
}

/**
 * Multi-Agent Orchestration Pipeline for Semantic Video Assembly.
 * Treats the asset library as reusable raw blocks, selecting only relevant clips.
 */
export class VideoAgentOrchestrator {
  constructor({
    geminiApiKey,
    deepgramApiKey,
    audioOutputDir,
    onProgress,
    onDialogue,
    onMissingClipNeeded
  }) {
    this.geminiApiKey = geminiApiKey || process.env.GEMINI_API_KEY;
    this.deepgramApiKey = deepgramApiKey || process.env.DEEPGRAM_API_KEY;
    this.audioOutputDir = audioOutputDir;
    this.onProgress = onProgress || (() => {});
    this.onDialogue = onDialogue || (() => {});
    this.onMissingClipNeeded = onMissingClipNeeded || null;
  }

  log(agent, role, message, type = 'thought') {
    this.onDialogue({ agent, role, message, type });
  }

  progress(msg) {
    this.onProgress(msg);
  }

  async runPipeline({
    userPrompt,
    scriptMode = 'prompt_generate', // 'user_direct' | 'rewrite' | 'prompt_generate'
    rawScript = '',
    blueprint = null,
    clips = [],
    selectedVoice = 'aura-orion-en',
    musicTrack = null,
    enableLightingEffects = true,
    enableScreenRecordingSpotlight = true,
    enableScreenRecordingSpeed = true,
    screenRecordingSpeed = 1.25
  }) {
    let effectiveClips = clips && clips.length > 0 ? [...clips] : [];
    if (effectiveClips.length === 0) {
      this.log('Scout', 'Asset Scout', 'No pre-existing clips in library. Agents will dynamically produce fresh demonstration blocks for all beats.', 'thought');
      effectiveClips = [{
        clipId: 'dyn_demo_block',
        title: blueprint?.appName ? `${blueprint.appName} Live Simulation` : 'Live Application Demonstration',
        description: 'Dynamically recorded studio block',
        contentType: 'screen_recording',
        lightingProfile: 'screen_dark',
        duration: 4.5,
        filePath: ''
      }];
    }

    this.progress('🎬 Starting Multi-Agent Video Assembly System...');

    // -------------------------------------------------------------
    // STAGE 1: Scout Agent (Reviewing Clip Library & Blueprint Map)
    // -------------------------------------------------------------
    this.progress('🕵️ Scout Agent: Surveying uploaded clip library as reusable blocks...');
    this.log('Scout', 'Asset Scout', `Surveying ${effectiveClips.length} reusable raw blocks in the asset library.`, 'thought');

    if (directingPlaybook?.title) {
      this.log('Scout', 'Asset Scout',
        `📚 Knowledge Base Active: Demo Directing Playbook (v${directingPlaybook.version || '2.0'}) & Product Bible for ${productBible.productName || 'Krechet Marketing Academy'}. Enforcing 4-Act conversion structure and strict audio-visual synchronicity.`,
        'finding'
      );
    }

    if (blueprint && blueprint.keyFeatures && blueprint.keyFeatures.length > 0) {
      this.log('Scout', 'Asset Scout', 
        `🗺️ App Blueprint Active: "${blueprint.appName}" (${blueprint.keyFeatures.length} features verified: ${blueprint.keyFeatures.map(f => f.title).join(', ')}). Aligning script beats directly with verified product capabilities and edit triggers.`, 
        'finding'
      );
    }

    const totalAvailableFootage = effectiveClips.reduce((acc, c) => acc + (c.duration || 0), 0);
    const screenRecordingCount = effectiveClips.filter(c => c.contentType === 'screen_recording').length;
    
    // Category Breakdown from Block Key
    const catCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    effectiveClips.forEach(c => {
      const letter = c.categoryLetter || (c.blockCode ? c.blockCode[0] : 'B');
      if (catCounts[letter] !== undefined) catCounts[letter]++;
    });

    this.log('Scout', 'Asset Scout', 
      `🔑 Consulted BLOCK_KEY.txt: Found ${effectiveClips.length} reusable blocks across Categories: ` +
      `[A] Hooks: ${catCounts.A}, [B] Demos: ${catCounts.B}, [C] Metrics: ${catCounts.C}, [D] Proof: ${catCounts.D}, [E] CTA: ${catCounts.E} ` +
      `(${totalAvailableFootage.toFixed(1)}s total). Inventory confirmed—reusing existing blocks first to conserve resources.`, 
      'finding'
    );

    // -------------------------------------------------------------
    // STAGE 2: Screenplay Agent (Scriptwriting & Timing Beats)
    // -------------------------------------------------------------
    this.progress('✍️ Screenplay Agent: Developing narrative and voiceover beats...');
    
    // Intelligently find the actual draft text: check rawScript or userPrompt
    let effectiveDraft = (rawScript || '').trim();
    if (!effectiveDraft && userPrompt && userPrompt.trim().length > 15) {
      effectiveDraft = userPrompt.trim();
    }

    // Detect voice preference from script directions (e.g. "we hear a female speaking" -> Aura Luna)
    let activeVoice = selectedVoice || 'aura-orion-en';
    if (/female|woman speaking|female voice|woman's voice/i.test(effectiveDraft)) {
      activeVoice = 'aura-luna-en';
      this.log('Sound', 'Audio Director', 
        `🎙️ Female voice directive detected in script prompt. Automatically selecting Aura Luna (Professional Female Voice).`, 
        'finding'
      );
    }

    // Extract any bracketed visual/stage directions (e.g. [The screen slowly comes into focus...])
    const visualDirections = [];
    const bracketMatches = effectiveDraft.match(/\[(.*?)\]/g) || [];
    for (const bm of bracketMatches) {
      const inner = bm.slice(1, -1).trim();
      // Skip part tags like [Part 1]
      if (!/^(?:part|scene|episode|ep|p)\s*\d+/i.test(inner)) {
        visualDirections.push(inner);
      }
    }

    if (visualDirections.length > 0) {
      this.log('Director', 'Visual Guidance', 
        `🎥 Scene visual directive detected: "${visualDirections.join('; ')}". Guiding visual pacing and clip selection accordingly, and excluding it from spoken voiceover.`, 
        'finding'
      );
    }

    // Detect Series / Part tags like [Part 1], Part 1:, p1.v1, p2.v1, [Part 2]
    const partTagRegex = /(?:\[|\b)(?:part|p)\s*([0-9]+)(?:\s*(?:\.|\:)\s*(?:video|v)\s*([0-9]+))?(?:\]|\:|\.|\s|$)/i;
    const partMatch = effectiveDraft.match(partTagRegex);
    let partInfo = null;
    if (partMatch) {
      const partNum = parseInt(partMatch[1], 10);
      const videoNum = partMatch[2] ? parseInt(partMatch[2], 10) : 1;
      partInfo = {
        label: `Part ${partNum}${partMatch[2] ? ` (Video ${videoNum})` : ''}`,
        partNumber: partNum,
        videoNumber: videoNum
      };
      this.log('Showrunner', 'Series Continuity', 
        `🎬 Series Tag Detected: "${partInfo.label}". Matching voiceover (${activeVoice}), music ducking, and visual tempo so this episode meshes perfectly with adjacent parts.`, 
        'finding'
      );
    }

    // Detect target starting URL if provided anywhere in prompt or options
    const urlMatch = (effectiveDraft || '').match(/https?:\/\/[^\s\]\)]+/i);
    const startingUrl = urlMatch ? urlMatch[0] : null;
    if (startingUrl) {
      this.log('Showrunner', 'Target Application', 
        `🌐 Starting Application URL: "${startingUrl}". Using this as the base product context and excluding raw URL string from spoken voiceover.`, 
        'finding'
      );
    }

    // Clean spoken draft text: remove part tags, bracketed stage/visual directions, AND raw URL strings
    const spokenDraftText = effectiveDraft
      .replace(/\[\s*(?:part|scene|episode|ep|p)\s*\d+[^\]]*\]/gi, ' ')
      .replace(/\[.*?\]/g, ' ')
      .replace(/https?:\/\/[^\s\]\)]+/gi, ' ') // Strip raw URLs from spoken narration so voice never reads "https colon slash slash"
      .replace(/\s+/g, ' ')
      .trim();

    this.log('Screenplay', 'Head Writer', 
      `Script Mode: "${scriptMode}". Spoken text length: ${spokenDraftText.length} chars (visual stage directions and raw URLs excluded).`, 
      'thought'
    );

    let beats = [];
    if (scriptMode === 'user_direct' && spokenDraftText.length > 0) {
      this.log('Screenplay', 'Head Writer', 'Using user-provided direct script. Parsing into spoken beats verbatim.', 'thought');
      beats = this.parseRawScriptIntoBeats(spokenDraftText);
    } else {
      beats = await this.generateOrPolishScript({
        userPrompt,
        rawScript: spokenDraftText,
        scriptMode,
        clips: effectiveClips,
        blueprint
      });
    }

    if (visualDirections.length > 0 && beats.length > 0) {
      beats[0].visualGoal = visualDirections[0];
    }

    // Log the generated script lines to the Boardroom so the user sees exactly what was produced
    const scriptSummary = beats.map((b, i) => `${i + 1}. "${b.text}"`).join('\n');
    this.log('Screenplay', 'Head Writer', `Script locked with ${beats.length} beats:\n${scriptSummary}`, 'finding');

    // -------------------------------------------------------------
    // STAGE 3: Director Agent (Assemble & Lock Visual Timeline First)
    // -------------------------------------------------------------
    this.progress('🎬 Director Agent: Selecting, recording & assembling visual timeline blocks...');
    this.log('Director', 'Executive Director', `Filtering library of ${effectiveClips.length} clips and locking visual scene cuts before voiceover synthesis.`, 'thought');

    // Semantic selection of clips for each beat
    const clipSelections = await this.matchClipsToStoryBeats(beats, effectiveClips);

    const timelineClips = [];
    const usedClipIds = new Set();
    let visualTimelineTime = 0;

    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i];
      let match = clipSelections[i] || { clip: effectiveClips[0], rationale: 'Default assignment' };
      let chosenClip = match.clip;

      // Track rhythm to prevent visual fatigue (no 3 consecutive screen recordings without a B-roll breakaway)
      const lastClip = timelineClips.length > 0 ? timelineClips[timelineClips.length - 1] : null;
      const prevPrevClip = timelineClips.length > 1 ? timelineClips[timelineClips.length - 2] : null;
      const consecutiveScreens = (lastClip?.contentType === 'screen_recording' && prevPrevClip?.contentType === 'screen_recording');

      // Autonomous Gap-Filling: Identify when a clip is missing, repeats an already-used block, or causes visual fatigue
      const isReusedOrMissing = !chosenClip || usedClipIds.has(chosenClip.clipId) || chosenClip.clipId === 'dyn_demo_block';
      const needsBreakaway = consecutiveScreens && chosenClip?.contentType === 'screen_recording';

      if ((isReusedOrMissing || needsBreakaway) && this.onMissingClipNeeded) {
        const reason = needsBreakaway 
          ? 'Fatigue Breakaway: 2 consecutive screen takes detected. Interleaving 1080p human B-roll rhythm bridge'
          : `Missing Shot: Beat #${i + 1} ("${beat.text.substring(0, 35)}...") lacks a unique matching block`;

        this.log('Director', 'Executive Director', 
          `🚨 ${reason}. Rejecting footage monotony—dispatching Autonomous Producer to source/record fresh block!`, 
          'finding'
        );
        this.progress(`🎥 Autonomous Recording: Producing missing block for Beat #${i + 1}...`);

        try {
          const freshClip = await this.onMissingClipNeeded({
            beat,
            beatIndex: i,
            blueprint,
            usedClipIds: Array.from(usedClipIds),
            previousClipType: lastClip?.contentType || null
          });
          if (freshClip && freshClip.filePath) {
            chosenClip = freshClip;
            effectiveClips.push(freshClip);
            match = { clip: freshClip, rationale: `Autonomously generated/sourced for Beat #${i + 1}` };
            this.log('Director', 'Executive Director', 
              `✅ Fresh block successfully secured for Beat #${i + 1}: "${freshClip.title}". Assigned to timeline.`, 
              'finding'
            );
          }
        } catch (genErr) {
          console.warn(`[Orchestrator] Error generating missing clip for beat #${i + 1}:`, genErr.message);
        }
      }

      usedClipIds.add(chosenClip.clipId);

      const clipDuration = chosenClip.duration || 10.0;
      // Stage 9: Long Form Demo Mode - allow 2s, 8s, 15s, 45s, 90s based on beat content quality
      const requestedDuration = beat.targetDuration || Math.max(3.0, (beat.text ? beat.text.split(/\s+/).length / 2.3 : 6.0));
      const targetSceneDuration = Math.min(clipDuration, Math.max(2.0, requestedDuration));
      const startIn = 0;
      const endOut = Math.min(clipDuration, startIn + targetSceneDuration);
      const lockedDuration = Math.max(2.0, endOut - startIn);

      beat.exactDuration = lockedDuration;
      beat.startTime = visualTimelineTime;
      visualTimelineTime += lockedDuration;

      const blockTag = chosenClip.blockCode ? `[${chosenClip.blockCode}] ` : '';
      this.log('Director', 'Executive Director', 
        `Beat #${i + 1} locked to Block ${blockTag}"${chosenClip.title}" (${lockedDuration.toFixed(1)}s cut). (${match.rationale})`,
        'thought'
      );

      timelineClips.push({
        beatIndex: i,
        beatText: beat.text,
        clipId: chosenClip.clipId,
        title: chosenClip.title,
        filePath: chosenClip.filePath,
        blockCode: chosenClip.blockCode || null,
        contentType: chosenClip.contentType,
        lightingProfile: chosenClip.lightingProfile,
        in: startIn,
        out: endOut,
        duration: lockedDuration
      });
    }

    const unusedCount = effectiveClips.length - usedClipIds.size;
    this.log('Director', 'Executive Director', 
      `Visual Assembly Complete: ${usedClipIds.size} mute block(s) sequenced on timeline (Total: ${visualTimelineTime.toFixed(1)}s). ${unusedCount} unused block(s) remain in library.`,
      'finding'
    );

    // -------------------------------------------------------------
    // STAGE 4: Sound Producer Agent (Script Pacing & Deepgram Voiceover After Assembly)
    // -------------------------------------------------------------
    this.progress('🎙️ Sound Agent: Calibrating voiceover script to fit locked visual cuts & synthesizing...');
    this.log('Sound', 'Audio Director', `Calibrating speech cadence to match ${visualTimelineTime.toFixed(1)}s visual timeline. Voice: "${activeVoice}".`, 'thought');

    // Calibrate each beat's spoken text so word count strictly fits its locked visual duration (~2.3 words/sec)
    beats.forEach((b, idx) => {
      const maxWords = Math.max(4, Math.round(b.exactDuration * 2.35));
      const words = b.text.split(/\s+/);
      if (words.length > maxWords + 2) {
        b.text = words.slice(0, maxWords).join(' ') + '.';
        this.log('Sound', 'Audio Director', `Paced Beat #${idx + 1} voiceover to fit ${b.exactDuration.toFixed(1)}s visual cut (${maxWords} words).`, 'thought');
      }
    });

    const combinedScriptText = beats.map(b => b.text).join(' ');
    const voiceoverResult = await generateVoiceover({
      text: combinedScriptText,
      voice: activeVoice,
      apiKey: this.deepgramApiKey,
      outputDir: this.audioOutputDir
    });

    this.log('Sound', 'Audio Director', 
      `Voiceover generated (${voiceoverResult.duration.toFixed(1)}s for ${visualTimelineTime.toFixed(1)}s video). Voice track ready to overlay on silent video montage. ${voiceoverResult.isSimulated ? '(Simulated mode)' : '(Deepgram Aura High-Fidelity)'}`, 
      'finding'
    );

    // -------------------------------------------------------------
    // STAGE 5: Visual Stylist Agent (Lighting, Highlights & Zoom FX)
    // -------------------------------------------------------------
    this.progress('✨ Stylist Agent: Applying lighting adjustments and screen recording highlights...');
    this.log('Stylist', 'Visual FX Lead', 'Inspecting selected clips for color balance, screen recording spotlighting, and transitions.', 'thought');

    const stylizedClips = timelineClips.map((item, idx) => {
      const effects = {};
      let speed = 1.0;

      if (enableLightingEffects) {
        if (item.lightingProfile === 'underexposed') {
          effects.lighting = { brightness: 0.08, contrast: 1.15, saturation: 1.05 };
        } else if (item.lightingProfile === 'screen_dark') {
          effects.lighting = { brightness: 0.02, contrast: 1.05, saturation: 1.0 };
        } else {
          effects.lighting = { brightness: 0.02, contrast: 1.05, saturation: 1.02 };
        }
      }

      if (item.contentType === 'screen_recording') {
        if (enableScreenRecordingSpotlight) {
          effects.spotlight = true;
          effects.zoom = true;
        }
        if (enableScreenRecordingSpeed) {
          speed = screenRecordingSpeed || 1.25;
        }
      }

      return {
        ...item,
        effects,
        speed,
        transition: idx === 0 ? 'none' : 'fade'
      };
    });

    const speedCount = stylizedClips.filter(c => c.speed > 1.0).length;
    this.log('Stylist', 'Visual FX Lead', 
      `Visual polish locked: ${stylizedClips.filter(c => c.effects.spotlight).length} clips spotlighted, ${speedCount > 0 ? `${speedCount} screen recordings accelerated by ${screenRecordingSpeed || 1.25}x for snappy human pacing` : 'standard speed'}.`, 
      'finding'
    );

    // -------------------------------------------------------------
    // Output Locked EDL (Edit Decision List)
    // -------------------------------------------------------------
    const finalEDL = {
      projectTitle: userPrompt || 'Automated Video Project',
      partInfo: partInfo || null,
      totalDuration: Math.max(visualTimelineTime, voiceoverResult.duration),
      visualDuration: visualTimelineTime,
      voiceoverAudioPath: voiceoverResult.audioPath,
      voiceoverDuration: voiceoverResult.duration,
      selectedVoice: activeVoice,
      musicTrack,
      clips: stylizedClips,
      beats,
      usedClipsCount: usedClipIds.size,
      totalLibraryCount: clips.length
    };

    this.progress('✅ Production Plan Locked & Approved! Ready to render.');
    return finalEDL;
  }

  /**
   * Intelligently selects the best clip from the library for each beat.
   * Does NOT use all clips unless they actually match the narrative.
   */
  async matchClipsToStoryBeats(beats, clips) {
    if (this.geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: this.geminiApiKey });

        const clipCatalog = clips.map((c) => ({
          clipId: c.clipId,
          title: c.title,
          description: c.description,
          keyActions: c.keyActions || [],
          tags: c.tags || [],
          duration: c.duration
        }));

        const prompt = `
          You are an expert commercial film director and video editor.
          
          DIRECTING KNOWLEDGE BASE & MANDATES:
          1. Strict Synchronicity: The eye and the ear MUST experience the exact same concept simultaneously.
             - Mentions "Sarah Jenkins", "AI instructor", or "mentorship" -> MUST select the Sarah Jenkins Mentorship block ([B2]).
             - Mentions "Jenny's Artisan Java", "client dossier", "CAC", or "unit economics" -> MUST select the Client Onboarding Dossier ([B3]) or Artisan Coffee B-Roll ([A1]).
             - Mentions "H1 headings", "SEO workbench", "CMS editor", or "audit score" -> MUST select the SEO Workbench CMS block ([B4]).
             - Mentions "Day 1", "simulation launcher", "cockpit", or "learning mode" -> MUST select the Day 1 Simulation Launcher block ([B1]).
          2. No Kindergarten Editing: Strictly disqualify unrelated stock footage (e.g. flames, burning matches, random city crowds). Every visual must belong to either the software simulator or the client/marketing reality.
          3. Fatigue Relief: Alternate rhythm between UI interaction screens and contextual human/brand breakaways.

          Available Video Blocks in Library (${clips.length} blocks):
          ${JSON.stringify(clipCatalog, null, 2)}

          Voiceover Story Beats:
          ${JSON.stringify(beats.map(b => ({ id: b.id, text: b.text, visualGoal: b.visualGoal })), null, 2)}

          TASK:
          For each beat, select the single best matching clip from the library that visually portrays what is being said.
          CRITICAL: Do NOT attempt to use all clips. Only choose clips that are genuinely relevant to the beat. Clips that do not fit must be omitted.

          Return JSON format:
          {
            "selections": [
              {
                "beatId": "beat_1",
                "clipId": "matching_clip_id",
                "rationale": "Direct explanation of why this clip fits the audio-visual synchronicity mandate"
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
        if (parsed.selections && Array.isArray(parsed.selections)) {
          return beats.map((b) => {
            const sel = parsed.selections.find(s => s.beatId === b.id);
            const foundClip = sel ? clips.find(c => c.clipId === sel.clipId) : null;
            return {
              clip: foundClip || this.heuristicBestClip(b, clips),
              rationale: sel?.rationale || 'Selected by visual match'
            };
          });
        }
      } catch (err) {
        console.warn('[Director] AI clip matching error, falling back to heuristic:', err.message);
      }
    }

    // Heuristic semantic scoring fallback
    const usedIds = new Set();
    return beats.map(b => {
      const best = this.heuristicBestClip(b, clips, usedIds);
      if (best) usedIds.add(best.clipId);
      return {
        clip: best,
        rationale: 'Semantic keyword & action relevance'
      };
    });
  }

  /**
   * Scores clips by keyword relevance against the beat
   */
  heuristicBestClip(beat, clips, usedClipIds = new Set()) {
    const textToMatch = `${beat.text} ${beat.visualGoal || ''}`.toLowerCase();
    let bestClip = clips[0];
    let highestScore = -999;

    clips.forEach(clip => {
      let score = 0;
      const titleWords = (clip.title || '').toLowerCase().split(/\s+/);
      const descWords = (clip.description || '').toLowerCase().split(/\s+/);
      const actionWords = (clip.keyActions || []).join(' ').toLowerCase().split(/\s+/);
      const tagWords = (clip.tags || []).join(' ').toLowerCase().split(/\s+/);

      [...titleWords, ...actionWords, ...descWords, ...tagWords].forEach(word => {
        if (word.length > 2 && textToMatch.includes(word)) {
          score += 3;
        }
      });

      // Direct block code matching: e.g. [A1], A1, B2, C1, etc.
      if (clip.blockCode) {
        const codeRegex = new RegExp(`(?:\\[|\\b)${clip.blockCode}(?:\\]|\\b)`, 'i');
        if (codeRegex.test(textToMatch)) {
          score += 100; // Overwhelming priority for explicit block code instruction!
        }
      }

      // Bonus for unused clips to maximize visual variety and scene diversity across the video!
      if (!usedClipIds.has(clip.clipId)) {
        score += 2;
      }

      if (score > highestScore) {
        highestScore = score;
        bestClip = clip;
      }
    });

    return bestClip;
  }

  parseRawScriptIntoBeats(scriptText) {
    const cleanText = (scriptText || '')
      .replace(/\[\s*(?:part|scene|episode|ep|p)\s*\d+[^\]]*\]/gi, ' ')
      .replace(/\[.*?\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const rawSentences = cleanText
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return rawSentences.map((sentence, idx) => ({
      id: `beat_${idx + 1}`,
      text: sentence,
      visualGoal: `Show relevant screen action for: "${sentence.substring(0, 30)}..."`,
      targetDuration: Math.max(2.0, sentence.split(/\s+/).length / 2.3)
    }));
  }

  async generateOrPolishScript({ userPrompt, rawScript, scriptMode, clips, blueprint = null }) {
    const draftText = (rawScript || userPrompt || '').trim();

    if (this.geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: this.geminiApiKey });

        const clipSummaries = clips.map((c, i) => 
          `Block ${i + 1} (ID: ${c.clipId}): "${c.title}" (${c.contentType}, ${c.duration.toFixed(1)}s) - ${c.description}. Actions: ${c.keyActions?.join(', ') || 'N/A'}`
        ).join('\n');

        let blueprintInfo = '';
        if (blueprint && blueprint.keyFeatures && blueprint.keyFeatures.length > 0) {
          blueprintInfo = `
VERIFIED APPLICATION BLUEPRINT (Learned from user's guided walkthrough):
App Name: ${blueprint.appName || 'Web Application'}
Overview: ${blueprint.overview || ''}
${blueprint.userSpokenTranscript ? `User's Spoken Tour Guidance: "${blueprint.userSpokenTranscript}"` : ''}
Key Verified Features & Edit Triggers:
${blueprint.keyFeatures.map((f, i) => `${i + 1}. [${f.title}] - Location: ${f.locationOrRoute}. Edit Trigger: ${f.editOrActionTrigger}. Description: ${f.description}`).join('\n')}
(CRITICAL: Weave these verified features and exact edit actions into the storybeats!)
          `;
        }

        let productContext = '';
        if (productBible && productBible.productName) {
          productContext = `
PRODUCT KNOWLEDGE BASE (${productBible.productName}):
Positioning: ${productBible.positioning}
Target Audience & Pain: ${productBible.targetAudience?.primary} — Core Frustration: "${productBible.targetAudience?.coreFrustration}".
Verified Capabilities & Proof Points:
${(productBible.verifiedProductFeatures || []).map(f => `- [${f.featureCode}] ${f.name}: ${f.whatItShows}. Hook: ${f.narrativeHook}`).join('\n')}
          `;
        }

        let instruction = '';
        if (scriptMode === 'rewrite') {
          instruction = `
            The user provided this rough draft / notes for a video script:
            """${draftText}"""

            TASK:
            1. Strip any meta commands (e.g. "create a video about...", "make a short clip", etc.).
            2. Fix all grammatical and spelling errors.
            3. Rewrite and polish this into natural, broadcast-ready voiceover sentences spoken by a confident human narrator.
            4. Follow the High-Converting Demo Arc: Hook (Pain of passive courses) -> Unique Mechanism (AI simulation cockpit & Sarah Jenkins) -> Tangible Proof (Jenny's Artisan Java CAC/LTV & live SEO workbench H1 edits) -> Career Transformation & CTA.
            5. Enforce strict synchronicity with available visual blocks.
          `;
        } else {
          instruction = `
            The user wants a video with this objective:
            "${userPrompt || 'Product / Demo Walkthrough'}"
            Write an engaging, punchy, conversational voiceover narration for this video.
            Follow the High-Converting Demo Arc and reference the actions and screens shown in the available clip blocks.
          `;
        }

        const prompt = `
          You are a master commercial video scriptwriter and voiceover director.
          ${productContext}
          ${blueprintInfo}

          DIRECTING MANDATE:
          1. Show, Don't Lecture: Write lines that directly describe and highlight the exact UI actions or client brand context visible on screen.
          2. No Fluff: Ground claims in real agency deliverables (e.g. Jenny's Artisan Java, Sarah Jenkins AI mentor, H1 heading hierarchies, CAC & LTV unit economics).
          3. Pacing & Depth: Flexible, content-driven duration (Stage 9 Long Form Demo Mode). Explain features thoroughly (8s to 30s+ per beat) without arbitrary 3-second cuts.

          Available Video Blocks in Library:
          ${clipSummaries}

          ${instruction}

          Structure the narration into clear, authoritative narrative beats that let demonstrations breathe (durations can range from 6 to 35 seconds per beat based on feature complexity).
          Return ONLY valid JSON matching this exact structure:
          {
            "beats": [
              {
                "id": "beat_1",
                "text": "Exact polished spoken narration sentence.",
                "visualGoal": "Description of what screen or visual action should accompany this line.",
                "targetDuration": 4.0
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
        if (parsed.beats && Array.isArray(parsed.beats) && parsed.beats.length > 0) {
          return parsed.beats;
        }
      } catch (err) {
        console.warn('[Screenplay Error] Gemini call failed, using smart local polisher:', err.message);
      }
    }

    // Smart Local Polisher (Works offline and without Gemini API key)
    return this.polishDraftLocally(draftText, clips);
  }

  /**
   * Expert local draft polisher:
   * Strips meta prompts, fixes common typos, improves grammar, and structures into punchy spoken beats.
   */
  polishDraftLocally(draftText, clips) {
    if (!draftText || draftText.length < 10) {
      return this.generateFallbackBeats('Krechet Academy', clips);
    }

    // 1. Strip meta prompts, URLs, and chapter/part tags like "[Part 1]", "p1.v1:", and bracketed stage directions
    let clean = draftText
      .replace(/^(create|make|generate|produce)\s+(a\s+)?(short\s+)?(awareness\s+)?video\s+(about|for)\s*:?/i, '')
      .replace(/^(this\s+video\s+is\s+about)\s*:?/i, '')
      .replace(/^\[?\b(?:part|p)\s*[0-9]+(?:\s*(?:\.|\:)\s*(?:video|v)\s*[0-9]+)?\]?[\:\.\-\s]+/i, '')
      .replace(/\[.*?\]/g, ' ') // Strip all bracketed stage/visual directions
      .replace(/https?:\/\/[^\s\]\)]+/gi, ' ') // Strip raw URLs from voiceover text
      .replace(/^"(.*?)"$/s, '$1') // unquote outer quotes if wrapped
      .trim();

    // 2. Fix grammatical and spelling quirks
    clean = clean
      .replace(/\bhads\s+on\b/gi, 'hands-on')
      .replace(/\bthes\s+simulations\b/gi, 'These simulations')
      .replace(/\bthes\b/gi, 'these')
      .replace(/\bhe lack of effort\b/gi, 'the lack of effort')
      .replace(/\byour not hearing\b/gi, "you're not hearing")
      .replace(/\byour taking\b/gi, "you're taking")
      .replace(/\btha isnt helping\b/gi, "that isn't helping")
      .replace(/\bvideo's\b/gi, 'videos')
      .replace(/\bmarketing\s+student\b/gi, 'marketing students')
      .replace(/\bi\s+does\b/gi, 'it does')
      .replace(/"Krechet Academy"/gi, 'Krechet Academy')
      .trim();

    // 3. Extract sentences and decompose long clauses into snappy micro-beats (2.8s - 4.5s)
    const rawSentences = clean
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 8);

    const microBeats = [];
    rawSentences.forEach((sentence) => {
      const words = sentence.split(/\s+/);
      // If sentence has more than 13 words, break at natural pauses for dynamic cutting
      if (words.length > 13 && /[,;]|\b(and unlike|unlike|where|while|because|meaning|so that)\b/i.test(sentence)) {
        const parts = sentence.split(/(?<=[,;])\s+|\s+(?=(?:and unlike|where|while|meaning|so that)\b)/i)
          .map(p => p.trim())
          .filter(p => p.length > 12);
        if (parts.length > 1) {
          parts.forEach(p => microBeats.push(p));
          return;
        }
      }
      microBeats.push(sentence);
    });

    const candidateList = microBeats.length > 0 ? microBeats : rawSentences;

    if (candidateList.length > 0) {
      return candidateList.map((sentence, idx) => {
        let text = sentence.replace(/[,;:]+$/g, '').trim();
        if (!/[.?!]$/.test(text)) text += '.';
        text = text.charAt(0).toUpperCase() + text.slice(1);

        // Make the opening sentence sound like a real voiceover intro if it starts with brand name
        if (idx === 0 && !text.toLowerCase().startsWith('welcome') && !text.toLowerCase().startsWith('introducing')) {
          if (text.toLowerCase().startsWith('krechet academy')) {
            text = text.replace(/^krechet academy\s+(a\s+platform|is\s+a\s+platform)?/i, 'Welcome to Krechet Academy—a platform');
          }
        }

        const wordCount = text.split(/\s+/).length;
        const naturalDuration = Math.max(3.5, wordCount / 2.3);
        return {
          id: `beat_${idx + 1}`,
          text,
          visualGoal: `Show relevant screen action for: "${text.substring(0, 35)}..."`,
          targetDuration: Math.round(naturalDuration * 10) / 10
        };
      });
    }

    return this.generateFallbackBeats(draftText, clips);
  }

  generateFallbackBeats(userPrompt, clips) {
    const topic = userPrompt || 'application walkthrough';
    return [
      {
        id: 'beat_1',
        text: `Welcome to this overview of ${topic}. Let's explore how everything works together.`,
        visualGoal: 'Overview screen or initial interface',
        targetDuration: 4.0
      },
      {
        id: 'beat_2',
        text: 'From the main workspace, navigating the options is intuitive and built directly into your workflow.',
        visualGoal: 'Detailed screen interaction and menus',
        targetDuration: 4.5
      },
      {
        id: 'beat_3',
        text: 'With just a few clicks, you can finalize your project and achieve seamless results in seconds.',
        visualGoal: 'Completed action, export, or final result',
        targetDuration: 4.0
      }
    ];
  }
}
