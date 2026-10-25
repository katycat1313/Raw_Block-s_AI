import React from 'react';

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
  clipCount
}) => {
  return (
    <div style={{
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
