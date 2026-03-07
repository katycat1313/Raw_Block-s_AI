import { GeminiService } from "../geminiService";
import { BaseAgent, AgentContext } from "./core/BaseAgent";
import { VideoSequence } from "../../types";

const QA_SKILL = "You are a meticulous Quality Assurance engineer. Your job is to review AI-generated content plans and ensure they meet all requirements of the original creative brief. You are ruthless in your pursuit of quality and alignment.";

export class QAAgent extends BaseAgent {
    constructor() {
        super("QA", "Assistant Production Manager");
    }

    private async reviewVideoPlan(context: AgentContext): Promise<{ pass: boolean; feedback: string }> {
        const dossier = context.dossier;
        const strategy = (context as any).strategy;
        const videoPlan = (context as any).videoPlan as VideoSequence;

        if (!videoPlan || !videoPlan.blocks || videoPlan.blocks.length === 0) {
            throw new Error("QAAgent Error: No video plan found in the context to review.");
        }

        const planNarrative = videoPlan.blocks.map((block, index) =>
            `Block ${index + 1} (${block.type}):\nVisuals: ${block.visualPrompt}\nNarration: ${block.audioScript}`
        ).join("\n\n");

        const prompt = `
            ATTENTION: QA ENGINEER - IMMEDIATE REVIEW REQUIRED

            CREATIVE BRIEF:
            - Product: ${dossier.productName}
            - Key Benefit: ${dossier.description || 'Not specified'}
            - Target Audience: ${strategy?.targetAudience || 'General audience'}
            - Visual DNA: ${dossier.visualDna}
            - Identified Pain Points: ${(dossier.painPoints || []).join(", ")}

            SUBMITTED VIDEO PLAN FOR REVIEW:
            ${planNarrative}

            MANDATORY QA CHECKLIST (You MUST answer Yes or No for each):
            1. Pain Point Alignment: Does the overall narrative and individual scenes directly address the identified "Pain Points"?
            2. Visual DNA Adherence: Do the scene descriptions strictly follow the "Visual DNA" guidelines without deviation?
            3. Hook Integrity: Is the first block a strong, attention-grabbing hook designed to stop scrolling?
            4. Narrative Cohesion: Does the sequence of blocks tell a logical and persuasive story from hook to call-to-action?
            5. Brand Safety: Is the content safe, accurate, and positive for the brand?

            FINAL JUDGEMENT:
            Based on your checklist, will you APPROVE or REJECT this plan?
            - If REJECT, provide specific, actionable feedback for the DirectorAgent. Point out exactly which block fails and why.
            - If APPROVE, state what you liked about the plan.
            
            Your entire response MUST be a single JSON object with the following structure: { "pass": boolean, "feedback": "string" }
            Do not include any other text or preamble.
        `;

        const response = await GeminiService.completion(prompt, QA_SKILL, [], true);
        
        return response as { pass: boolean; feedback: string };
    }

    public async execute(context: AgentContext): Promise<AgentContext> {
        this.log("Reviewing the Director's proposed video plan...");
        
        const qaResult = await this.reviewVideoPlan(context);

        if (qaResult.pass) {
            this.log(`Director's plan APPROVED. Feedback: ${qaResult.feedback}`);
            return context;
        } else {
            this.log(`Director's plan REJECTED. Feedback: ${qaResult.feedback}`);
            throw new Error(`QA Rejection: ${qaResult.feedback}`);
        }
    }
}
