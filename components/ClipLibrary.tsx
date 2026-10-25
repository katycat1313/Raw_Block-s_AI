import React, { useRef, useState, useMemo } from 'react';

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
  blockRole?: string;
  blockCode?: string;
  categoryLetter?: string;
}

export interface BlockRoleInfo {
  role: 'hook_problem' | 'live_demo' | 'metrics_results' | 'social_proof' | 'call_to_action';
  label: string;
  letter: string;
  icon: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  description: string;
}

export function getBlockRole(clip: { title?: string; description?: string; tags?: string[]; originalName?: string; blockRole?: string; categoryLetter?: string }): BlockRoleInfo {
  if (clip.blockRole) {
    if (clip.blockRole === 'hook_problem') {
      return {
        role: 'hook_problem',
        label: 'Hooks & Reactions',
        letter: 'A',
        icon: '🎣',
        badgeColor: '#f87171',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeBorder: 'rgba(239, 68, 68, 0.35)',
        description: 'Stops the scroll: problem agitation, frustration, or theory trap'
      };
    }
    if (clip.blockRole === 'social_proof') {
      return {
        role: 'social_proof',
        label: 'Proof & Portfolios',
        letter: 'D',
        icon: '🏆',
        badgeColor: '#34d399',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeBorder: 'rgba(16, 185, 129, 0.35)',
        description: 'Career proof, portfolio verification & hired outcomes'
      };
    }
    if (clip.blockRole === 'metrics_results') {
      return {
        role: 'metrics_results',
        label: 'Metrics & Dashboards',
        letter: 'C',
        icon: '📊',
        badgeColor: '#fbbf24',
        badgeBg: 'rgba(251, 191, 36, 0.15)',
        badgeBorder: 'rgba(251, 191, 36, 0.35)',
        description: 'Performance dashboard & real-time analytics'
      };
    }
    if (clip.blockRole === 'call_to_action') {
      return {
        role: 'call_to_action',
        label: 'Offers & CTA',
        letter: 'E',
        icon: '🎯',
        badgeColor: '#f472b6',
        badgeBg: 'rgba(236, 72, 153, 0.15)',
        badgeBorder: 'rgba(236, 72, 153, 0.35)',
        description: 'Pricing, free trial signup & outro prompt'
      };
    }
  }

  const text = `${clip.title || ''} ${clip.description || ''} ${(clip.tags || []).join(' ')} ${clip.originalName || ''}`.toLowerCase();

  if (text.includes('portfolio') || text.includes('cert') || text.includes('hire') || text.includes('interview') || text.includes('success')) {
    return {
      role: 'social_proof',
      label: 'Proof & Portfolios',
      letter: 'D',
      icon: '🏆',
      badgeColor: '#34d399',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeBorder: 'rgba(16, 185, 129, 0.35)',
      description: 'Career proof, portfolio verification & hired outcomes'
    };
  }

  if (text.includes('broll') || text.includes('frustrat') || text.includes('theory') || text.includes('doubt') || text.includes('bored') || text.includes('lecture') || text.includes('shaking head')) {
    return {
      role: 'hook_problem',
      label: 'Hooks & Reactions',
      letter: 'A',
      icon: '🎣',
      badgeColor: '#f87171',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      badgeBorder: 'rgba(239, 68, 68, 0.35)',
      description: 'Stops the scroll: problem agitation, frustration, or theory trap'
    };
  }

  if (text.includes('report') || text.includes('preformance') || text.includes('performance') || text.includes('metric') || text.includes('analytic') || text.includes('conversion') || text.includes('traffic') || text.includes('growth') || text.includes('havoc')) {
    return {
      role: 'metrics_results',
      label: 'Metrics & Dashboards',
      letter: 'C',
      icon: '📊',
      badgeColor: '#fbbf24',
      badgeBg: 'rgba(251, 191, 36, 0.15)',
      badgeBorder: 'rgba(251, 191, 36, 0.35)',
      description: 'Performance dashboard & real-time analytics'
    };
  }

  if (text.includes('pricing') || text.includes('trial') || text.includes('subscribe') || text.includes('offer') || text.includes('cta')) {
    return {
      role: 'call_to_action',
      label: 'Offers & CTA',
      letter: 'E',
      icon: '🎯',
      badgeColor: '#f472b6',
      badgeBg: 'rgba(236, 72, 153, 0.15)',
      badgeBorder: 'rgba(236, 72, 153, 0.35)',
      description: 'Pricing, free trial signup & outro prompt'
    };
  }

  return {
    role: 'live_demo',
    label: 'Live UI Simulation',
    letter: 'B',
    icon: '⚡',
    badgeColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    description: 'Active client simulation or platform feature walkthrough'
  };
}

interface ClipLibraryProps {
  clips: VideoClip[];
  onUpload: (files: FileList) => Promise<void>;
  onDeleteClip: (clipId: string) => Promise<void>;
  isUploading: boolean;
  onOpenRecordModal: () => void;
  onOpenStockModal: () => void;
  onOpenKeyModal?: () => void;
  activeProject?: string;
}

export const ClipLibrary: React.FC<ClipLibraryProps> = ({
  clips,
  onUpload,
  onDeleteClip,
  isUploading,
  onOpenRecordModal,
  onOpenStockModal,
  onOpenKeyModal,
  activeProject = 'krechet_academy'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Pre-calculate roles and category counts
  const clipsWithRoles = useMemo(() => {
    return clips.map((c) => ({
      ...c,
      roleInfo: getBlockRole(c)
    }));
  }, [clips]);

  const counts = useMemo(() => {
    return {
      all: clips.length,
      hook_problem: clipsWithRoles.filter((c) => c.roleInfo.role === 'hook_problem').length,
      live_demo: clipsWithRoles.filter((c) => c.roleInfo.role === 'live_demo').length,
      metrics_results: clipsWithRoles.filter((c) => c.roleInfo.role === 'metrics_results').length,
      social_proof: clipsWithRoles.filter((c) => c.roleInfo.role === 'social_proof').length,
      call_to_action: clipsWithRoles.filter((c) => c.roleInfo.role === 'call_to_action').length
    };
  }, [clipsWithRoles, clips.length]);

  const filteredClips = useMemo(() => {
    return clipsWithRoles.filter((c) => {
      // Category filter
      if (selectedFilter !== 'all' && c.roleInfo.role !== selectedFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = `${c.title} ${c.description} ${c.roleInfo.label} ${(c.tags || []).join(' ')} ${c.originalName}`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [clipsWithRoles, selectedFilter, searchQuery]);

  const totalDuration = clips.reduce((acc, c) => acc + (c.duration || 0), 0);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🧱</span> Smart Raw Blocks Library
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Folder: <strong style={{ color: '#c7d2fe' }}>📁 {activeProject}</strong> • {clips.length} labeled blocks ready
          </span>
        </div>
      </div>

      {/* Creation & Key Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
        <button
          type="button"
          onClick={onOpenRecordModal}
          style={{
            padding: '0.65rem 0.5rem',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
        >
          <span>🤖</span> Record App
        </button>

        <button
          type="button"
          onClick={onOpenStockModal}
          style={{
            padding: '0.65rem 0.5rem',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#34d399',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')}
        >
          <span>🎥</span> Stock B-Roll
        </button>

        <button
          type="button"
          onClick={onOpenKeyModal}
          style={{
            padding: '0.65rem 0.5rem',
            borderRadius: '8px',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            background: 'rgba(168, 85, 247, 0.12)',
            color: '#c084fc',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)')}
        >
          <span>🔑</span> Block Key
        </button>
      </div>

      {/* Search Input Bar */}
      <div style={{ marginBottom: '0.6rem' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search blocks (e.g. portfolio, simulation, interview, report)..."
          style={{
            width: '100%',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #2d2b45',
            background: '#090a0f',
            color: '#f8fafc',
            fontSize: '0.82rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Smart Block Category Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '0.65rem'
      }}>
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          style={{
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: selectedFilter === 'all' ? '1px solid #818cf8' : '1px solid #232238',
            background: selectedFilter === 'all' ? 'rgba(99, 102, 241, 0.25)' : '#090a0f',
            color: selectedFilter === 'all' ? '#c7d2fe' : '#94a3b8',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          All ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('hook_problem')}
          style={{
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: selectedFilter === 'hook_problem' ? '1px solid #ef4444' : '1px solid #232238',
            background: selectedFilter === 'hook_problem' ? 'rgba(239, 68, 68, 0.25)' : '#090a0f',
            color: selectedFilter === 'hook_problem' ? '#fca5a5' : '#94a3b8',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          [A] 🎣 Hooks ({counts.hook_problem})
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('live_demo')}
          style={{
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: selectedFilter === 'live_demo' ? '1px solid #38bdf8' : '1px solid #232238',
            background: selectedFilter === 'live_demo' ? 'rgba(56, 189, 248, 0.25)' : '#090a0f',
            color: selectedFilter === 'live_demo' ? '#7dd3fc' : '#94a3b8',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          [B] ⚡ Live UI ({counts.live_demo})
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('metrics_results')}
          style={{
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: selectedFilter === 'metrics_results' ? '1px solid #f59e0b' : '1px solid #232238',
            background: selectedFilter === 'metrics_results' ? 'rgba(245, 158, 11, 0.25)' : '#090a0f',
            color: selectedFilter === 'metrics_results' ? '#fcd34d' : '#94a3b8',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          [C] 📊 Metrics ({counts.metrics_results})
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('social_proof')}
          style={{
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: selectedFilter === 'social_proof' ? '1px solid #10b981' : '1px solid #232238',
            background: selectedFilter === 'social_proof' ? 'rgba(16, 185, 129, 0.25)' : '#090a0f',
            color: selectedFilter === 'social_proof' ? '#6ee7b7' : '#94a3b8',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          [D] 🏆 Proof ({counts.social_proof})
        </button>

        <button
          type="button"
          onClick={() => setSelectedFilter('call_to_action')}
          style={{
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: selectedFilter === 'call_to_action' ? '1px solid #ec4899' : '1px solid #232238',
            background: selectedFilter === 'call_to_action' ? 'rgba(236, 72, 153, 0.25)' : '#090a0f',
            color: selectedFilter === 'call_to_action' ? '#f472b6' : '#94a3b8',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          [E] 🎯 CTA ({counts.call_to_action})
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
          borderRadius: '10px',
          padding: '0.75rem',
          textAlign: 'center',
          backgroundColor: isDragOver ? 'rgba(99,102,241,0.08)' : '#181822',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '0.75rem'
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', animation: 'spin 1.5s linear infinite' }}>⏳</span>
            <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>
              Scout Agent analyzing and labeling new block...
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📁</span>
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              Drop new clips to auto-label & ingest
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
        {filteredClips.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            color: '#64748b',
            fontSize: '0.85rem',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.4)'
          }}>
            {searchQuery ? `No blocks found matching "${searchQuery}".` : 'No blocks in this category.'}
          </div>
        ) : (
          filteredClips.map((clip) => {
            const role = clip.roleInfo;
            return (
              <div
                key={clip.clipId}
                style={{
                  display: 'flex',
                  gap: '0.85rem',
                  background: '#181824',
                  border: `1px solid #28283a`,
                  borderRadius: '10px',
                  padding: '0.75rem',
                  alignItems: 'flex-start',
                  position: 'relative'
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '95px',
                  height: '65px',
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
                    background: 'rgba(0,0,0,0.8)',
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
                  {/* Block Role Badge & Letter Code */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      padding: '2px 7px',
                      borderRadius: '5px',
                      background: role.badgeColor,
                      color: '#090a0f',
                      letterSpacing: '0.4px',
                      boxShadow: `0 2px 8px ${role.badgeColor}40`
                    }}>
                      [{clip.blockCode || `${role.letter}*`}]
                    </span>

                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '5px',
                      background: role.badgeBg,
                      color: role.badgeColor,
                      border: `1px solid ${role.badgeBorder}`,
                      letterSpacing: '0.2px'
                    }}>
                      {role.icon} {role.label}
                    </span>

                    <span style={{
                      fontSize: '0.62rem',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: clip.contentType === 'screen_recording' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                      color: clip.contentType === 'screen_recording' ? '#38bdf8' : '#c084fc',
                      textTransform: 'uppercase',
                      fontWeight: 700
                    }}>
                      {clip.contentType === 'screen_recording' ? 'Screen UI' : 'Stock B-Roll'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 style={{
                    margin: '0 0 0.2rem 0',
                    fontSize: '0.85rem',
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 700
                  }}>
                    {clip.title}
                  </h4>

                  {/* Description / Role Explanation */}
                  <p style={{
                    margin: '0 0 0.35rem 0',
                    fontSize: '0.73rem',
                    color: '#94a3b8',
                    lineHeight: '1.3',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {clip.description || role.description}
                  </p>

                  {/* Badges / Tags */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {clip.tags && clip.tags.slice(0, 3).map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        style={{
                          fontSize: '0.63rem',
                          color: '#a5b4fc',
                          background: '#151426',
                          border: '1px solid #23223c',
                          padding: '1px 5px',
                          borderRadius: '3px'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClip(clip.clipId);
                  }}
                  title="Remove block"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    borderRadius: '4px',
                    lineHeight: 1
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
