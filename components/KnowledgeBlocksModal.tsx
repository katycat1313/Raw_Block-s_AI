import React, { useState, useEffect, useRef } from 'react';

export interface KnowledgeBlock {
  blockId: string;
  videoId: string;
  sourceFile: string;
  sourceName: string;
  startTime: number;
  endTime: number;
  duration: number;
  transcript: string;
  transcriptSummary: string;
  feature: string;
  blockType: 'feature_explanation' | 'aha_moment' | 'proof_demonstration' | 'workflow_execution' | 'hook_problem' | 'navigation_idle';
  teachingScore: number;
  clarityScore: number;
  visualScore: number;
  energyScore: number;
  overallScore: number;
  reusable: boolean;
  tags: string[];
  slicePath: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  semanticRelevance?: number;
  createdAt: number;
}

interface KnowledgeBlocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiBase: string;
  onSelectBlockForTimeline?: (block: KnowledgeBlock) => void;
}

export const KnowledgeBlocksModal: React.FC<KnowledgeBlocksModalProps> = ({
  isOpen,
  onClose,
  apiBase,
  onSelectBlockForTimeline
}) => {
  const [blocks, setBlocks] = useState<KnowledgeBlock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composerStatus, setComposerStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'high_score' | 'features' | 'proof' | 'client_chat'>('all');
  const [selectedBlock, setSelectedBlock] = useState<KnowledgeBlock | null>(null);
  const [masterVideoUrl, setMasterVideoUrl] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<'quick_tour' | 'feature_spotlight' | 'master_demo'>('master_demo');
  const [selectedVoice, setSelectedVoice] = useState('flux-wade-en');

  // Dynamic Client Persona Chat State
  const [clientChatMessages, setClientChatMessages] = useState<Array<{ sender: 'Student' | 'Jenny Vance'; text: string }>>([
    { sender: 'Jenny Vance', text: "Hey! Jenny here from Jenny's Artisan Java. Thanks for taking on our account. My Morgantown cafe has lines out the door every morning, but our online store is struggling—Google is charging me $2.85 a click and people bounce right off the page. I'm a roaster, not a marketer. Ask me whatever you need to know about our customers, our cafe, or our beans to figure out where the leak is." }
  ]);
  const [studentInput, setStudentInput] = useState('');
  const [isClientReplying, setIsClientReplying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [clientChatMessages, isClientReplying, activeTab]);

  const handleSendClientMessage = async (textToSend?: string) => {
    const msg = (textToSend || studentInput).trim();
    if (!msg || isClientReplying) return;

    const updated = [...clientChatMessages, { sender: 'Student' as const, text: msg }];
    setClientChatMessages(updated);
    setStudentInput('');
    setIsClientReplying(true);

    try {
      const res = await fetch(`${apiBase}/api/simulation/client-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'jennys_artisan_java',
          studentMessage: msg,
          conversationHistory: updated
        })
      });
      if (res.ok) {
        const data = await res.json();
        setClientChatMessages(prev => [...prev, { sender: 'Jenny Vance', text: data.reply }]);
      } else {
        setClientChatMessages(prev => [...prev, { sender: 'Jenny Vance', text: "Sorry, pulled a double shot and missed that. Ask me again!" }]);
      }
    } catch {
      setClientChatMessages(prev => [...prev, { sender: 'Jenny Vance', text: "Hey! Roaster timer just went off. Send that one more time." }]);
    } finally {
      setIsClientReplying(false);
    }
  };

  const normalizeUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${apiBase}${url}`;
  };

  const fetchBlocks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/knowledge/blocks`);
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.blocks || []);
      }
    } catch (err) {
      console.error('Error fetching knowledge blocks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlocks();
    }
  }, [isOpen]);

  const handleSemanticSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      fetchBlocks();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/knowledge/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 12, minScore: 40 })
      });
      if (res.ok) {
        const data = await res.json();
        setBlocks(data.results || []);
      }
    } catch (err) {
      console.error('Semantic search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComposeMasterDemo = async () => {
    setIsComposing(true);
    setComposerStatus('Initializing Story Agent & Narrative Arc...');
    try {
      const res = await fetch(`${apiBase}/api/composer/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: searchQuery.trim() || 'Master product demonstration of Krechet Academy active simulation, SEO Workbench, and client deliverables.',
          targetDurationCategory: selectedDuration,
          selectedVoice,
          musicTrack: 'chill_tech_ambient.mp3'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed generating master demo');
      }

      const data = await res.json();
      setMasterVideoUrl(normalizeUrl(data.videoUrl));
      setComposerStatus('Master Demo Render Complete!');
    } catch (err: any) {
      alert(`Master Composer Error: ${err.message}`);
    } finally {
      setIsComposing(false);
    }
  };

  if (!isOpen) return null;

  const filteredBlocks = blocks.filter(b => {
    if (activeTab === 'high_score') return b.overallScore >= 90;
    if (activeTab === 'features') return b.blockType === 'feature_explanation' || b.blockType === 'workflow_execution';
    if (activeTab === 'proof') return b.blockType === 'proof_demonstration' || b.blockType === 'aha_moment';
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981'; // Emerald
    if (score >= 75) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getBlockTypeBadge = (type: string) => {
    switch (type) {
      case 'feature_explanation':
        return { label: '⚙️ Feature Explanation', bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' };
      case 'aha_moment':
        return { label: '💡 Aha Moment', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' };
      case 'proof_demonstration':
        return { label: '📊 Proof & Telemetry', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' };
      case 'workflow_execution':
        return { label: '🎯 Hands-On Action', bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' };
      case 'hook_problem':
        return { label: '🚨 Problem & Friction', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
      default:
        return { label: '🎬 Demonstration', bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af' };
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
        background: '#101015',
        border: '1px solid #2e2a44',
        borderRadius: '20px',
        padding: '2rem',
        maxWidth: '1200px',
        width: '95%',
        maxHeight: '92vh',
        color: '#f0f0f5',
        boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.8rem' }}>🧠</span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#f3f4f6' }}>
                Block Intelligence Layer & Knowledge Graph
              </h2>
              <span style={{
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                padding: '0.2rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                Stages 1–10 Active
              </span>
            </div>
            <p style={{ margin: '0.4rem 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
              Deep video understanding turned your raw demo takes into an atomic, scored knowledge graph. Never edits away great explanations.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Action Controls & Semantic Search Bar */}
        <div style={{
          background: '#181820',
          border: '1px solid #292639',
          borderRadius: '12px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <form onSubmit={handleSemanticSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Semantic vector search (e.g. 'improve rankings', 'client crisis call', 'attribution score')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d12',
                  border: '1px solid #36324d',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  color: '#f3f4f6',
                  fontSize: '0.88rem'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0 1.25rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              🔍 Semantic Search
            </button>
          </form>

          {/* Master Story Composer Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #232032'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Format:</span>
              <select
                value={selectedDuration}
                onChange={(e: any) => setSelectedDuration(e.target.value)}
                style={{
                  background: '#0d0d12',
                  color: '#e5e7eb',
                  border: '1px solid #36324d',
                  borderRadius: '6px',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8rem'
                }}
              >
                <option value="quick_tour">⚡ Quick Tour (45s - 60s)</option>
                <option value="feature_spotlight">🎯 Feature Spotlight (60s - 90s)</option>
                <option value="master_demo">🎬 Master Demo (90s - 180s)</option>
              </select>

              <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: '0.5rem' }}>Voice:</span>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                style={{
                  background: '#0d0d12',
                  color: '#e5e7eb',
                  border: '1px solid #36324d',
                  borderRadius: '6px',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8rem'
                }}
              >
                <option value="flux-wade-en">🎙️ Wade (Natural Conversational - Deepgram Flux)</option>
                <option value="aura-orion-en">🎙️ Orion (Natural Male)</option>
                <option value="aura-luna-en">🎙️ Luna (Professional Female)</option>
                <option value="aura-asteria-en">🎙️ Asteria (Warm Conversational)</option>
                <option value="aura-zeus-en">🎙️ Zeus (Deep Authority)</option>
              </select>
            </div>

            <button
              onClick={handleComposeMasterDemo}
              disabled={isComposing || blocks.length === 0}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.25rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              {isComposing ? '⏳ Assembling Master Demo...' : '✨ Compose Master Demo (Stages 5–10)'}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #262338', paddingBottom: '0.5rem' }}>
          {[
            { id: 'all', label: `All Blocks (${blocks.length})` },
            { id: 'high_score', label: '⭐ Top Quality (90+ Score)' },
            { id: 'features', label: '⚙️ Feature Demonstrations' },
            { id: 'proof', label: '📊 Proof & Havoc Calls' },
            { id: 'client_chat', label: '💬 AI Client Persona (Jenny Vance)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: activeTab === tab.id ? '#2e2a44' : 'transparent',
                color: activeTab === tab.id ? '#f3f4f6' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Master Video Player Modal / Banner if generated */}
        {masterVideoUrl && (
          <div style={{
            background: '#13131c',
            border: '1px solid #10b981',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>
                🎉 Master Demo Assembled & Ready! (Authentic Explanations + Elevated Narration + Dynamic Punch-ins)
              </span>
              <button
                onClick={() => setMasterVideoUrl(null)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                ✕ Close Preview
              </button>
            </div>
            <video
              src={masterVideoUrl}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '360px', borderRadius: '8px', background: '#000' }}
            />
          </div>
        )}

        {/* Active Tab Content */}
        {activeTab === 'client_chat' ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#0d0d12',
            border: '1px solid #282438',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {/* Client Persona Header */}
            <div style={{
              padding: '0.75rem 1.25rem',
              background: '#14141c',
              borderBottom: '1px solid #232032',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  ☕
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '0.95rem' }}>Jenny Vance</span>
                    <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>● Online (AI Client Persona)</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Owner, Jenny's Artisan Java (Morgantown, WV) • Target: $15k/mo</span>
                </div>
              </div>

              {/* Client Financials Banner */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.68rem' }}>Current CAC</span>
                  <strong style={{ color: '#ef4444' }}>$28.00 / cust</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.68rem' }}>Unfair Advantage</span>
                  <strong style={{ color: '#34d399' }}>48-Hr Roast-to-Ship</strong>
                </div>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {clientChatMessages.map((msg, i) => {
                const isStudent = msg.sender === 'Student';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isStudent ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      alignSelf: isStudent ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: '#71717a', marginBottom: '0.2rem' }}>{msg.sender}</span>
                    <div style={{
                      padding: '0.65rem 0.95rem',
                      borderRadius: isStudent ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isStudent ? '#4f46e5' : '#1f1d2b',
                      color: '#f3f4f6',
                      fontSize: '0.86rem',
                      lineHeight: 1.45,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isClientReplying && (
                <div style={{ alignSelf: 'flex-start', color: '#9ca3af', fontSize: '0.78rem', fontStyle: 'italic' }}>
                  Jenny is typing...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Inquiry Chips */}
            <div style={{ padding: '0.4rem 1.25rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid #1a1824', background: '#121118' }}>
              <span style={{ fontSize: '0.72rem', color: '#71717a', alignSelf: 'center' }}>Suggested:</span>
              {[
                "What do customers say when they visit your Morgantown cafe?",
                "What do people complain about when they look at your prices?",
                "How do your regulars explain why your beans taste better?",
                "What happens in your roastery that online visitors never get to see?"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendClientMessage(chip)}
                  disabled={isClientReplying}
                  style={{
                    background: '#1a1926',
                    border: '1px solid #322f47',
                    borderRadius: '12px',
                    padding: '0.2rem 0.6rem',
                    color: '#c4b5fd',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#28253b')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1926')}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendClientMessage(); }} style={{ padding: '0.75rem 1.25rem', background: '#14141c', borderTop: '1px solid #232032', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Ask Jenny a question about her margins, customers, roast date, or ad spend..."
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                style={{
                  flex: 1,
                  background: '#0d0d12',
                  border: '1px solid #36324d',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  color: '#f3f4f6',
                  fontSize: '0.86rem'
                }}
              />
              <button
                type="submit"
                disabled={isClientReplying || !studentInput.trim()}
                style={{
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: isClientReplying ? 'wait' : 'pointer'
                }}
              >
                Send Message
              </button>
            </form>
          </div>
        ) : (
          /* Knowledge Blocks Grid */
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1rem',
            paddingRight: '0.25rem'
          }}>
            {filteredBlocks.map((b, idx) => {
              const badge = getBlockTypeBadge(b.blockType);
              const scoreColor = getScoreColor(b.overallScore);

              return (
                <div
                  key={b.blockId}
                  style={{
                    background: '#14141c',
                    border: '1px solid #282438',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  {/* Thumbnail / Video Preview */}
                  <div style={{ position: 'relative', width: '100%', height: '180px', background: '#000' }}>
                    {b.videoUrl ? (
                      <video
                        src={normalizeUrl(b.videoUrl)}
                        poster={normalizeUrl(b.thumbnailUrl)}
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
                        No Preview
                      </div>
                    )}

                    {/* Duration Pill */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.8)',
                      color: '#f3f4f6',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}>
                      {b.duration.toFixed(1)}s
                    </div>

                    {/* Quality Score Meter */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.85)',
                      border: `1px solid ${scoreColor}`,
                      color: scoreColor,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {b.overallScore}/100
                    </div>
                  </div>

                  {/* Content Details */}
                  <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        background: badge.bg,
                        color: badge.text,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}>
                        {badge.label}
                      </span>
                      {b.semanticRelevance !== undefined && (
                        <span style={{ color: '#818cf8', fontSize: '0.72rem', fontWeight: 600 }}>
                          Match: {Math.round(b.semanticRelevance * 100)}%
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: '0.2rem 0 0', fontSize: '0.92rem', fontWeight: 600, color: '#f3f4f6' }}>
                      {b.feature}
                    </h3>

                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.4 }}>
                      {b.transcriptSummary}
                    </p>

                    {/* Spoken Transcript Preview */}
                    {b.transcript && (
                      <div style={{
                        background: '#0d0d12',
                        border: '1px solid #201e2e',
                        borderRadius: '6px',
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.72rem',
                        color: '#a1a1aa',
                        fontStyle: 'italic',
                        lineHeight: 1.35,
                        maxHeight: '48px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        "{b.transcript.substring(0, 110)}..."
                      </div>
                    )}

                    {/* Quality Breakdown Badges */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.4rem' }}>
                      <span style={{ fontSize: '0.68rem', color: '#71717a' }}>Teach: <strong style={{ color: '#d4d4d8' }}>{b.teachingScore}</strong></span>
                      <span style={{ fontSize: '0.68rem', color: '#71717a' }}>•</span>
                      <span style={{ fontSize: '0.68rem', color: '#71717a' }}>Clar: <strong style={{ color: '#d4d4d8' }}>{b.clarityScore}</strong></span>
                      <span style={{ fontSize: '0.68rem', color: '#71717a' }}>•</span>
                      <span style={{ fontSize: '0.68rem', color: '#71717a' }}>Vis: <strong style={{ color: '#d4d4d8' }}>{b.visualScore}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
