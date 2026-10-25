import React from 'react';

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

interface TimelinePreviewProps {
  edl: EDL | null;
  onRender: () => void;
  isRendering: boolean;
  renderProgress: string;
  renderedVideoUrl: string | null;
}

export const TimelinePreview: React.FC<TimelinePreviewProps> = ({
  edl,
  onRender,
  isRendering,
  renderProgress,
  renderedVideoUrl
}) => {
  if (!edl) return null;

  return (
    <div style={{
      background: '#121217',
      border: '1px solid #23232f',
      borderRadius: '16px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      marginTop: '1.5rem'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎞️ Master Timeline & Edit Decision List
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {edl.clips.length} scenes synchronized to voiceover • Total runtime: ~{edl.totalDuration.toFixed(1)}s
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
            🎉 Rendered Master Video Ready!
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
              margin: '0 auto 1rem auto'
            }}
          />
          <a
            href={renderedVideoUrl}
            download="final_video.mp4"
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
            ⬇️ Download Final MP4 Video
          </a>
        </div>
      )}

      {/* Storyboard Beats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.85rem'
      }}>
        {edl.clips.map((clip, idx) => (
          <div
            key={idx}
            style={{
              background: '#181824',
              border: '1px solid #28283a',
              borderRadius: '10px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            {/* Beat Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>
                SCENE #{idx + 1}
              </span>
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
        ))}
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
              Render Final Master MP4
            </>
          )}
        </button>
      </div>
    </div>
  );
};
