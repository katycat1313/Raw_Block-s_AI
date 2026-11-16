import React, { useState, useRef, useEffect } from 'react';
import { ALL_DEEPGRAM_VOICES, VoiceOption } from '../constants/voices';

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  voices?: VoiceOption[];
  apiBase?: string;
  label?: string;
  compact?: boolean;
  borderColor?: string;
  backgroundColor?: string;
}

const DEFAULT_API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:3001`
    : '';

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onChange,
  voices,
  apiBase = DEFAULT_API_BASE,
  label = '🎙️ Narrator Voice (54 Voices)',
  compact = false,
  borderColor = '#334155',
  backgroundColor = '#181822'
}) => {
  const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const catalog: VoiceOption[] =
    voices && voices.length >= ALL_DEEPGRAM_VOICES.length
      ? voices
      : ALL_DEEPGRAM_VOICES;

  const filteredCatalog = catalog.filter(
    (v) => genderFilter === 'all' || v.gender === genderFilter
  );

  // Stop audio preview if selected voice changes or component unmounts
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsLoadingPreview(false);
  }, [value]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleTogglePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsLoadingPreview(false);
      return;
    }

    const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    const previewUrl = `${base}/api/voices/preview?voiceId=${encodeURIComponent(value)}`;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.oncanplay = () => {
      setIsLoadingPreview(false);
    };
    audio.onplaying = () => {
      setIsLoadingPreview(false);
      setIsPlaying(true);
    };
    audio.onended = () => {
      setIsPlaying(false);
      setIsLoadingPreview(false);
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setIsLoadingPreview(false);
    };

    setIsLoadingPreview(true);
    audio.src = previewUrl;
    audio.play().catch((err) => {
      console.warn('[VoiceSelector] Audio preview blocked or failed:', err);
      setIsPlaying(false);
      setIsLoadingPreview(false);
    });
  };

  // Bucket voices for clean optgroups
  const fluxVoices = filteredCatalog.filter((v) => v.id.startsWith('flux-'));
  const aura2Male = filteredCatalog.filter(
    (v) => v.id.startsWith('aura-2-') && v.gender === 'Male'
  );
  const aura2Female = filteredCatalog.filter(
    (v) => v.id.startsWith('aura-2-') && v.gender === 'Female'
  );
  const aura1Classics = filteredCatalog.filter(
    (v) => !v.id.startsWith('flux-') && !v.id.startsWith('aura-2-')
  );

  // Ensure currently selected value is selectable even if filtered out by gender pill
  const selectedExistsInFiltered = filteredCatalog.some((v) => v.id === value);
  const selectedVoiceObj = catalog.find((v) => v.id === value);

  const renderOption = (v: VoiceOption) => {
    const icon = v.id.startsWith('flux-')
      ? '🎙️'
      : v.gender === 'Female'
      ? '👩'
      : '👨';
    return (
      <option key={v.id} value={v.id}>
        {icon} {v.name} — {v.style}
      </option>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '0.25rem' : '0.35rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
        {label && (
          <label
            style={{
              fontSize: compact ? '0.72rem' : '0.78rem',
              fontWeight: 600,
              color: '#94a3b8'
            }}
          >
            {label}
          </label>
        )}

        {/* Quick Gender Filter Pills */}
        <div style={{ display: 'flex', gap: '3px', background: '#090a0f', padding: '2px', borderRadius: '6px', border: '1px solid #1e293b' }}>
          {(['all', 'Male', 'Female'] as const).map((g) => {
            const active = genderFilter === g;
            const text = g === 'all' ? 'All' : g === 'Male' ? '👨 Male' : '👩 Female';
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGenderFilter(g)}
                style={{
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '0.68rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  background: active ? '#4f46e5' : 'transparent',
                  color: active ? '#ffffff' : '#94a3b8'
                }}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch', width: '100%' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: compact ? '0.45rem 0.55rem' : '0.6rem',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            background: backgroundColor,
            color: '#f8fafc',
            fontSize: compact ? '0.78rem' : '0.82rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {!selectedExistsInFiltered && selectedVoiceObj && (
            <optgroup label="Current Selection">
              {renderOption(selectedVoiceObj)}
            </optgroup>
          )}
          {fluxVoices.length > 0 && (
            <optgroup label="⚡ Ultra-Natural Flux (Recommended)">
              {fluxVoices.map(renderOption)}
            </optgroup>
          )}
          {aura2Male.length > 0 && (
            <optgroup label={`🌟 Aura-2 Studio — Male (${aura2Male.length})`}>
              {aura2Male.map(renderOption)}
            </optgroup>
          )}
          {aura2Female.length > 0 && (
            <optgroup label={`🌟 Aura-2 Studio — Female (${aura2Female.length})`}>
              {aura2Female.map(renderOption)}
            </optgroup>
          )}
          {aura1Classics.length > 0 && (
            <optgroup label={`🎧 Aura-1 Classics (${aura1Classics.length})`}>
              {aura1Classics.map(renderOption)}
            </optgroup>
          )}
        </select>

        <button
          type="button"
          onClick={handleTogglePreview}
          title="Play a 2-second live sample of the selected voice"
          style={{
            background: isPlaying
              ? '#ef4444'
              : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: compact ? '0 0.65rem' : '0 0.85rem',
            fontSize: compact ? '0.74rem' : '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: isPlaying
              ? '0 2px 8px rgba(239, 68, 68, 0.35)'
              : '0 2px 8px rgba(99, 102, 241, 0.3)'
          }}
        >
          <span>{isLoadingPreview ? '⏳' : isPlaying ? '⏹' : '🔊'}</span>
          <span>{isLoadingPreview ? '...' : isPlaying ? 'Stop' : 'Listen'}</span>
        </button>
      </div>
    </div>
  );
};
