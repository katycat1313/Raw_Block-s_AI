import { DirectorAssistantAgent } from "./DirectorAssistantAgent";
import { SoundGraphicsAgent } from "./SoundGraphicsAgent";
import { ProductDossier, VideoSequence } from "../../types";

export class DirectorAgent {
    public static async produceSequence(
        dossier: ProductDossier,
        strategy: any
    ): Promise<VideoSequence> {
        console.log(`🎬 Director: Orchestrating production...`);

        // 1. Assistant Brainstorms
        const rawScenes = await DirectorAssistantAgent.brainstorm(dossier, strategy);

        // 2. Sound/Graphics Fleshes out (adds prompts/scripts)
        const sequence = await SoundGraphicsAgent.designAssets(rawScenes, dossier, strategy);

        return sequence;
    }
}
