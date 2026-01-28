import { ResearcherAgent } from './agents/ResearcherAgent';
import { SocialMediaAgent } from './agents/SocialMediaAgent';
import { DirectorAgent } from './agents/DirectorAgent';
import { VideoEditorAgent } from './agents/VideoEditorAgent';
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
        onProgress?: (status: string) => void
    ): Promise<{ slots: CountdownSlot[]; dossier: ProductDossier; strategy: SocialStrategy }> {
        const notify = (msg: string) => {
            console.log(`[Orchestrator] ${msg}`);
            if (onProgress) onProgress(msg);
        };

        try {
            // 1. Researcher Agent
            notify("🕵️ Researcher Agent: Scouring the web for product data...");
            const dossier = await ResearcherAgent.research(productUrl, initialVideoUrl);
            notify(`🕵️ Researcher: Found ${dossier.referenceVideoUrls.length} relevant videos and extracted Visual DNA.`);

            // 2. Social Media Agent
            notify("🧠 Social Media Agent: Analyzing trends & psychology...");
            const strategy = await SocialMediaAgent.developStrategy(dossier);
            notify(`🧠 Social Media: Strategy set - ${strategy.angle} (${strategy.videoType})`);

            // 3. Director Agent (orchestrates Assistant + Sound/Graphics)
            notify("🎬 Director Agent: Planning full video sequence...");
            const sequence = await DirectorAgent.produceSequence(dossier, strategy);
            notify(`🎬 Director: Sequence locked. ${sequence.boxes.length} scenes planned.`);

            // 4. Image Acquisition (Helper step)
            // We fetch images here to ensure the VideoEditor has actual assets to work with
            const fetchedImages: string[] = [];
            if (dossier.images && dossier.images.length > 0) {
                notify(`🖼️ Acquiring visual assets from ${dossier.images.length} sources...`);
                // We limit to 5 images to prevent network bottlenecks
                const imagesToFetch = dossier.images.slice(0, 5);

                for (const imgUrl of imagesToFetch) {
                    try {
                        // Note: This fetch depends on CORS policies of the source images.
                        // In a production backend, this should be proxied.
                        const response = await fetch(imgUrl).catch(() => null);
                        if (response && response.ok) {
                            const blob = await response.blob();
                            const reader = new FileReader();
                            const base64 = await new Promise<string>((resolve) => {
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(blob);
                            });
                            fetchedImages.push(base64);
                        }
                    } catch (e) {
                        console.warn("Image fetch failed (likely CORS):", imgUrl);
                    }
                }
                notify(`🖼️ Acquired ${fetchedImages.length} usable image assets.`);
            }

            // 5. Video Editor Agent
            notify("✂️ Video Editor: Cutting timeline blocks...");
            const rawSlots = VideoEditorAgent.assembleTimeline(sequence, dossier.productName);

            // Inject the fetched images into every slot's media library so they are available for generation
            const slots = rawSlots.map(s => ({
                ...s,
                media: {
                    ...s.media,
                    images: fetchedImages.length > 0 ? fetchedImages : []
                }
            }));

            notify("✨ Production Planning Complete. Ready for Rendering.");

            return { slots, dossier, strategy };

        } catch (error: any) {
            console.error("Orchestration Failed:", error);
            notify(`❌ Orchestration Error: ${error.message}`);
            throw error;
        }
    }
}
