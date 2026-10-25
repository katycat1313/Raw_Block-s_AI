import React, { useState, useEffect } from 'react';

interface BlockKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
  onProjectSwitched?: () => void;
}

export const BlockKeyModal: React.FC<BlockKeyModalProps> = ({
  isOpen,
  onClose,
  apiBase,
  onProjectSwitched
}) => {
  const [projectData, setProjectData] = useState<{
    currentProject: string;
    currentAppUrl: string;
    keyContent: string;
    availableProjects: string[];
    totalClips: number;
  } | null>(null);

  const [newProjectName, setNewProjectName] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProjectKey();
    }
  }, [isOpen]);

  const fetchProjectKey = async () => {
    try {
      const res = await fetch(`${apiBase}/api/project`);
      if (res.ok) {
        const data = await res.json();
        setProjectData(data);
      }
    } catch (err) {
      console.error('Error fetching project key:', err);
    }
  };

  if (!isOpen) return null;

  const handleSwitchProject = async (name: string, url?: string) => {
    setIsSwitching(true);
    try {
      const res = await fetch(`${apiBase}/api/project/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: name, appUrl: url })
      });
      if (res.ok) {
        await fetchProjectKey();
        setNewProjectName('');
        setNewAppUrl('');
        if (onProjectSwitched) onProjectSwitched();
      }
    } catch (err) {
      alert(`Error switching project: ${err}`);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCopy = () => {
    if (projectData?.keyContent) {
      navigator.clipboard.writeText(projectData.keyContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: '#121217',
        border: '1px solid #3b3658',
        borderRadius: '18px',
        padding: '2rem',
        maxWidth: '850px',
        width: '92%',
        color: '#f0f0f5',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>🔑</span> Master Taxonomy Key & App Folder
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Standardized A-B-C-D-E block codes and project folder management
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Active Project & Folder Controls */}
        <div style={{
          background: '#090a0f',
          border: '1px solid #232238',
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.3rem' }}>📁</span>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Active Project Folder:
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                  {projectData?.currentProject || 'krechet_academy'}
                </div>
              </div>
            </div>

            {/* Quick Switch Dropdown if multiple projects */}
            {projectData && projectData.availableProjects.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Switch Folder:</span>
                <select
                  value={projectData.currentProject}
                  onChange={(e) => handleSwitchProject(e.target.value)}
                  style={{
                    background: '#181824',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  {projectData.availableProjects.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Create New Client / App Folder Inline */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            paddingTop: '0.5rem',
            borderTop: '1px solid #1e1b30',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 600 }}>
              + Create New App Folder:
            </span>
            <input
              type="text"
              placeholder="Folder name (e.g. fitness_saas)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#181824',
                color: '#f8fafc',
                fontSize: '0.8rem'
              }}
            />
            <input
              type="text"
              placeholder="App URL (e.g. https://myfitness.app)"
              value={newAppUrl}
              onChange={(e) => setNewAppUrl(e.target.value)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#181824',
                color: '#f8fafc',
                fontSize: '0.8rem'
              }}
            />
            <button
              type="button"
              onClick={() => newProjectName.trim() && handleSwitchProject(newProjectName, newAppUrl)}
              disabled={!newProjectName.trim() || isSwitching}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: !newProjectName.trim() ? '#334155' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: !newProjectName.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isSwitching ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </div>

        {/* 5-Category Taxonomy Overview Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.65rem'
        }}>
          {[
            { letter: 'A', icon: '🎣', name: 'Hooks & Pain', color: '#f87171', bg: 'rgba(239, 68, 68, 0.12)', desc: 'Reactions, frustration & theory trap' },
            { letter: 'B', icon: '⚡', name: 'Live Simulation', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', desc: 'Interactive campaign & SEO demos' },
            { letter: 'C', icon: '📊', name: 'Metrics & Data', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', desc: 'Performance reports & growth charts' },
            { letter: 'D', icon: '🏆', name: 'Proof & Portfolios', color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', desc: 'Certifications & employer verified' },
            { letter: 'E', icon: '🎯', name: 'Offer & CTA', color: '#f472b6', bg: 'rgba(236, 72, 153, 0.12)', desc: 'Free trial signup & pricing outro' }
          ].map((cat) => (
            <div
              key={cat.letter}
              style={{
                background: cat.bg,
                border: `1px solid ${cat.color}40`,
                borderRadius: '10px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  background: cat.color,
                  color: '#090a0f',
                  padding: '1px 6px',
                  borderRadius: '4px'
                }}>
                  {cat.letter}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cat.color }}>
                  {cat.icon} {cat.name}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#cbd5e1', lineHeight: '1.3' }}>
                {cat.desc}
              </span>
            </div>
          ))}
        </div>

        {/* BLOCK_KEY.txt Live Viewer Box */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📄</span> BLOCK_KEY.txt File (Stored directly in project folder):
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#c7d2fe',
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {copied ? '✓ Copied!' : '📋 Copy Text'}
              </button>
              <a
                href={`${apiBase}/api/project/key`}
                download="BLOCK_KEY.txt"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                ⬇️ Download KEY.txt
              </a>
            </div>
          </div>

          <pre style={{
            background: '#090a0f',
            border: '1px solid #232238',
            borderRadius: '10px',
            padding: '1rem',
            fontSize: '0.76rem',
            color: '#a5b4fc',
            fontFamily: 'monospace',
            maxHeight: '260px',
            overflowY: 'auto',
            lineHeight: '1.45',
            whiteSpace: 'pre-wrap',
            margin: 0
          }}>
            {projectData?.keyContent || 'Loading project key...'}
          </pre>
        </div>

        {/* Footer Note */}
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
          💡 When directing agents, you can write: <em>"Use [A1] for the hook, [B1] for the simulation, and [D1] for proof."</em>
        </div>
      </div>
    </div>
  );
};
