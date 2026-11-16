import React from 'react';
import { CHAPTER_PRESETS, ChapterPreset } from '../constants/chapterPresets';
import { VoiceSelector } from './VoiceSelector';
import { VoiceOption } from '../constants/voices';

export type DeepgramVoice = VoiceOption;

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
  onGenerateFullSequence?: () => void;
  onGeneratePremiumTofu?: () => void;
  isGeneratingTofu?: boolean;
  isOrchestrating: boolean;
  clipCount: number;
  seriesPartsCount?: number;
  onOpenRecordModalWithUrl?: (url?: string, action?: string) => void;
  blueprint?: any;
  onOpenTourModal?: () => void;
  onOpenAuthModal?: () => void;
  onClearLibrary?: () => void;
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
  onGenerateFullSequence,
  onGeneratePremiumTofu,
  isGeneratingTofu = false,
  isOrchestrating,
  clipCount,
  seriesPartsCount = 0,
  onOpenRecordModalWithUrl,
  blueprint,
  onOpenTourModal,
  onOpenAuthModal,
  onClearLibrary
}) => {
  const activePromptText = scriptMode === 'prompt_generate' ? userPrompt : (rawScript || userPrompt);
  const partMatch = activePromptText.match(/(?:\[|\b)(?:part|p)\s*([0-9]+)(?:\s*(?:\.|\:)\s*(?:video|v)\s*([0-9]+))?(?:\]|\:|\.|\s|$)/i);
  const detectedUrlMatch = activePromptText.match(/https?:\/\/[^\s\]\)]+/i);
  const detectedUrl = detectedUrlMatch ? detectedUrlMatch[0] : null;
  const detectedAction = detectedUrl ? activePromptText.replace(detectedUrl, '').replace(/\[.*?\]/g, '').trim() : '';

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
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('master-voiceover-banner') || document.getElementById('single-voiceover-button') || document.getElementById('master-voiceover-button');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
              }}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
              }}
            >
              <span>🎙️ Jump to Voiceover Tool ⬇️</span>
            </button>
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

      {/* App Blueprint Hero Section: Guided Tour Knowledge Base */}
      {blueprint ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.45)',
          borderRadius: '12px',
          padding: '0.9rem 1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🗺️</span>
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#c7d2fe' }}>
                  App Blueprint Active: {blueprint.appName || 'Verified Stage Map'}
                </span>
                <span style={{ display: 'block', fontSize: '0.74rem', color: '#a5b4fc', marginTop: '2px' }}>
                  {blueprint.keyFeatures?.length || 0} features & edit triggers verified from your voice tour
                </span>
              </div>
            </div>
            {onOpenTourModal && (
              <button
                type="button"
                onClick={onOpenTourModal}
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: 'rgba(99, 102, 241, 0.25)',
                  color: '#c7d2fe',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🔄 Re-record Tour
              </button>
            )}
          </div>

          {blueprint.keyFeatures && blueprint.keyFeatures.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '2px' }}>
              {blueprint.keyFeatures.map((f: any, i: number) => (
                <span
                  key={f.id || i}
                  title={`Trigger: ${f.editOrActionTrigger || 'Direct Click'}`}
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ color: '#10b981' }}>✓</span> {f.title}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px dashed rgba(239, 68, 68, 0.45)',
          borderRadius: '12px',
          padding: '0.9rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🗺️</span> Teach the Director Your App (Zero Guesswork)
            </span>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#f87171', marginTop: '3px', lineHeight: '1.35' }}>
              Record a 30s tour and talk into your mic: show where the edit button is and what does what! The agent learns your app blueprint before directing.
            </span>
          </div>
          {onOpenTourModal && (
            <button
              type="button"
              onClick={onOpenTourModal}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 12px rgba(239, 68, 68, 0.45)',
                whiteSpace: 'nowrap'
              }}
            >
              <span>🔴</span> Record Blueprint Tour (with Mic)
            </button>
          )}
        </div>
      )}

      {/* Starting Web Application URL Context */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.05)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '10px',
        padding: '0.75rem 0.9rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#c7d2fe', marginBottom: '0.3rem' }}>
            🌐 Target App / Starting URL
          </label>
          <input
            type="text"
            placeholder="https://krechet.academy"
            value={detectedUrl || 'https://krechet.academy'}
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val) {
                const cleaned = userPrompt.replace(/\[URL:[^\]]+\]\s*/gi, '').replace(/https?:\/\/[^\s\]\)]+/gi, '').trim();
                setUserPrompt(`[URL: ${val}] ${cleaned}`);
              }
            }}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#090a0f',
              color: '#f8fafc',
              fontSize: '0.84rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        {onOpenAuthModal && (
          <button
            type="button"
            onClick={onOpenAuthModal}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
            }}
          >
            <span>🔐</span> Connect Login & Scout Blocks
          </button>
        )}
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: '220px', lineHeight: '1.3' }}>
          💡 The agents use this URL as the starting point and automatically record missing screens from it.
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

      {/* Interactive Quick-Action: When a URL is typed in prompt */}
      {detectedUrl && onOpenRecordModalWithUrl && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.82rem',
          color: '#fca5a5'
        }}>
          <div>
            <span style={{ fontWeight: 700, color: '#fecaca', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🌐</span> Live Web App URL Detected: <code style={{ color: '#fff', background: '#090a0f', padding: '2px 6px', borderRadius: '4px' }}>{detectedUrl}</code>
            </span>
            <span style={{ display: 'block', fontSize: '0.74rem', color: '#f87171', marginTop: '3px' }}>
              This prompt box creates your voiceover script. Click below to record real browser video of this site!
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenRecordModalWithUrl(detectedUrl, detectedAction || 'The mouse moves smoothly to the center of the page')}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>🤖</span> Record App Screen Now ➔
          </button>
        </div>
      )}

      {/* Audio Settings: Deepgram Voice & Background Music */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
        {/* Voice Selector */}
        <VoiceSelector
          value={selectedVoice}
          onChange={setSelectedVoice}
          voices={voices}
          label="🎙️ Deepgram Human Voice (54 Voices)"
        />

        {/* Music Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
            🎵 Background Music
          </label>
          <select
            value={selectedMusicId || 'acoustic_warm_groove.mp3'}
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
            <option value="acoustic_warm_groove.mp3">🎸 Acoustic Warm Groove (Redwood Trail - Guitar & Beat)</option>
            <option value="cycles_upbeat_inspiration.mp3">⚡ Cycles Upbeat Inspiration (Modern Uplifting Beat)</option>
            <option value="serenity_chill_ambient.mp3">🌿 Serenity Chill Ambient (Peaceful Acoustic Flow)</option>
            <option value="snappy_commercial_beat.mp3">🥁 Snappy Commercial Beat (Fun Bouncy Groove)</option>
            {musicTracks
              .filter(m => !['acoustic_warm_groove.mp3', 'cycles_upbeat_inspiration.mp3', 'serenity_chill_ambient.mp3', 'snappy_commercial_beat.mp3', 'chill_tech_ambient.mp3'].includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  🎵 {m.name}
                </option>
              ))}
            <option value="none">🔇 Mute (No Background Music)</option>
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

      {/* Production Buttons: Full Sequence vs Single Scene */}
      <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {/* 🚀 Agentic Master Director: Create Premium TOFU Video Ad */}
        {onGeneratePremiumTofu && (
          <button
            type="button"
            onClick={onGeneratePremiumTofu}
            disabled={isGeneratingTofu || isOrchestrating}
            style={{
              width: '100%',
              padding: '0.95rem 1.25rem',
              borderRadius: '12px',
              border: 'none',
              background: isGeneratingTofu
                ? '#334155'
                : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%)',
              color: '#ffffff',
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: isGeneratingTofu ? 'not-allowed' : 'pointer',
              boxShadow: isGeneratingTofu ? 'none' : '0 6px 25px rgba(234, 88, 12, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              transition: 'all 0.2s ease',
              letterSpacing: '0.3px'
            }}
          >
            {isGeneratingTofu ? (
              <>
                <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                Agentic Director: Cutting, Burning Text & Mastering Video...
              </>
            ) : (
              <>
                <span>🔥</span>
                Agentic Director: Create Premium TOFU Video Ad (Cuts + Kinetic Badges)
              </>
            )}
          </button>
        )}

        {/* Primary Hero Button: Generate Full Sequence */}
        {onGenerateFullSequence && (
          <button
            type="button"
            onClick={onGenerateFullSequence}
            disabled={isOrchestrating}
            style={{
              width: '100%',
              padding: '0.95rem 1.25rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: isOrchestrating ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 25px rgba(16, 185, 129, 0.45)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem'
            }}
          >
            <span>⚡</span>
            Generate Full Sequence (All Scenes ➔ Master Film)
          </button>
        )}

        {/* Secondary Button: Direct Single Scene Only */}
        <button
          type="button"
          onClick={onStartOrchestration}
          disabled={isOrchestrating}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '10px',
            border: '1px solid #6366f1',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(79, 70, 229, 0.35) 100%)',
            color: '#ffffff',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: isOrchestrating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)'
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
              Direct Current Scene Only
            </>
          )}
        </button>
      </div>
    </div>
  );
};
