import React, { useState } from 'react';
import { getBlockRole } from './ClipLibrary';

export interface TimelineClip {
  beatIndex: number;
  beatText: string;
  clipId: string;
  title: string;
  filePath: string;
  contentType: string;
  lightingProfile: string;
  in: number;
  out: number;
  duration: number;
  speed?: number;
  effects: {
    zoom?: boolean;
    spotlight?: boolean;
    lighting?: {
      brightness: number;
      contrast: number;
      saturation: number;
    };
  };
  transition: string;
}

export interface EDL {
  projectTitle: string;
  partInfo?: {
    label: string;
    partNumber: number;
    videoNumber?: number;
  } | null;
  totalDuration: number;
  voiceoverAudioPath: string;
  voiceoverDuration: number;
  selectedVoice: string;
  musicTrack: string | null;
  clips: TimelineClip[];
  beats: Array<{
    id: string;
    text: string;
    exactDuration: number;
    visualGoal: string;
  }>;
}

export interface SeriesPart {
  id: string;
  label: string;
  videoUrl: string;
  duration: number;
  partNumber?: number;
  videoNumber?: number;
  createdAt: number;
}

interface TimelinePreviewProps {
  edl: EDL | null;
  onRender: () => void;
  isRendering: boolean;
  renderProgress: string;
  renderedVideoUrl: string | null;
  seriesParts?: SeriesPart[];
  onAddSeriesPart?: (part: Omit<SeriesPart, 'id'>) => void;
  onRemoveSeriesPart?: (id: string) => void;
  onStitchParts?: (partUrls: string[], musicId?: string) => Promise<void>;
  isStitching?: boolean;
  stitchedVideoUrl?: string | null;
  selectedMusicId?: string;
  musicTracks?: Array<{ id: string; name: string }>;
}

export const TimelinePreview: React.FC<TimelinePreviewProps> = ({
  edl,
  onRender,
  isRendering,
  renderProgress,
  renderedVideoUrl,
  seriesParts = [],
  onAddSeriesPart,
  onRemoveSeriesPart,
  onStitchParts,
  isStitching = false,
  stitchedVideoUrl = null,
  selectedMusicId = '',
  musicTracks = []
}) => {
  const [stitchMusicChoice, setStitchMusicChoice] = useState<string>('preserve');

  // If no EDL and no series parts in vault, don't show timeline
  if (!edl && seriesParts.length === 0) return null;

  const isAlreadyInVault = !!(
    renderedVideoUrl &&
    seriesParts.some((p) => p.videoUrl === renderedVideoUrl)
  );

  const totalVaultDuration = seriesParts.reduce((acc, p) => acc + (p.duration || 0), 0);

  const handleStitch = () => {
    if (!onStitchParts || seriesParts.length < 2) return;
    const urls = seriesParts.map((p) => p.videoUrl);
    const musicParam = stitchMusicChoice === 'preserve' ? 'none' : stitchMusicChoice;
    onStitchParts(urls, musicParam);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      marginTop: '1.5rem'
    }}>
      {/* 1. Master Timeline Storyboard (If EDL loaded) */}
      {edl && (
        <div style={{
          background: '#121217',
          border: '1px solid #23232f',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎞️ Master Timeline & Edit Decision List
                </h3>
                {edl.partInfo && (
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    background: 'rgba(236, 72, 153, 0.2)',
                    color: '#f472b6',
                    border: '1px solid rgba(236, 72, 153, 0.4)',
                    fontWeight: 700
                  }}>
                    🎬 {edl.partInfo.label}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {edl.clips.length} scenes synchronized to voiceover • Part runtime: ~{edl.totalDuration.toFixed(1)}s
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontWeight: 600
              }}>
                Voice: {edl.selectedVoice}
              </span>
              {edl.musicTrack && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(236, 72, 153, 0.15)',
                  color: '#f472b6',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  fontWeight: 600
                }}>
                  Music: Ducked
                </span>
              )}
            </div>
          </div>

          {/* Rendered Video Player (If finished) */}
          {renderedVideoUrl && (
            <div style={{
              background: '#090a0f',
              border: '2px solid #818cf8',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#818cf8', fontSize: '1.1rem' }}>
                🎉 Rendered Video Ready {edl.partInfo ? `(${edl.partInfo.label})` : ''}!
              </h4>
              <video
                src={renderedVideoUrl}
                controls
                autoPlay
                style={{
                  width: '100%',
                  maxHeight: '420px',
                  borderRadius: '8px',
                  background: '#000',
                  display: 'block',
                  margin: '0 auto 1.25rem auto'
                }}
              />
              <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href={renderedVideoUrl}
                  download={`${edl.partInfo ? edl.partInfo.label.replace(/\s+/g, '_').toLowerCase() : 'episode_clip'}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  ⬇️ Download This Video (MP4)
                </a>

                {onAddSeriesPart && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddSeriesPart({
                        label: edl.partInfo?.label || `Part ${seriesParts.length + 1}`,
                        videoUrl: renderedVideoUrl,
                        duration: edl.totalDuration,
                        partNumber: edl.partInfo?.partNumber || seriesParts.length + 1,
                        videoNumber: edl.partInfo?.videoNumber || 1,
                        createdAt: Date.now()
                      });
                    }}
                    disabled={isAlreadyInVault}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.5rem',
                      borderRadius: '8px',
                      background: isAlreadyInVault
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: isAlreadyInVault ? '#a5b4fc' : '#ffffff',
                      border: isAlreadyInVault ? '1px solid #6366f1' : 'none',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: isAlreadyInVault ? 'default' : 'pointer',
                      boxShadow: isAlreadyInVault ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.4)'
                    }}
                  >
                    {isAlreadyInVault ? (
                      <>
                        <span>✓</span>
                        Saved in Series Vault
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        Save as [{edl.partInfo?.label || `Part ${seriesParts.length + 1}`}] in Series Vault
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Storyboard Beats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.85rem'
          }}>
            {edl.clips.map((clip, idx) => {
              const role = getBlockRole({ title: clip.title, description: clip.beatText });
              return (
                <div
                  key={idx}
                  style={{
                    background: '#181824',
                    border: `1px solid ${role.badgeBorder || '#28283a'}`,
                    borderRadius: '10px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  {/* Beat Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>
                        SCENE #{idx + 1}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: role.badgeBg,
                        color: role.badgeColor,
                        border: `1px solid ${role.badgeBorder}`
                      }}>
                        {role.icon} {role.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: '#090a0f', padding: '2px 6px', borderRadius: '4px' }}>
                      {clip.duration.toFixed(1)}s ({clip.in.toFixed(1)}s - {clip.out.toFixed(1)}s)
                    </span>
                  </div>

                {/* Voiceover Line */}
                <p style={{
                  margin: 0,
                  fontSize: '0.84rem',
                  color: '#f8fafc',
                  fontStyle: 'italic',
                  background: 'rgba(99, 102, 241, 0.06)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  borderLeft: '3px solid #6366f1',
                  lineHeight: '1.4'
                }}>
                  "{clip.beatText}"
                </p>

                {/* Assigned Clip */}
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                  📹 <strong>Asset:</strong> {clip.title}
                </div>

                {/* Effects badges */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.25rem' }}>
                  {clip.speed && clip.speed > 1.0 && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                      ⚡ {clip.speed}x Speed
                    </span>
                  )}
                  {clip.effects?.spotlight && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                      🎯 Spotlight
                    </span>
                  )}
                  {clip.effects?.zoom && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                      🔍 Focus Zoom
                    </span>
                  )}
                  {clip.effects?.lighting && (
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                      💡 Balanced Eq
                    </span>
                  )}
                  <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: '#0f172a', color: '#64748b' }}>
                    Cut: {clip.transition}
                  </span>
                </div>
              </div>
            );})}
          </div>

          {/* Render Action Button */}
          <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onRender}
              disabled={isRendering}
              style={{
                padding: '0.85rem 2.5rem',
                borderRadius: '12px',
                border: 'none',
                background: isRendering
                  ? '#334155'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: isRendering ? 'not-allowed' : 'pointer',
                boxShadow: isRendering ? 'none' : '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}
            >
              {isRendering ? (
                <>
                  <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                  {renderProgress || 'Rendering Video with FFmpeg...'}
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Render {edl.partInfo ? `${edl.partInfo.label}` : 'Master MP4'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2. Episodic Series & Multi-Part Vault Section */}
      <div style={{
        background: 'linear-gradient(145deg, #12121c 0%, #171424 100%)',
        border: '1px solid #3b3658',
        borderRadius: '16px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Vault Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>🎬</span> Episodic Series & Multi-Part Vault
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#a5b4fc' }}>
              Assemble multiple ~20s episode videos into a cohesive 45s-60s+ full-length master film
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#c7d2fe',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              fontWeight: 700
            }}>
              {seriesParts.length} {seriesParts.length === 1 ? 'Part' : 'Parts'} in Vault
            </span>
            {totalVaultDuration > 0 && (
              <span style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.8rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 700
              }}>
                Total Runtime: ~{totalVaultDuration.toFixed(1)}s
              </span>
            )}
          </div>
        </div>

        {/* Narrative & Agent Alignment Guide */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.07)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '10px',
          padding: '0.9rem 1.1rem',
          fontSize: '0.84rem',
          color: '#cbd5e1',
          lineHeight: '1.5'
        }}>
          💡 <strong>How to Direct Multi-Part Videos:</strong>
          <span style={{ display: 'block', marginTop: '0.25rem', color: '#94a3b8' }}>
            Add tags like <code style={{ color: '#818cf8', background: '#090a0f', padding: '2px 5px', borderRadius: '4px' }}>[Part 1]</code>, <code style={{ color: '#818cf8', background: '#090a0f', padding: '2px 5px', borderRadius: '4px' }}>Part 1. Video 1</code>, or <code style={{ color: '#818cf8', background: '#090a0f', padding: '2px 5px', borderRadius: '4px' }}>p1.v1</code> / <code style={{ color: '#818cf8', background: '#090a0f', padding: '2px 5px', borderRadius: '4px' }}>p2.v1</code> to your prompts.
            The agents automatically align voice persona, snappy 1.25x tempo, and background music so each chapter flows naturally without contrasting styles. Render each part, save it to this vault, and click <strong>Stitch Parts</strong> to generate your final full-length master video!
          </span>
        </div>

        {/* Parts Cards List */}
        {seriesParts.length === 0 ? (
          <div style={{
            background: '#090a0f',
            border: '1px dashed #334155',
            borderRadius: '12px',
            padding: '2rem 1rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🗃️</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>
              Series Vault is Empty
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              Render a video part above and click "Save as Part in Series Vault" to queue it here.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem'
          }}>
            {seriesParts.map((part, index) => (
              <div
                key={part.id}
                style={{
                  background: '#0b0c13',
                  border: '1px solid #2d2b45',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: '#6366f1',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '5px'
                    }}>
                      EP #{index + 1}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {part.label}
                    </span>
                  </div>
                  {onRemoveSeriesPart && (
                    <button
                      type="button"
                      onClick={() => onRemoveSeriesPart(part.id)}
                      title="Remove from vault"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '2px 4px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Inline Video Player Preview */}
                <video
                  src={part.videoUrl}
                  controls
                  preload="metadata"
                  style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '8px',
                    background: '#000',
                    objectFit: 'contain'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Duration: ~{part.duration.toFixed(1)}s</span>
                  <a
                    href={part.videoUrl}
                    download={`${part.label.replace(/\s+/g, '_').toLowerCase()}.mp4`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Download Clip
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stitching Controls & Music Option */}
        {seriesParts.length > 0 && (
          <div style={{
            background: '#090a0f',
            borderRadius: '12px',
            border: '1px solid #232238',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.2rem' }}>
                  🎵 Background Music Alignment for Master Film:
                </label>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Choose whether to keep original ducked audio per clip or lay a continuous master track
                </span>
              </div>

              <select
                value={stitchMusicChoice}
                onChange={(e) => setStitchMusicChoice(e.target.value)}
                style={{
                  background: '#181824',
                  border: '1px solid #3b3955',
                  color: '#f8fafc',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="preserve">Keep each part's ducked audio (Instant Seamless Concat)</option>
                {musicTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    Continuous: {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stitch Button */}
            <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleStitch}
                disabled={seriesParts.length < 2 || isStitching}
                style={{
                  padding: '0.9rem 2.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: seriesParts.length < 2
                    ? '#334155'
                    : isStitching
                    ? '#475569'
                    : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)',
                  color: '#ffffff',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  letterSpacing: '0.3px',
                  cursor: seriesParts.length < 2 || isStitching ? 'not-allowed' : 'pointer',
                  boxShadow: seriesParts.length < 2 || isStitching ? 'none' : '0 6px 25px rgba(236, 72, 153, 0.4)',
                  transition: 'all 0.25s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                {isStitching ? (
                  <>
                    <span style={{ animation: 'spin 1.5s linear infinite' }}>⏳</span>
                    Stitching {seriesParts.length} Parts with FFmpeg...
                  </>
                ) : seriesParts.length < 2 ? (
                  <>
                    <span>🧵</span>
                    Need at least 2 parts to stitch ({seriesParts.length} / 2 loaded)
                  </>
                ) : (
                  <>
                    <span>🧵</span>
                    Stitch {seriesParts.length} Parts into Master Full-Length Video (~{totalVaultDuration.toFixed(1)}s)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Stitched Master Video Player */}
        {stitchedVideoUrl && (
          <div style={{
            background: 'linear-gradient(180deg, #090a0f 0%, #131221 100%)',
            border: '2px solid #ec4899',
            borderRadius: '14px',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(236, 72, 153, 0.3)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>👑</span>
              <h4 style={{ margin: 0, color: '#f472b6', fontSize: '1.25rem', fontWeight: 800 }}>
                Master Full-Length Video Ready!
              </h4>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
              All {seriesParts.length} parts stitched seamlessly into a master 1080p feature video (~{totalVaultDuration.toFixed(1)}s)
            </p>

            <video
              src={stitchedVideoUrl}
              controls
              autoPlay
              style={{
                width: '100%',
                maxHeight: '440px',
                borderRadius: '10px',
                background: '#000',
                display: 'block',
                margin: '0 auto 1.25rem auto'
              }}
            />

            <a
              href={stitchedVideoUrl}
              download="master_full_length_video.mp4"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 2rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 800,
                textDecoration: 'none',
                fontSize: '0.95rem',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)'
              }}
            >
              <span>⬇️</span> Download Master Full-Length MP4 (~{totalVaultDuration.toFixed(1)}s)
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
