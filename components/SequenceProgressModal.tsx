import React from 'react';

export interface SequenceStep {
  partNumber: number;
  title: string;
  summary: string;
  status: 'pending' | 'orchestrating' | 'rendering' | 'cooling' | 'completed' | 'failed';
  videoUrl?: string;
  duration?: number;
  error?: string;
}

interface SequenceProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: SequenceStep[];
  currentStepIndex: number;
  statusMessage: string;
  isStitching: boolean;
  stitchedVideoUrl: string | null;
  totalVaultDuration: number;
  onCancel?: () => void;
  onWatchMasterVideo?: () => void;
}

export const SequenceProgressModal: React.FC<SequenceProgressModalProps> = ({
  isOpen,
  onClose,
  steps,
  currentStepIndex,
  statusMessage,
  isStitching,
  stitchedVideoUrl,
  totalVaultDuration,
  onCancel,
  onWatchMasterVideo
}) => {
  if (!isOpen) return null;

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const isAllComplete = !!stitchedVideoUrl;
  const totalSteps = steps.length + 1; // plus stitching
  const currentStepProgress = isAllComplete
    ? totalSteps
    : currentStepIndex + (isStitching ? 1 : steps[currentStepIndex]?.status === 'rendering' ? 0.7 : steps[currentStepIndex]?.status === 'cooling' ? 0.9 : 0.3);
  const progressPercent = Math.min(100, Math.round((currentStepProgress / totalSteps) * 100));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 5, 10, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #101018 0%, #151424 100%)',
        border: '1px solid #332d52',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #232238',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.25)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 800 }}>
                ⚡ Autonomous Full Sequence Generator
              </h3>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: isAllComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: isAllComplete ? '#34d399' : '#a5b4fc',
                border: isAllComplete ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)'
              }}>
                {isAllComplete ? '✓ Finished' : `${completedCount}/${steps.length} Scenes Built`}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Orchestrating agents, pacing renders with cooling breaks, and stitching into a final master film
            </p>
          </div>

          {!isAllComplete && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ background: '#090a0f', height: '6px', width: '100%', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: isAllComplete
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #6366f1, #ec4899)',
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          flex: 1
        }}>
          {/* Live Status Pill */}
          <div style={{
            background: '#0a0a12',
            border: '1px solid #1e1e2e',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              fontSize: '1.1rem',
              animation: isAllComplete ? 'none' : 'spin 2s linear infinite'
            }}>
              {isAllComplete ? '🎉' : isStitching ? '🧵' : '⚙️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                {statusMessage || 'Initializing pipeline...'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>
                {isAllComplete
                  ? `All ${steps.length} scenes assembled and stitched into master film.`
                  : 'Automated agent pacing in progress — prevents resource collisions.'}
              </div>
            </div>
          </div>

          {/* Sequence Steps List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {steps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex && !isAllComplete && !isStitching;
              const isDone = step.status === 'completed';
              const isFailed = step.status === 'failed';
              const isPending = step.status === 'pending';

              let badgeBg = 'rgba(255, 255, 255, 0.05)';
              let badgeColor = '#64748b';
              let badgeText = 'Queued';

              if (isDone) {
                badgeBg = 'rgba(16, 185, 129, 0.2)';
                badgeColor = '#34d399';
                badgeText = `✓ Rendered (~${step.duration ? step.duration.toFixed(1) : '20'}s)`;
              } else if (step.status === 'orchestrating') {
                badgeBg = 'rgba(99, 102, 241, 0.2)';
                badgeColor = '#a5b4fc';
                badgeText = '⚙️ Agents Assembling...';
              } else if (step.status === 'rendering') {
                badgeBg = 'rgba(236, 72, 153, 0.2)';
                badgeColor = '#f472b6';
                badgeText = '🎬 FFmpeg Rendering...';
              } else if (step.status === 'cooling') {
                badgeBg = 'rgba(245, 158, 11, 0.2)';
                badgeColor = '#fbbf24';
                badgeText = '⏸️ Pacing Cooldown...';
              } else if (isFailed) {
                badgeBg = 'rgba(239, 68, 68, 0.2)';
                badgeColor = '#f87171';
                badgeText = '✕ Failed';
              }

              return (
                <div
                  key={step.partNumber}
                  style={{
                    background: isCurrent ? 'rgba(99, 102, 241, 0.08)' : '#0d0d15',
                    border: isCurrent
                      ? '1px solid #6366f1'
                      : isDone
                      ? '1px solid #1a3328'
                      : '1px solid #1c1c28',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isDone
                        ? '#10b981'
                        : isCurrent
                        ? '#6366f1'
                        : '#1e293b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {isDone ? '✓' : step.partNumber}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {step.summary}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: badgeBg,
                    color: badgeColor,
                    flexShrink: 0
                  }}>
                    {badgeText}
                  </span>
                </div>
              );
            })}

            {/* Final Stitching Step */}
            <div style={{
              background: isStitching
                ? 'rgba(236, 72, 153, 0.12)'
                : isAllComplete
                ? 'rgba(16, 185, 129, 0.1)'
                : '#0d0d15',
              border: isStitching
                ? '1px solid #ec4899'
                : isAllComplete
                ? '1px solid #10b981'
                : '1px solid #1c1c28',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isAllComplete ? '#10b981' : isStitching ? '#ec4899' : '#1e293b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}>
                  🧵
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Final Master Film Stitching
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Seamless FFmpeg concat with continuous background music
                  </div>
                </div>
              </div>

              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: isAllComplete
                  ? 'rgba(16, 185, 129, 0.2)'
                  : isStitching
                  ? 'rgba(236, 72, 153, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: isAllComplete ? '#34d399' : isStitching ? '#f472b6' : '#64748b'
              }}>
                {isAllComplete ? `✓ Complete (~${totalVaultDuration.toFixed(1)}s)` : isStitching ? '🧵 Stitching...' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Success Banner when Finished */}
          {isAllComplete && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
              border: '1px solid #10b981',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '0.75rem',
              marginTop: '0.5rem'
            }}>
              <div style={{ fontSize: '2rem' }}>🎉</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 800 }}>
                  Master Video Fully Assembled & Stitched!
                </h4>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#a5b4fc' }}>
                  All {steps.length} scenes were orchestrated, rendered, and stitched seamlessly (~{totalVaultDuration.toFixed(1)}s runtime).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {onWatchMasterVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      onWatchMasterVideo();
                      onClose();
                    }}
                    style={{
                      padding: '0.65rem 1.4rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <span>▶️</span> Watch Master Video Now
                  </button>
                )}

                {stitchedVideoUrl && (
                  <a
                    href={stitchedVideoUrl}
                    download="master_video_sequence.mp4"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.65rem 1.4rem',
                      borderRadius: '8px',
                      background: '#1e293b',
                      color: '#f8fafc',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <span>⬇️</span> Download Master MP4
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
