import { ResearcherAgent } from './agents/ResearcherAgent';
import { SocialMediaAgent } from './agents/SocialMediaAgent';
import { DirectorAgent } from './agents/DirectorAgent';
import { VideoEditorAgent } from './agents/VideoEditorAgent';
import { ImagenService } from './imagenService';
import { StorageService } from './storageService';
import { SharedMemory } from './agents/core/SharedMemory';
import { CountdownSlot, ProductDossier, SocialStrategy, VideoSequence } from '../types';

export class AgentOrchestrator {
    /**
     * Orchestrates the entire agent pipeline to transform a product URL into a video timeline.
     * 
     * @param productUrl - The URL of the product to research.
     * @param initialVideoUrl - A reference video URL (YouTube/TikTok).
     * @param onProgress - Callback to report status updates to the UI.
     * @returns A promise that resolves to an array of populated CountdownSlots.
     */
    public static async orchestrate(
        productUrl: string,
        initialVideoUrl: string,
        onProgress?: (status: string) => void,
        onDialogue?: (event: { agent: string, role: string, message: string, type: 'thought' | 'debate' | 'prompt' | 'finding' }) => void
    ): Promise<{ slots: CountdownSlot[]; dossier: ProductDossier; strategy: SocialStrategy }> {
        const notify = (msg: string) => {
            console.log(`[Orchestrator] ${msg}`);
            if (onProgress) onProgress(msg);
        };

        const logDialogue = (agent: string, role: string, message: string, type: 'thought' | 'debate' | 'prompt' | 'finding') => {
            if (onDialogue) onDialogue({ agent, role, message, type });
        };

        try {
            // Initialize Shared Context
            const context: any = {
                dossier: {
                    productName: "Pending",
                    description: "",
                    images: [],
                    features: [],
                    referenceVideoUrls: [initialVideoUrl],
                    visualDna: "",
                    specs: {},
                    reviews: [],
                    productUrl
                },
                strategy: {
                    angle: "Initial",
                    targetAudience: "General"
                },
                memory: [],
                mission: "Revenue-Primary: Build 8-second Conversion Sequence",
                sharedMemory: new SharedMemory(),
                onDialogue: (e: any) => logDialogue(e.agent, e.role, e.message, e.type)
            };

            // 1. Researcher Agent
            notify("🕵️ Researcher Agent: Extracting Visual DNA & User Objections...");
            const researcher = new ResearcherAgent();
            await researcher.execute(context as any);
            const dossier = context.dossier;
            logDialogue("Researcher", "Visual Scout", `Investigation complete. Found ${dossier.features.length} features. Visual DNA: ${dossier.visualDna}`, "finding");
            notify(`🕵️ Researcher: Visual DNA found: "${dossier.visualDna.substring(0, 50)}..."`);

            // 2. Social Media Agent
            notify("🧠 Strategist Agent: Mapping Competitive Positioning...");
            const strategyAgent = new SocialMediaAgent();
            await strategyAgent.execute(context as any);
            const strategy = context.strategy!;
            logDialogue("Strategist", "Conversion Specialist", `Selected the "${strategy.angle}" angle for ${strategy.targetAudience}. Caption drafted with ${strategy.hashtags?.length} tags.`, "thought");
            notify(`🧠 Strategist: Angle set - ${strategy.angle}. Targeting ${strategy.targetAudience}.`);

            // 3. Director Agent
            notify("🎬 Director Agent: Architecting 10 modular 8-second blocks...");
            // Passing logDialogue to show the boardroom debate
            const sequence = await DirectorAgent.produceSequence(dossier, strategy, logDialogue);
            logDialogue("Director", "Production Lead", `Storyboards locked. ${sequence.boxes.length} scenes architected for final production.`, "debate");
            notify(`🎬 Director: Narrative locked. ${sequence.boxes.length} blocks ready for CGI.`);

            // 4. Production Preparation (Video Editor)
            notify("✂️ Video Editor: Cutting timeline blocks...");
            const rawSlots = VideoEditorAgent.assembleTimeline(sequence, dossier.productName);

            // 5. High-Fidelity CGI Pass (Imagen 4 for Reference Anchors)
            notify("🎨 Imagen 4: Generating unique static anchors for each block...");
            const slotsWithAssets: CountdownSlot[] = [];

            for (const slot of rawSlots) {
                const boxMatch = sequence.boxes.find(b => b.visualPrompt === slot.generated.videoPrompt);
                const imagePrompt = boxMatch?.imagePrompt || slot.generated.imagePrompt;

                if (imagePrompt) {
                    try {
                        notify(`🎨 Imagen 4: Anchoring Block #${slot.rank}...`);
                        const base64Image = await ImagenService.generateReferenceImage(imagePrompt);

                        // We store the specific reference image for THIS block
                        slot.generated.imageUrl = base64Image;
                        slot.media.images = [base64Image];
                    } catch (err: any) {
                        console.warn(`Imagen anchor failed for block ${slot.rank}:`, err);
                    }
                }
                slotsWithAssets.push(slot);
            }

            notify("✨ Agent Team Mission Success. Ready to Render Master Sequence.");

            return { slots: slotsWithAssets, dossier, strategy };

        } catch (error: any) {
            console.error("Orchestration Failed:", error);
            notify(`❌ Mission Failed: ${error.message}`);
            throw error;
        }
    }
}
