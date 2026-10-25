import React, { useRef, useState } from 'react';

export interface VideoClip {
  clipId: string;
  filename: string;
  originalName: string;
  filePath: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  title: string;
  description: string;
  contentType: 'screen_recording' | 'live_action';
  lightingProfile: string;
  keyActions: string[];
  suggestedHighlights: string[];
  tags: string[];
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
}

interface ClipLibraryProps {
  clips: VideoClip[];
  onUpload: (files: FileList) => Promise<void>;
  onDeleteClip: (clipId: string) => Promise<void>;
  isUploading: boolean;
  onOpenRecordModal: () => void;
  onOpenStockModal: () => void;
}

export const ClipLibrary: React.FC<ClipLibraryProps> = ({
  clips,
  onUpload,
  onDeleteClip,
  isUploading,
  onOpenRecordModal,
  onOpenStockModal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const totalDuration = clips.reduce((acc, c) => acc + (c.duration || 0), 0);
  const screenRecCount = clips.filter(c => c.contentType === 'screen_recording').length;

  return (
    <div style={{
      background: '#121217',
      border: '1px solid #23232f',
      borderRadius: '16px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📁 Video Asset Library
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {clips.length} clip{clips.length === 1 ? '' : 's'} available ({totalDuration.toFixed(1)}s total)
          </span>
        </div>
        {clips.length > 0 && (
          <span style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            background: 'rgba(99,102,241,0.15)',
            color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)',
            fontWeight: 600
          }}>
            {screenRecCount} Screen Rec • {clips.length - screenRecCount} Video
          </span>
        )}
      </div>

      {/* Automated Creation Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <button
          type="button"
          onClick={onOpenRecordModal}
          style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
        >
          <span>🤖</span> Record App Screen
        </button>

        <button
          type="button"
          onClick={onOpenStockModal}
          style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#34d399',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')}
        >
          <span>🎥</span> Search Stock B-Roll
        </button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? '#818cf8' : '#334155'}`,
          borderRadius: '12px',
          padding: '1.25rem 1rem',
          textAlign: 'center',
          backgroundColor: isDragOver ? 'rgba(99,102,241,0.08)' : '#181822',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '1.25rem'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && onUpload(e.target.files)}
          disabled={isUploading}
        />
        {isUploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem', animation: 'spin 1.5s linear infinite' }}>⏳</span>
            <span style={{ fontSize: '0.88rem', color: '#818cf8', fontWeight: 600 }}>
              Scout Agent analyzing video clips with Vision AI...
            </span>
          </div>
        ) : (
          <div>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.2rem' }}>📁</span>
            <span style={{ fontSize: '0.84rem', color: '#e2e8f0', fontWeight: 600, display: 'block' }}>
              Drop your own MP4 files here (or click to browse)
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Supports MP4, MOV, WebM
            </span>
          </div>
        )}
      </div>

      {/* Clips List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        paddingRight: '0.25rem'
      }}>
        {clips.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            color: '#64748b',
            fontSize: '0.85rem',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.4)'
          }}>
            No clips uploaded yet. Use the buttons above to record your app, search reaction B-roll, or drop in your video files.
          </div>
        ) : (
          clips.map((clip) => (
            <div
              key={clip.clipId}
              style={{
                display: 'flex',
                gap: '0.85rem',
                background: '#181824',
                border: '1px solid #28283a',
                borderRadius: '10px',
                padding: '0.75rem',
                alignItems: 'center',
                transition: 'border-color 0.2s',
                position: 'relative'
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: '100px',
                height: '60px',
                borderRadius: '6px',
                overflow: 'hidden',
                background: '#090a0f',
                flexShrink: 0,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {clip.thumbnailUrl ? (
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '1.2rem' }}>🎬</span>
                )}
                <span style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '4px',
                  background: 'rgba(0,0,0,0.75)',
                  color: '#f8fafc',
                  fontSize: '0.65rem',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontWeight: 600
                }}>
                  {clip.duration.toFixed(1)}s
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {clip.title}
                  </h4>
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: clip.contentType === 'screen_recording' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                    color: clip.contentType === 'screen_recording' ? '#38bdf8' : '#c084fc',
                    border: `1px solid ${clip.contentType === 'screen_recording' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                    textTransform: 'uppercase',
                    fontWeight: 700
                  }}>
                    {clip.contentType === 'screen_recording' ? 'Screen' : 'Footage'}
                  </span>
                </div>

                <p style={{
                  margin: '0 0 0.3rem 0',
                  fontSize: '0.74rem',
                  color: '#94a3b8',
                  lineHeight: '1.3',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {clip.description}
                </p>

                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', background: '#0f172a', padding: '1px 4px', borderRadius: '3px' }}>
                    {clip.width}x{clip.height}
                  </span>
                  {clip.lightingProfile && (
                    <span style={{ fontSize: '0.65rem', color: '#64748b', background: '#0f172a', padding: '1px 4px', borderRadius: '3px' }}>
                      💡 {clip.lightingProfile}
                    </span>
                  )}
                  {clip.keyActions?.[0] && (
                    <span style={{ fontSize: '0.65rem', color: '#a5b4fc', background: '#1e1b4b', padding: '1px 5px', borderRadius: '3px' }}>
                      ⚡ {clip.keyActions[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClip(clip.clipId);
                }}
                title="Remove clip"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  padding: '0.3rem',
                  borderRadius: '4px',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
