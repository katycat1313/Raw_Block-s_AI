import { useState, useCallback } from 'react';
import { AgentOrchestrator } from '../services/agentOrchestrator';
import { CountdownProject, CountdownSlot, DialogueEvent } from '../types';

export const useProductionManager = (
    project: CountdownProject,
    setProject: React.Dispatch<React.SetStateAction<CountdownProject>>
) => {
    const [globalStatus, setGlobalStatus] = useState<string>('');
    const [boardroomLogs, setBoardroomLogs] = useState<DialogueEvent[]>([]);
    const [isBoardroomVisible, setIsBoardroomVisible] = useState(false);
    const [pendingResults, setPendingResults] = useState<{ slots: CountdownSlot[], dossier: any, strategy: any } | null>(null);

    const handleDirectorIngest = useCallback(async (productUrl: string, videoUrl: string) => {
        setGlobalStatus("Initializing Agent Team...");
        setProject(prev => ({ ...prev, status: 'boardroom', slots: [] }));
        setBoardroomLogs([]);
        setIsBoardroomVisible(true);

        try {
            const results = await AgentOrchestrator.orchestrate(
                productUrl,
                videoUrl,
                (status) => setGlobalStatus(status),
                (event) => {
                    const newEvent: DialogueEvent = { ...event, timestamp: Date.now() };
                    setBoardroomLogs(prev => {
                        const updated = [...prev, newEvent];
                        setProject(p => ({ ...p, boardroomLog: updated }));
                        return updated;
                    });
                }
            );

            setPendingResults(results);
            setGlobalStatus("Boardroom Deliberation Complete. Awaiting Approval.");
            setProject(prev => ({
                ...prev,
                status: 'awaiting_approval',
                boardroomLog: boardroomLogs
            }));

        } catch (err: any) {
            console.error("Agent Team Failed:", err);
            setGlobalStatus(`❌ Mission Failed: ${err.message}`);
            setProject(prev => ({ ...prev, status: 'error' }));
            setIsBoardroomVisible(false);
        }
    }, [setProject]);

    const handleApproveBoardroom = useCallback(() => {
        if (!pendingResults) return;
        const { slots, dossier, strategy } = pendingResults;

        setProject(prev => ({
            ...prev,
            title: `${dossier.productName} - ${strategy.videoType}`,
            slots: slots,
            status: 'idle',
            connectiveNarrative: `Strategy: ${strategy.angle}. Audience: ${strategy.targetAudience}.`
        }));

        setIsBoardroomVisible(false);
        setPendingResults(null);
    }, [pendingResults, setProject]);

    return {
        globalStatus,
        setGlobalStatus,
        boardroomLogs,
        isBoardroomVisible,
        setIsBoardroomVisible,
        handleDirectorIngest,
        handleApproveBoardroom,
        pendingResults
    };
};
