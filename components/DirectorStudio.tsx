import React from 'react';
import { CHAPTER_PRESETS, ChapterPreset } from '../constants/chapterPresets';

export interface DeepgramVoice {
  id: string;
  name: string;
  gender: string;
  style: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
}

interface DirectorStudioProps {
  userPrompt: string;
  setUserPrompt: (val: string) => void;
  scriptMode: 'prompt_generate' | 'rewrite' | 'user_direct';
  setScriptMode: (val: 'prompt_generate' | 'rewrite' | 'user_direct') => void;
  rawScript: string;
  setRawScript: (val: string) => void;
  voices: DeepgramVoice[];
  selectedVoice: string;
  setSelectedVoice: (val: string) => void;
  musicTracks: MusicTrack[];
  selectedMusicId: string;
  setSelectedMusicId: (val: string) => void;
  enableLightingEffects: boolean;
  setEnableLightingEffects: (val: boolean) => void;
  enableScreenRecordingSpotlight: boolean;
  setEnableScreenRecordingSpotlight: (val: boolean) => void;
  enableScreenRecordingSpeed: boolean;
  setEnableScreenRecordingSpeed: (val: boolean) => void;
  onStartOrchestration: () => void;
  isOrchestrating: boolean;
  clipCount: number;
  seriesPartsCount?: number;
}

export const DirectorStudio: React.FC<DirectorStudioProps> = ({
  userPrompt,
  setUserPrompt,
  scriptMode,
  setScriptMode,
  rawScript,
  setRawScript,
  voices,
  selectedVoice,
  setSelectedVoice,
  musicTracks,
  selectedMusicId,
  setSelectedMusicId,
  enableLightingEffects,
  setEnableLightingEffects,
  enableScreenRecordingSpotlight,
  setEnableScreenRecordingSpotlight,
  enableScreenRecordingSpeed,
  setEnableScreenRecordingSpeed,
  onStartOrchestration,
  isOrchestrating,
  clipCount,
  seriesPartsCount = 0
}) => {
  const activePromptText = scriptMode === 'prompt_generate' ? userPrompt : (rawScript || userPrompt);
  const partMatch = activePromptText.match(/(?:\[|\b)(?:part|p)\s*([0-9]+)(?:\s*(?:\.|\:)\s*(?:video|v)\s*([0-9]+))?(?:\]|\:|\.|\s|$)/i);

  const handleInsertTag = (tag: string) => {
    if (scriptMode === 'prompt_generate') {
      const cleaned = userPrompt.replace(/^\[?\b(?:part|p)\s*[0-9]+(?:\s*(?:\.|\:)\s*(?:video|v)\s*[0-9]+)?\]?[\:\.\-\s]*/i, '').trim();
      setUserPrompt(`${tag} ${cleaned}`);
    } else {
      const current = rawScript || userPrompt;
      const cleaned = current.replace(/^\[?\b(?:part|p)\s*[0-9]+(?:\s*(?:\.|\:)\s*(?:video|v)\s*[0-9]+)?\]?[\:\.\-\s]*/i, '').trim();
      setRawScript(`${tag} ${cleaned}`);
      setUserPrompt(`${tag} ${cleaned}`);
    }
  };

  const handleLoadPreset = (preset: typeof CHAPTER_PRESETS[0]) => {
    setRawScript(preset.script);
    setUserPrompt(preset.script);
    setScriptMode('user_direct');
  };

  return (
    <div id="director-studio-panel" style={{
      background: '#121217',
      border: '1px solid #23232f',
      borderRadius: '16px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎬 Director & Script Studio
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Instruct the agents on narrative structure, voiceover, and visual effects
          </span>
        </div>
      </div>

      {/* Series Vault Status Notification Banner */}
      {seriesPartsCount > 0 && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '10px',
          padding: '0.65rem 0.95rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.82rem',
          color: '#34d399'
        }}>
          <div>
            <span>🎬 <strong>Series Vault Progress:</strong> {seriesPartsCount} {seriesPartsCount === 1 ? 'part' : 'parts'} safely saved. Ready to direct <strong>Part {seriesPartsCount + 1}</strong>!</span>
          </div>
          {seriesPartsCount < CHAPTER_PRESETS.length && (
            <button
              type="button"
              onClick={() => handleLoadPreset(CHAPTER_PRESETS[seriesPartsCount])}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}
            >
              <span>⚡ Load {CHAPTER_PRESETS[seriesPartsCount].title}</span> ➔
            </button>
          )}
        </div>
      )}

      {/* Script Mode Selector Tabs */}
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
          Script & Narration Mode
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          background: '#090a0f',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setScriptMode('prompt_generate')}
            style={{
              padding: '0.5rem 0.4rem',
              borderRadius: '7px',
              border: 'none',
              background: scriptMode === 'prompt_generate' ? '#6366f1' : 'transparent',
              color: scriptMode === 'prompt_generate' ? '#ffffff' : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            🤖 AI Writes Script
          </button>
          <button
            type="button"
            onClick={() => {
              setScriptMode('rewrite');
              // If userPrompt already has content, copy it over to rawScript
              if (!rawScript && userPrompt) setRawScript(userPrompt);
            }}
            style={{
              padding: '0.5rem 0.4rem',
              borderRadius: '7px',
              border: 'none',
              background: scriptMode === 'rewrite' ? '#6366f1' : 'transparent',
              color: scriptMode === 'rewrite' ? '#ffffff' : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            ✍️ Polish My Draft
          </button>
          <button
            type="button"
            onClick={() => {
              setScriptMode('user_direct');
              if (!rawScript && userPrompt) setRawScript(userPrompt);
            }}
            style={{
              padding: '0.5rem 0.4rem',
              borderRadius: '7px',
              border: 'none',
              background: scriptMode === 'user_direct' ? '#6366f1' : 'transparent',
              color: scriptMode === 'user_direct' ? '#ffffff' : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            📜 Direct User Script
          </button>
        </div>
      </div>

      {/* Series / Chapter Continuity Tag Bar */}
      <div style={{
        background: '#090a0f',
        borderRadius: '10px',
        padding: '0.65rem 0.85rem',
        border: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🎬</span> Series & Episode Continuity:
          </span>
          {partMatch && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'rgba(236, 72, 153, 0.2)',
              color: '#f472b6',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              ✨ Part {partMatch[1]}{partMatch[2] ? ` (Video ${partMatch[2]})` : ''} Continuity Locked
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['[Part 1]', '[Part 2]', '[Part 3]', '[Part 4]', 'p1.v1', 'p2.v1', 'p3.v1'].map((tag) => {
            const isMatch = partMatch && (
              (tag === `[Part ${partMatch[1]}]`) ||
              (tag === `p${partMatch[1]}.v${partMatch[2] || 1}`)
            );
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleInsertTag(tag)}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: isMatch ? 700 : 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isMatch ? 'rgba(236, 72, 153, 0.25)' : 'rgba(99, 102, 241, 0.12)',
                  color: isMatch ? '#f472b6' : '#a5b4fc',
                  border: isMatch ? '1px solid rgba(236, 72, 153, 0.5)' : '1px solid rgba(99, 102, 241, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isMatch) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
                }}
                onMouseLeave={(e) => {
                  if (!isMatch) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                }}
              >
                {isMatch ? '✓ ' : '+ '}{tag}
              </button>
            );
          })}
          <span style={{ fontSize: '0.68rem', color: '#64748b', alignSelf: 'center', marginLeft: '0.2rem' }}>
            Agents match voice persona, 1.25x tempo & ducked audio across episodes
          </span>
        </div>

        {/* 1-Click Course Storyline Presets */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flexWrap: 'wrap',
          marginTop: '0.2rem',
          paddingTop: '0.4rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>📋</span> Course Script Presets:
          </span>
          {CHAPTER_PRESETS.map((cp) => {
            const isSelected = partMatch && Number(partMatch[1]) === cp.part;
            return (
              <button
                key={cp.part}
                type="button"
                onClick={() => handleLoadPreset(cp)}
                title={cp.summary}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 700 : 500,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#f472b6' : '#cbd5e1',
                  border: isSelected ? '1px solid rgba(236, 72, 153, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {isSelected ? '✓ ' : ''}{cp.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Single Text Input Area Depending on Selected Mode */}
      {scriptMode === 'prompt_generate' && (
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
            What should this video achieve? (Agent Prompt)
          </label>
          <textarea
            rows={5}
            placeholder="e.g., Create a 30-second awareness video introducing Krechet Academy. Focus on how digital marketing students learn through weekly client simulations and practical workshops."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: '#181822',
              color: '#f8fafc',
              fontSize: '0.86rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: '1.4'
            }}
          />
        </div>
      )}

      {scriptMode === 'rewrite' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
              Your Rough Draft / Talking Points to Polish
            </label>
            <span style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 600 }}>
              ✨ Screenplay Agent will clean typos, pace beats & polish
            </span>
          </div>
          <textarea
            rows={5}
            placeholder="Paste your rough thoughts, talking points, or draft script here. The Screenplay Agent will clean up grammar, improve cadence, and format it into punchy, spoken voiceover beats..."
            value={rawScript || userPrompt}
            onChange={(e) => {
              setRawScript(e.target.value);
              setUserPrompt(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid #6366f1',
              background: '#181822',
              color: '#f8fafc',
              fontSize: '0.86rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: '1.4'
            }}
          />
        </div>
      )}

      {scriptMode === 'user_direct' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
              Your Exact Script Narration (Word-for-Word)
            </label>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
              🔒 Spoken verbatim without alterations
            </span>
          </div>
          <textarea
            rows={5}
            placeholder="Type or paste your exact narration here. Sentences will be matched to the best video clips without changing your words..."
            value={rawScript || userPrompt}
            onChange={(e) => {
              setRawScript(e.target.value);
              setUserPrompt(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid #10b981',
              background: '#181822',
              color: '#f8fafc',
              fontSize: '0.86rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: '1.4'
            }}
          />
        </div>
      )}

      {/* Audio Settings: Deepgram Voice & Background Music */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {/* Voice Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
            🎙️ Deepgram Human Voice
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#181822',
              color: '#f8fafc',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.style} - {v.gender})
              </option>
            ))}
          </select>
        </div>

        {/* Music Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
            🎵 Background Music
          </label>
          <select
            value={selectedMusicId}
            onChange={(e) => setSelectedMusicId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#181822',
              color: '#f8fafc',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          >
            <option value="">Default (Chill Tech Ambient)</option>
            {musicTracks.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="none">Mute (No Background Music)</option>
          </select>
        </div>
      </div>

      {/* Visual Effects & Lighting Enhancements */}
      <div style={{
        background: '#0e0e14',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          ✨ Intelligent Post-Processing & Lighting
        </span>

        {/* Toggle 1: Screen Recording Spotlight */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: '#e2e8f0' }}>
          <input
            type="checkbox"
            checked={enableScreenRecordingSpotlight}
            onChange={(e) => setEnableScreenRecordingSpotlight(e.target.checked)}
            style={{ accentColor: '#6366f1', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>
            <strong>Screen Recording Spotlight & Focus Zoom:</strong> Focuses viewer attention on active UI quadrants
          </span>
        </label>

        {/* Toggle 2: Auto-balance Lighting */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: '#e2e8f0' }}>
          <input
            type="checkbox"
            checked={enableLightingEffects}
            onChange={(e) => setEnableLightingEffects(e.target.checked)}
            style={{ accentColor: '#6366f1', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>
            <strong>Auto-Balance Lighting & Exposure:</strong> Dynamically balances brightness and contrast across cuts
          </span>
        </label>

        {/* Toggle 3: Snappy Motion Speed-Up */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: '#e2e8f0' }}>
          <input
            type="checkbox"
            checked={enableScreenRecordingSpeed}
            onChange={(e) => setEnableScreenRecordingSpeed(e.target.checked)}
            style={{ accentColor: '#6366f1', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>
            <strong>⚡ Snappy Motion Speed-Up (1.25x):</strong> Accelerates slow scrolling & mouse movements into brisk human-paced demos
          </span>
        </label>
      </div>

      {/* Start Production Button */}
      <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
        <button
          type="button"
          onClick={onStartOrchestration}
          disabled={isOrchestrating || clipCount === 0}
          style={{
            width: '100%',
            padding: '0.9rem',
            borderRadius: '12px',
            border: 'none',
            background: clipCount === 0
              ? '#334155'
              : 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
            color: '#ffffff',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: clipCount === 0 || isOrchestrating ? 'not-allowed' : 'pointer',
            boxShadow: clipCount === 0 ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {isOrchestrating ? (
            <>
              <span style={{ animation: 'spin 1.5s linear infinite' }}>⚙️</span>
              Agents Directing & Assembling Timeline...
            </>
          ) : (
            <>
              <span>🎬</span>
              {clipCount === 0 ? 'Upload Video Clips to Begin' : 'Assemble & Direct Video'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
