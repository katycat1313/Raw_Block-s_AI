import { GoogleGenAI } from '@google/genai';
import { generateVoiceover } from './deepgramService.js';
import path from 'path';

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
    onDialogue
  }) {
    this.geminiApiKey = geminiApiKey || process.env.GEMINI_API_KEY;
    this.deepgramApiKey = deepgramApiKey || process.env.DEEPGRAM_API_KEY;
    this.audioOutputDir = audioOutputDir;
    this.onProgress = onProgress || (() => {});
    this.onDialogue = onDialogue || (() => {});
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
    clips = [],
    selectedVoice = 'aura-orion-en',
    musicTrack = null,
    enableLightingEffects = true,
    enableScreenRecordingSpotlight = true,
    enableScreenRecordingSpeed = true,
    screenRecordingSpeed = 1.25
  }) {
    if (!clips || clips.length === 0) {
      throw new Error('At least one uploaded clip is required in the library to assemble a video.');
    }

    this.progress('🎬 Starting Multi-Agent Video Assembly System...');

    // -------------------------------------------------------------
    // STAGE 1: Scout Agent (Reviewing Clip Library)
    // -------------------------------------------------------------
    this.progress('🕵️ Scout Agent: Surveying uploaded clip library as reusable blocks...');
    this.log('Scout', 'Asset Scout', `Surveying ${clips.length} reusable raw blocks in the asset library.`, 'thought');

    const totalAvailableFootage = clips.reduce((acc, c) => acc + (c.duration || 0), 0);
    const screenRecordingCount = clips.filter(c => c.contentType === 'screen_recording').length;
    
    this.log('Scout', 'Asset Scout', 
      `Library contains ${clips.length} reusable raw blocks (${totalAvailableFootage.toFixed(1)}s total). ${screenRecordingCount} screen recordings. Ready for targeted selection.`, 
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

    this.log('Screenplay', 'Head Writer', 
      `Script Mode: "${scriptMode}". Input text length: ${effectiveDraft.length} chars.`, 
      'thought'
    );

    let beats = [];
    if (scriptMode === 'user_direct' && effectiveDraft.length > 0) {
      this.log('Screenplay', 'Head Writer', 'Using user-provided direct script. Parsing into spoken beats verbatim.', 'thought');
      beats = this.parseRawScriptIntoBeats(effectiveDraft);
    } else {
      beats = await this.generateOrPolishScript({
        userPrompt,
        rawScript: effectiveDraft,
        scriptMode,
        clips
      });
    }

    // Log the generated script lines to the Boardroom so the user sees exactly what was produced
    const scriptSummary = beats.map((b, i) => `${i + 1}. "${b.text}"`).join('\n');
    this.log('Screenplay', 'Head Writer', `Script locked with ${beats.length} beats:\n${scriptSummary}`, 'finding');

    // -------------------------------------------------------------
    // STAGE 3: Sound Producer Agent (Deepgram Voiceover & Music)
    // -------------------------------------------------------------
    this.progress('🎙️ Sound Agent: Generating Deepgram Aura voiceover & measuring timing...');
    this.log('Sound', 'Audio Director', `Synthesizing script with voice "${selectedVoice}" via Deepgram Aura.`, 'thought');

    const combinedScriptText = beats.map(b => b.text).join(' ');
    const voiceoverResult = await generateVoiceover({
      text: combinedScriptText,
      voice: selectedVoice,
      apiKey: this.deepgramApiKey,
      outputDir: this.audioOutputDir
    });

    this.log('Sound', 'Audio Director', 
      `Voiceover generated (${voiceoverResult.duration.toFixed(1)}s). Speech cadence: ~${(combinedScriptText.split(' ').length / voiceoverResult.duration * 60).toFixed(0)} WPM. ${voiceoverResult.isSimulated ? '(Simulated mode)' : '(Deepgram Aura High-Fidelity)'}`, 
      'finding'
    );

    // Distribute actual measured audio duration proportionally across beats
    const totalWords = combinedScriptText.split(/\s+/).length || 1;
    let accumulatedTime = 0;
    beats.forEach((b) => {
      const beatWords = b.text.split(/\s+/).length || 1;
      const proportion = beatWords / totalWords;
      b.exactDuration = Math.max(1.5, proportion * voiceoverResult.duration);
      b.startTime = accumulatedTime;
      accumulatedTime += b.exactDuration;
    });

    // -------------------------------------------------------------
    // STAGE 4: Director Agent (Intelligent Clip Matching & Selection)
    // -------------------------------------------------------------
    this.progress('🎬 Director Agent: Selecting only matching clips from library...');
    this.log('Director', 'Executive Director', `Filtering library of ${clips.length} clips to pick only the blocks that fit each beat.`, 'thought');

    // Semantic selection of clips for each beat
    const clipSelections = await this.matchClipsToStoryBeats(beats, clips);

    const timelineClips = [];
    const usedClipIds = new Set();

    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i];
      const match = clipSelections[i] || { clip: clips[0], rationale: 'Default assignment' };
      const chosenClip = match.clip;
      usedClipIds.add(chosenClip.clipId);

      const clipDuration = chosenClip.duration || 5.0;
      const beatDuration = beat.exactDuration;

      // Calculate in / out points to capture good motion within the clip
      const startIn = Math.min(0.5, Math.max(0, (clipDuration - beatDuration) / 2));
      const endOut = Math.min(clipDuration, startIn + beatDuration);

      this.log('Director', 'Executive Director', 
        `Beat #${i + 1} ("${beat.text.substring(0, 30)}...") matched to Clip "${chosenClip.title}". (${match.rationale})`,
        'thought'
      );

      timelineClips.push({
        beatIndex: i,
        beatText: beat.text,
        clipId: chosenClip.clipId,
        title: chosenClip.title,
        filePath: chosenClip.filePath,
        contentType: chosenClip.contentType,
        lightingProfile: chosenClip.lightingProfile,
        in: startIn,
        out: endOut,
        duration: endOut - startIn
      });
    }

    const unusedCount = clips.length - usedClipIds.size;
    this.log('Director', 'Executive Director', 
      `Selected ${usedClipIds.size} relevant clip(s) for this video. ${unusedCount} unused block(s) remain untouched in your library for other videos.`,
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
      totalDuration: voiceoverResult.duration,
      voiceoverAudioPath: voiceoverResult.audioPath,
      voiceoverDuration: voiceoverResult.duration,
      selectedVoice,
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
          You are an expert film director and editor.
          You have a library of ${clips.length} reusable video clips ("raw blocks"):
          ${JSON.stringify(clipCatalog, null, 2)}

          Here are the voiceover story beats for the video:
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
                "rationale": "Short explanation of why this clip fits the visual goal"
              }
            ]
          }
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
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
    return beats.map(b => ({
      clip: this.heuristicBestClip(b, clips),
      rationale: 'Semantic keyword & action relevance'
    }));
  }

  /**
   * Scores clips by keyword relevance against the beat
   */
  heuristicBestClip(beat, clips) {
    const textToMatch = `${beat.text} ${beat.visualGoal || ''}`.toLowerCase();
    let bestClip = clips[0];
    let highestScore = -1;

    clips.forEach(clip => {
      let score = 0;
      const titleWords = (clip.title || '').toLowerCase().split(/\s+/);
      const descWords = (clip.description || '').toLowerCase().split(/\s+/);
      const actionWords = (clip.keyActions || []).join(' ').toLowerCase().split(/\s+/);

      [...titleWords, ...actionWords, ...descWords].forEach(word => {
        if (word.length > 3 && textToMatch.includes(word)) {
          score += 2;
        }
      });

      if (score > highestScore) {
        highestScore = score;
        bestClip = clip;
      }
    });

    return bestClip;
  }

  parseRawScriptIntoBeats(scriptText) {
    const rawSentences = scriptText
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

  async generateOrPolishScript({ userPrompt, rawScript, scriptMode, clips }) {
    const draftText = (rawScript || userPrompt || '').trim();

    if (this.geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: this.geminiApiKey });

        const clipSummaries = clips.map((c, i) => 
          `Block ${i + 1} (ID: ${c.clipId}): "${c.title}" (${c.contentType}, ${c.duration.toFixed(1)}s) - ${c.description}. Actions: ${c.keyActions?.join(', ') || 'N/A'}`
        ).join('\n');

        let instruction = '';
        if (scriptMode === 'rewrite') {
          instruction = `
            The user provided this rough draft / notes for a video script:
            """${draftText}"""

            TASK:
            1. Strip any meta commands (e.g. "create a video about...", "make a short clip", etc.).
            2. Fix all grammatical and spelling errors (e.g. "hads on" -> "hands on", "Thes" -> "These", "student" -> "students").
            3. Rewrite and polish this into natural, broadcast-ready voiceover sentences spoken by a professional human narrator.
            4. Make the narrative flow logically: Hook/Introduction -> Core Value Proposition -> How it Works (Client Simulations) -> Real-World Impact.
            5. Ensure the visual actions match the available clip blocks.
          `;
        } else {
          instruction = `
            The user wants a video with this objective:
            "${userPrompt || 'Product / Demo Walkthrough'}"
            Write an engaging, punchy, conversational voiceover narration for this video.
            Reference the actions and screens shown in the available clip blocks.
          `;
        }

        const prompt = `
          You are a master video scriptwriter and voiceover director.
          Available Video Blocks in Library:
          ${clipSummaries}

          ${instruction}

          Break the polished narration into 3 to 6 snappy, punchy micro-beats (aim for 2.8 to 4.2 seconds per beat for fast-paced commercial editing).
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
          model: 'gemini-2.5-flash',
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

    // 1. Strip meta prompts like "create a short awareness video about"
    let clean = draftText
      .replace(/^(create|make|generate|produce)\s+(a\s+)?(short\s+)?(awareness\s+)?video\s+(about|for)\s*:?/i, '')
      .replace(/^(this\s+video\s+is\s+about)\s*:?/i, '')
      .replace(/^"(.*?)"$/s, '$1') // unquote outer quotes if wrapped
      .trim();

    // 2. Fix grammatical and spelling quirks
    clean = clean
      .replace(/\bhads\s+on\b/gi, 'hands-on')
      .replace(/\bthes\s+simulations\b/gi, 'These simulations')
      .replace(/\bthes\b/gi, 'these')
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

        return {
          id: `beat_${idx + 1}`,
          text,
          visualGoal: `Show relevant screen action for: "${text.substring(0, 35)}..."`,
          targetDuration: Math.max(2.5, Math.min(4.5, text.split(/\s+/).length / 2.3))
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
