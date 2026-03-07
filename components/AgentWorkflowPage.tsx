import React, { useState, useRef } from 'react';
import './AgentWorkflowPage.css';
import { AgentOrchestrator } from '../services/agentOrchestrator';
import { RunwayService } from '../services/runwayService';
import { CountdownSlot, ProductDossier, SocialStrategy, DialogueEvent, OptimizedPrompt, Platform } from '../types';
import BoardroomMonitor from './BoardroomMonitor';
import ConversionDashboard from './ConversionDashboard';
import ViralPublisher from './ViralPublisher';

type ApprovedResults = { slots: CountdownSlot[]; dossier: ProductDossier; strategy: SocialStrategy };
type VideoGenState = { status: 'idle' | 'generating' | 'done' | 'error'; videoUrl?: string; error?: string };

const MasterSequence: React.FC<{ slots: CountdownSlot[]; videoGenStates: Record<string, VideoGenState> }> = ({ slots, videoGenStates }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const doneSlots = slots.filter(s => videoGenStates[s.id]?.status === 'done');

    const handleEnded = () => {
        if (activeIndex < doneSlots.length - 1) {
            setActiveIndex(i => i + 1);
        }
    };

    React.useEffect(() => {
        videoRef.current?.load();
        videoRef.current?.play().catch(() => {});
    }, [activeIndex]);

    const activeSlot = doneSlots[activeIndex];
    const activeUrl = videoGenStates[activeSlot?.id]?.videoUrl || '';

    return (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--primary)', borderRadius: '16px', background: 'rgba(99,102,241,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Shot Library — {doneSlots.length} B-Roll Clips Ready</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {doneSlots.map((s, i) => (
                        <a
                            key={s.id}
                            href={videoGenStates[s.id]?.videoUrl}
                            download={`shot-${s.rank}.mp4`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.7rem', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '4px', padding: '0.15rem 0.4rem', textDecoration: 'none' }}
                        >
                            #{s.rank}
                        </a>
                    ))}
                </div>
            </div>
            <video
                ref={videoRef}
                src={activeUrl}
                controls
                autoPlay
                onEnded={handleEnded}
                style={{ width: '100%', maxWidth: '600px', borderRadius: '10px', display: 'block', margin: '0 auto' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {doneSlots.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => setActiveIndex(i)}
                        style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.7rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: i === activeIndex ? 'var(--primary)' : 'rgba(99,102,241,0.15)',
                            color: 'white',
                        }}
                    >
                        Shot #{s.rank}
                    </button>
                ))}
            </div>
        </div>
    );
};

const AgentWorkflowPage = () => {
    const [productUrl, setProductUrl] = useState('https://www.amazon.com/dp/B0CQ3N353H');
    const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=cc-u-5-2-4A');
    const [isBoardroomOpen, setIsBoardroomOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [dialogue, setDialogue] = useState<DialogueEvent[]>([]);
    const [results, setResults] = useState<ApprovedResults | null>(null);
    const [approvedResults, setApprovedResults] = useState<ApprovedResults | null>(null);
    const [videoGenStates, setVideoGenStates] = useState<Record<string, VideoGenState>>({});

    const handleStartAgents = async () => {
        if (!productUrl || !videoUrl) {
            alert("Please enter both a Product and Video URL first!");
            return;
        }

        setIsBoardroomOpen(true);
        setIsLoading(true);
        setDialogue([]);
        setResults(null);
        setApprovedResults(null);
        setVideoGenStates({});
        setStatus('Initializing Agent Team...');

        try {
            const orchestratorResults = await AgentOrchestrator.orchestrate(
                productUrl,
                videoUrl,
                (msg) => setStatus(msg),
                (event) => setDialogue(prev => [...prev, { ...event, timestamp: Date.now() }])
            );
            setResults(orchestratorResults);
            setStatus('Boardroom Deliberation Complete. Awaiting Approval.');
        } catch (error: any) {
            console.error("Agent orchestration failed:", error);
            setStatus(`❌ Mission Failed: ${error.message}`);
            setDialogue(prev => [...prev, {
                agent: 'System',
                role: 'Error Handler',
                message: `The agent mission failed. Reason: ${error.message}`,
                type: 'thought',
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = () => {
        if (!results) return;
        setApprovedResults(results);
        setIsBoardroomOpen(false);
    };

    const handleGenerateVideo = async (slot: CountdownSlot) => {
        if (!slot.generated.videoPrompt) return;

        setVideoGenStates(prev => ({ ...prev, [slot.id]: { status: 'generating' } }));

        try {
            const videoUrl = await RunwayService.generateVideo(
                slot.generated.videoPrompt,
                slot.generated.imageUrl
            );
            setVideoGenStates(prev => ({ ...prev, [slot.id]: { status: 'done', videoUrl } }));
        } catch (err: any) {
            setVideoGenStates(prev => ({ ...prev, [slot.id]: { status: 'error', error: err.message } }));
        }
    };

    const handleGenerateAll = async (slots: CountdownSlot[]) => {
        for (const slot of slots) {
            if (!slot.generated.videoPrompt) continue;
            const current = videoGenStates[slot.id];
            if (current?.status === 'done' || current?.status === 'generating') continue;
            await handleGenerateVideo(slot);
        }
    };

    const buildPostApprovalData = (ar: ApprovedResults) => {
        const { slots, dossier, strategy } = ar;

        const safeStrategy: SocialStrategy = {
            ...strategy,
            caption: strategy.caption || 'Shop now — link in bio!',
            hashtags: strategy.hashtags?.length ? strategy.hashtags : ['#viral', '#trending', '#musthave'],
            firstComment: strategy.firstComment || 'Drop a ❤️ if you want one!',
            bestTime: strategy.bestTime || '6PM–9PM',
        };

        const optimized: OptimizedPrompt = {
            videoPrompt: slots[0]?.generated.videoPrompt || '',
            imagePrompt: slots[0]?.generated.imagePrompt || '',
            hook: strategy.angle || 'Scroll-stopping product reveal',
            audioScript: slots[0]?.generated.script || '',
            conversionStrategy: strategy.angle || '',
            visualBrief: dossier.visualDna,
            psychologicalAngle: strategy.angle || '',
            conversionScore: Math.min(95, 60 + (dossier.features?.length || 0) * 3),
            triggers: strategy.psychologicalTriggers || [],
            variations: [],
            launchCalendar: [],
            social: {
                [Platform.TIKTOK]: safeStrategy,
                [Platform.YOUTUBE]: safeStrategy,
                [Platform.INSTAGRAM]: safeStrategy,
            },
            researchData: {
                painPoints: dossier.painPoints || [],
                competitorWeakness: dossier.reviews?.slice(0, 3) || [],
                winningHookPatterns: strategy.psychologicalTriggers || [],
                sentimentScore: 72,
                buyerIntentSignals: dossier.features?.slice(0, 4) || [],
            },
        };

        const viralStrategies: Record<Platform, SocialStrategy> = {
            [Platform.TIKTOK]: safeStrategy,
            [Platform.YOUTUBE]: safeStrategy,
            [Platform.INSTAGRAM]: safeStrategy,
        };

        return { optimized, viralStrategies };
    };

    const postApproval = approvedResults ? buildPostApprovalData(approvedResults) : null;
    const runwayConfigured = RunwayService.isConfigured();

    return (
        <div className="agent-workflow-page">
            <div className="form-group">
                <label htmlFor="product-url">Product URL:</label>
                <input
                    type="text"
                    id="product-url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="e.g., https://www.amazon.com/dp/B0CQ3N353H"
                />
            </div>
            <div className="form-group">
                <label htmlFor="video-url">Reference Video URL:</label>
                <input
                    type="text"
                    id="video-url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="e.g., https://www.youtube.com/watch?v=cc-u-5-2-4A"
                />
            </div>
            <button onClick={handleStartAgents} disabled={isLoading}>
                {isLoading ? 'Agents are Working...' : 'Start Agents'}
            </button>

            <BoardroomMonitor
                isOpen={isBoardroomOpen}
                logs={dialogue}
                status={status}
                onClose={() => setIsBoardroomOpen(false)}
                onApprove={handleApprove}
                canApprove={!isLoading && results !== null}
            />

            {approvedResults && postApproval && (
                <div style={{ marginTop: '3rem' }}>
                    <h2 className="title">{approvedResults.dossier.productName}</h2>
                    <p style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: '0.5rem' }}>
                        Strategy: <strong style={{ color: 'var(--primary)' }}>{approvedResults.strategy.angle}</strong>
                        {' · '}
                        Target: <strong style={{ color: 'var(--secondary)' }}>{approvedResults.strategy.targetAudience}</strong>
                    </p>
                    <p style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: '2rem' }}>
                        {approvedResults.slots.length} b-roll shots queued for generation
                    </p>

                    {!runwayConfigured && (
                        <div style={{
                            background: 'rgba(234,179,8,0.1)',
                            border: '1px solid rgba(234,179,8,0.3)',
                            borderRadius: '12px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1.5rem',
                            color: '#ca8a04',
                            fontSize: '0.8rem',
                        }}>
                            <strong>Runway API not configured.</strong> Add <code>VITE_RUNWAY_API_URL</code> and <code>VITE_RUNWAY_API_KEY</code> to your <code>.env</code> file to enable video generation.
                        </div>
                    )}

                    {/* Video Block Prompts */}
                    <div className="prompts-container" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)' }}>B-Roll Shot Prompts</h3>
                            {runwayConfigured && (
                                <button
                                    onClick={() => handleGenerateAll(approvedResults.slots)}
                                    disabled={approvedResults.slots.every(s => {
                                        const st = videoGenStates[s.id]?.status;
                                        return st === 'done' || st === 'generating';
                                    })}
                                    style={{
                                        padding: '0.4rem 1rem',
                                        fontSize: '0.75rem',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: 'var(--primary)',
                                        color: 'white',
                                    }}
                                >
                                    Generate All Shots
                                </button>
                            )}
                        </div>
                        {approvedResults.slots.map((slot) => {
                            const genState = videoGenStates[slot.id] || { status: 'idle' };
                            return (
                                <div key={slot.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                        <p className="prompt" style={{ margin: 0 }}>
                                            <strong>Shot #{slot.rank}</strong>
                                            {slot.category && (
                                                <span style={{ color: 'var(--muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                                    [{slot.category}]
                                                </span>
                                            )}
                                        </p>
                                        {slot.generated.videoPrompt && genState.status !== 'done' && (
                                            <button
                                                onClick={() => handleGenerateVideo(slot)}
                                                disabled={genState.status === 'generating' || !runwayConfigured}
                                                style={{
                                                    padding: '0.3rem 0.75rem',
                                                    fontSize: '0.75rem',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    cursor: genState.status === 'generating' || !runwayConfigured ? 'not-allowed' : 'pointer',
                                                    background: genState.status === 'generating' ? 'rgba(99,102,241,0.3)' : 'var(--primary)',
                                                    color: 'white',
                                                    flexShrink: 0,
                                                    marginLeft: '1rem',
                                                }}
                                            >
                                                {genState.status === 'generating' ? 'Generating...' : 'Generate Video'}
                                            </button>
                                        )}
                                    </div>
                                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>
                                        {slot.generated.videoPrompt}
                                    </p>
                                    {slot.generated.imageUrl && (
                                        <img
                                            src={slot.generated.imageUrl}
                                            alt={`Block ${slot.rank} reference`}
                                            style={{ maxHeight: '120px', borderRadius: '4px', marginBottom: '0.5rem' }}
                                        />
                                    )}
                                    {genState.status === 'generating' && (
                                        <p style={{ color: 'var(--primary)', fontSize: '0.8rem', margin: 0 }}>
                                            Submitting to Runway... polling for result (up to 10 min)
                                        </p>
                                    )}
                                    {genState.status === 'error' && (
                                        <p style={{ color: '#f87171', fontSize: '0.8rem', margin: 0 }}>
                                            Error: {genState.error}
                                        </p>
                                    )}
                                    {genState.status === 'done' && genState.videoUrl && (
                                        <div>
                                            <video
                                                src={genState.videoUrl}
                                                controls
                                                style={{ width: '100%', maxWidth: '480px', borderRadius: '8px', marginTop: '0.5rem' }}
                                            />
                                            <a
                                                href={genState.videoUrl}
                                                download={`block-${slot.rank}.mp4`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    display: 'inline-block',
                                                    marginTop: '0.4rem',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--primary)',
                                                    textDecoration: 'none',
                                                    border: '1px solid var(--primary)',
                                                    borderRadius: '6px',
                                                    padding: '0.2rem 0.6rem',
                                                }}
                                            >
                                                Download Shot #{slot.rank}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Master Sequence — shown when all blocks are done */}
                    {(() => {
                        const doneSlots = approvedResults.slots.filter(s => videoGenStates[s.id]?.status === 'done');
                        const allDone = doneSlots.length === approvedResults.slots.length && doneSlots.length > 0;
                        if (!allDone) return null;
                        return (
                            <MasterSequence slots={approvedResults.slots} videoGenStates={videoGenStates} />
                        );
                    })()}

                    {/* Conversion Intelligence Dashboard */}
                    <ConversionDashboard optimized={postApproval.optimized} />

                    {/* Viral Publisher Hub */}
                    <div style={{ marginTop: '2rem' }}>
                        <ViralPublisher strategies={postApproval.viralStrategies} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentWorkflowPage;
