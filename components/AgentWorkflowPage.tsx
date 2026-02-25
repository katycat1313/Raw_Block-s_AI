import React, { useState } from 'react';
import './AgentWorkflowPage.css';
import { AgentOrchestrator } from '../services/agentOrchestrator';
import { CountdownSlot, ProductDossier, SocialStrategy } from '../types';

type DialogueEvent = {
    agent: string;
    role: string;
    message: string;
    type: 'thought' | 'debate' | 'prompt' | 'finding';
};

const AgentWorkflowPage = () => {
    const [productUrl, setProductUrl] = useState('https://www.amazon.com/dp/B0CQ3N353H');
    const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=cc-u-5-2-4A');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dialogue, setDialogue] = useState<DialogueEvent[]>([]);
    const [results, setResults] = useState<{ slots: CountdownSlot[]; dossier: ProductDossier; strategy: SocialStrategy } | null>(null);

    const handleStartAgents = async () => {
        if (!productUrl || !videoUrl) {
            alert("Please enter both a Product and Video URL first!");
            return;
        }

        setIsModalOpen(true);
        setIsLoading(true);
        setDialogue([]);
        setResults(null);

        try {
            const orchestratorResults = await AgentOrchestrator.orchestrate(
                productUrl,
                videoUrl,
                (status) => {
                    console.log(`Orchestrator Status: ${status}`);
                },
                (event) => {
                    setDialogue(prev => [...prev, event]);
                }
            );
            setResults(orchestratorResults);

        } catch (error: any) {
            console.error("Agent orchestration failed:", error);
            const errorMessage = `The agent mission failed. ${error.message ? `Reason: ${error.message}` : 'Check the developer console for technical details.'}`;
            
            setDialogue(prev => [...prev, {
                agent: 'System',
                role: 'Error Handler',
                message: errorMessage,
                type: 'thought' 
            }, {
                agent: 'System',
                role: 'Architect',
                message: "Note: This is UI-level error handling. For production, the retry logic and job queues from the system design would be implemented on the backend.",
                type: 'thought'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = () => {
        console.log("Prompts Approved!");
        setIsModalOpen(false);
    };

    const handleRequestChanges = () => {
        console.log("Requesting changes...");
        setIsModalOpen(false);
    };

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

            {isModalOpen && (
                <div
                    className="modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <div className="modal-content">
                        <h2 id="modal-title">Agent Interaction & Brainstorm</h2>
                        
                        <div className="logs-container">
                            {dialogue.map((event, index) => (
                                <p key={index} className={`log-entry type-${event.type}`}>
                                    <strong>{event.agent}</strong> ({event.role}): {event.message}
                                </p>
                            ))}
                            {isLoading && <p className="log-entry loading">Thinking...</p>}
                        </div>

                        <h3>Generated Prompts</h3>
                        <div className="prompts-container">
                            {results?.slots.map((slot, index) => (
                                <p key={index} className="prompt">
                                   <strong>Block #{slot.rank}:</strong> {slot.generated.videoPrompt}
                                </p>
                            ))}
                             {!isLoading && !results && <p>No prompts generated yet.</p>}
                        </div>

                        {!isLoading && results && (
                            <div className="button-container">
                                <button onClick={handleApprove}>Approve & Proceed</button>
                                <button onClick={handleRequestChanges}>Request Changes</button>
                            </div>
                        )}
                         <button className="close-button" onClick={() => setIsModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentWorkflowPage;