import { ResearcherAgent } from './agents/ResearcherAgent';
import { SocialMediaAgent } from './agents/SocialMediaAgent';
import { DirectorAgent } from './agents/DirectorAgent';
import { QAAgent } from './agents/QAAgent';
import { VideoEditorAgent } from './agents/VideoEditorAgent';
import { ImagenService } from './imagenService';
import { SharedMemory } from './agents/core/SharedMemory';
import { CountdownSlot, ProductDossier, SocialStrategy, VideoSequence } from '../types';

export class AgentOrchestrator {
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
            const context: any = {
                dossier: { productName: "Pending", description: "", images: [], features: [], referenceVideoUrls: [initialVideoUrl], visualDna: "", specs: {}, reviews: [], productUrl },
                strategy: { angle: "Initial", targetAudience: "General" },
                memory: [],
                mission: "B-Roll Library: Generate Raw Product Footage Shots",
                sharedMemory: new SharedMemory(),
                onDialogue: (e: any) => logDialogue(e.agent, e.role, e.message, e.type)
            };

            notify("🕵️ Researcher Agent: Extracting Visual DNA & User Objections...");
            const researcher = new ResearcherAgent();
            await researcher.execute(context as any);
            const dossier = context.dossier;
            logDialogue("Researcher", "Visual Scout", `Investigation complete. Found ${dossier.features.length} features. Visual DNA: ${dossier.visualDna}`, "finding");
            notify(`🕵️ Researcher: Visual DNA found: "${dossier.visualDna.substring(0, 50)}..."`);

            notify("🧠 Strategist Agent: Mapping Competitive Positioning...");
            const strategyAgent = new SocialMediaAgent();
            await strategyAgent.execute(context as any);
            const strategy = context.strategy!;
            logDialogue("Strategist", "Conversion Specialist", `Selected the "${strategy.angle}" angle for ${strategy.targetAudience}. Caption drafted with ${strategy.hashtags?.length} tags.`, "thought");
            notify(`🧠 Strategist: Angle set - ${strategy.angle}. Targeting ${strategy.targetAudience}.`);

            // --- Director/QA Feedback Loop ---
            notify("🎬 Director & 🔍 QA Agents: Entering Production Loop...");
            let videoPlan: VideoSequence | null = null;
            const MAX_RETRIES = 3;

            for (let i = 0; i < MAX_RETRIES; i++) {
                notify(`🎬 Director Agent: Designing b-roll shot library (Attempt ${i + 1}/${MAX_RETRIES})...`);
                if (context.strategy.qaFeedback) {
                    logDialogue("Director", "Production Lead", `Reworking plan based on QA feedback: ${context.strategy.qaFeedback}`, 'debate');
                }

                const director = new DirectorAgent();
                videoPlan = await director.execute(context);
                context.videoPlan = videoPlan;
                logDialogue("Director", "Production Lead", `Shot list locked. ${videoPlan.blocks.length} b-roll moments planned. Submitting for QA.`, "thought");

                try {
                    notify("🔍 QA Agent: Reviewing Director's plan for quality and brand alignment...");
                    const qaAgent = new QAAgent();
                    await qaAgent.execute(context as any);
                    logDialogue("QA", "Assistant PM", "Director's plan has passed the quality check. Approved for production.", "finding");
                    notify("✅ QA Agent: Plan approved. Creative and strategic alignment confirmed.");
                    delete context.strategy.qaFeedback; // Clear feedback
                    break; // Success, exit loop
                } catch (error: any) {
                    const feedback = error.message.replace("QA Rejection: ", "");
                    context.strategy.qaFeedback = feedback;
                    logDialogue("QA", "Assistant PM", `REJECTED. Feedback for Director: ${feedback}`, 'debate');

                    if (i === MAX_RETRIES - 1) {
                        const finalError = "QA process failed after 3 retries. Halting mission.";
                        notify(`❌ Mission Failed: ${finalError}`);
                        throw new Error(finalError);
                    }
                    notify("❌ QA Agent: Plan REJECTED. Sending back to Director for rework...");
                }
            }

            if (!videoPlan || context.strategy.qaFeedback) {
                throw new Error("Failed to produce a QA-approved video plan.");
            }
            notify("🎬 Director & 🔍 QA Loop Complete. Narrative locked.");
            // --- End Loop ---

            notify("✂️ Video Editor: Assembling b-roll shot list...");
            const rawSlots = VideoEditorAgent.assembleTimeline(context.videoPlan, dossier.productName);

            notify("🎨 Imagen 4: Generating visual reference frames for each shot...");
            const slotsWithAssets: CountdownSlot[] = [];

            for (const slot of rawSlots) {
                const blockMatch = context.videoPlan.blocks.find(b => b.visualPrompt === slot.generated.videoPrompt);
                const imagePrompt = blockMatch?.imagePrompt || slot.generated.imagePrompt;

                if (imagePrompt) {
                    try {
                        notify(`🎨 Imagen 4: Generating reference frame for Shot #${slot.rank}...`);
                        const base64Image = await ImagenService.generateReferenceImage(imagePrompt);
                        slot.generated.imageUrl = base64Image;
                        slot.media.images = [base64Image];
                    } catch (err: any) {
                        console.warn(`Imagen anchor failed for block ${slot.rank}:`, err);
                    }
                }
                slotsWithAssets.push(slot);
            }

            notify("✨ Agent Team Mission Complete. B-Roll Shot Library Ready.");
            return { slots: slotsWithAssets, dossier, strategy };

        } catch (error: any) {
            console.error("Orchestration Failed:", error);
            notify(`❌ Mission Failed: ${error.message}`);
            throw error;
        }
    }
}
