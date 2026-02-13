import { DirectorAssistantAgent } from "./DirectorAssistantAgent";
import { SoundGraphicsAgent } from "./SoundGraphicsAgent";
import { ProductDossier, VideoSequence } from "../../types";
import { GeminiService } from "../geminiService";

export class DirectorAgent {
    public static async produceSequence(
        dossier: ProductDossier,
        strategy: any,
        logDialogue?: (agent: string, role: string, message: string, type: string) => void
    ): Promise<VideoSequence> {
        console.log(`🎬 Director: Convening the Creative Boardroom...`);

        // 🏫 PHASE 1: THE BOARDROOM DEBATE
        // Turn 1: Researcher proposes Visual Hooks
        const hooksPrompt = `
            Dossier: ${JSON.stringify(dossier.visualDna)}
            TASK: Propose 3 unique visual "Hooks" (first 3 seconds) that showcase the product textures/materials.
            Include a "logic" field for each hook explaining why it appeals to the visual DNA.
        `;
        const proposals: any = await GeminiService.completion(hooksPrompt, "You are a Creative Producer. Output JSON with { hooks: [ { title, logic } ] }.", [], true);
        const hookSummary = proposals.hooks?.map((h: any) => `${h.title} (${h.logic})`).join(' | ') || "Standard Reveal";
        if (logDialogue) logDialogue("Researcher", "Visual Producer", `I've analyzed the Visual DNA. I propose these hooks because they highlight the product's premium materials: ${hookSummary}`, 'thought');

        // Turn 2: Strategist Critiques/Selects
        const critiquePrompt = `
            Strategy Angle: ${strategy.angle}
            Proposals: ${JSON.stringify(proposals)}
            TASK: Decide which hook best aligns with the strategy. 
            Provide "selectedHook" and a "strategicLogic" field explaining why this hook wins for the ${strategy.targetAudience} audience.
        `;
        const feedback: any = await GeminiService.completion(critiquePrompt, "You are a CMO. Output JSON with { selectedHook, strategicLogic, edits: [] }.", [], true);
        if (logDialogue) logDialogue("Strategist", "CMO", `Selection Made: ${feedback.selectedHook}. Logic: ${feedback.strategicLogic}. It addresses the core audience better than the other options.`, 'debate');

        // Turn 3: Director Synthesizes Final Directive
        const directive = {
            selectedHook: feedback.selectedHook || (proposals.hooks ? proposals.hooks[0].title : "Product Reveal"),
            edits: feedback.edits || [],
            finalVibe: `Combine ${strategy.angle} with the visual depth of ${dossier.visualDna}`
        };
        if (logDialogue) logDialogue("Director", "Executive Producer", `I agree with the Strategist. I'm locking the directive to use the ${directive.selectedHook} hook. We'll refine it by adding: ${directive.edits.join(', ') || 'no edits needed'}. Moving to storyboard creation.`, 'thought');

        // 🎬 PHASE 2: Brainstorming with Executive Directive
        const rawScenes: any = await DirectorAssistantAgent.brainstorm(dossier, strategy, directive);
        if (logDialogue) logDialogue("Assistant", "Storyboard Artist", `Storyboard draft complete. Narrative Strategy: ${rawScenes.narrativeLogic}. I've architected 10 modular blocks that follow the Director's directive specifically for ${strategy.targetAudience}.`, 'thought');

        // 🎨 PHASE 3: Technical Design
        const sequence = await SoundGraphicsAgent.designAssets(rawScenes.scenes, dossier, strategy);

        sequence.boxes.forEach((box: any, i) => {
            if (logDialogue) logDialogue("GraphicsAgent", "VFX Supervisor", `Scene ${i + 1} finalized: ${box.technicalReasoning} (Setting: ${box.camera} / ${box.lighting}).`, 'prompt');
        });

        return sequence;
    }
}
