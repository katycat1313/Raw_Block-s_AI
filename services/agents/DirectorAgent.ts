import { BaseAgent, AgentContext } from "./core/BaseAgent";
import { DirectorAssistantAgent } from "./DirectorAssistantAgent";
import { SoundGraphicsAgent } from "./SoundGraphicsAgent";
import { VideoSequence } from "../../types";
import { GeminiService } from "../geminiService";

export class DirectorAgent extends BaseAgent {
    constructor() {
        super("Director", "Executive Producer");
    }

    public async execute(context: AgentContext): Promise<VideoSequence> {
        this.log("Convening the Creative Boardroom...");

        const { dossier, strategy, onDialogue } = context;

        // --- QA Feedback Integration ---
        const qaFeedbackContext = strategy.qaFeedback 
            ? `
            🚨 CRITICAL REJECTION NOTICE FROM QA 🚨
            The previous plan was REJECTED for the following reason: "${strategy.qaFeedback}".
            You MUST generate a NEW and DIFFERENT set of scenes that explicitly fixes this feedback.
            Do NOT repeat the mistake. Your top priority is to satisfy the QA's concerns.
            `
            : "";

        // 🏫 PHASE 1: THE BOARDROOM DEBATE
        const hooksPrompt = `
            Dossier: ${JSON.stringify(dossier.visualDna)}
            TASK: Propose 3 unique visual "Hooks" (first 3 seconds) that showcase the product textures/materials.
            Include a "logic" field for each hook explaining why it appeals to the visual DNA.
        `;
        const proposals: any = await GeminiService.completion(hooksPrompt, "You are a Creative Producer. Output JSON with { hooks: [ { title, logic } ] }.", [], true);
        const hookSummary = proposals.hooks?.map((h: any) => `${h.title} (${h.logic})`).join(' | ') || "Standard Reveal";
        if (onDialogue) onDialogue({ agent: "Researcher", role: "Visual Producer", message: `I've analyzed the Visual DNA. I propose these hooks because they highlight the product's premium materials: ${hookSummary}`, type: 'thought' });

        const critiquePrompt = `
            Strategy Angle: ${strategy.angle}
            Proposals: ${JSON.stringify(proposals)}
            TASK: Decide which hook best aligns with the strategy. 
            Provide "selectedHook" and a "strategicLogic" field explaining why this hook wins for the ${strategy.targetAudience} audience.
        `;
        const feedback: any = await GeminiService.completion(critiquePrompt, "You are a CMO. Output JSON with { selectedHook, strategicLogic, edits: [] }.", [], true);
        if (onDialogue) onDialogue({ agent: "Strategist", role: "CMO", message: `Selection Made: ${feedback.selectedHook}. Logic: ${feedback.strategicLogic}. It addresses the core audience better than the other options.`, type: 'debate' });

        const directive = {
            selectedHook: feedback.selectedHook || (proposals.hooks ? proposals.hooks[0].title : "Product Reveal"),
            edits: feedback.edits || [],
            finalVibe: `Combine ${strategy.angle} with the visual depth of ${dossier.visualDna}`
        };
        if (onDialogue) onDialogue({ agent: this.name, role: this.role, message: `I agree with the Strategist. I'm locking the directive to use the ${directive.selectedHook} hook. We'll refine it by adding: ${directive.edits.join(', ') || 'no edits needed'}. Moving to storyboard creation.`, type: 'thought' });

        // 🎬 PHASE 2: Brainstorming with Executive Directive & QA Feedback
        const rawScenes: any = await DirectorAssistantAgent.brainstorm(dossier, strategy, directive, qaFeedbackContext);
        if (onDialogue) onDialogue({ agent: "Assistant", role: "Storyboard Artist", message: `Storyboard draft complete. Narrative Strategy: ${rawScenes.narrativeLogic}. I've architected 10 modular blocks that follow the Director's directive specifically for ${strategy.targetAudience}.`, type: 'thought' });

        // 🎨 PHASE 3: Technical Design
        const sequence = await SoundGraphicsAgent.designAssets(rawScenes.scenes, dossier, strategy);

        sequence.blocks.forEach((block: any, i) => {
            if (onDialogue) onDialogue({ agent: "GraphicsAgent", role: "VFX Supervisor", message: `Scene ${i + 1} finalized: ${block.technicalReasoning} (Setting: ${block.camera} / ${block.lighting}).`, type: 'prompt' });
        });

        return sequence;
    }
}
