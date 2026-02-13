import { GeminiService } from "../geminiService";
import { ProductDossier } from "../../types";
import { DIRECTOR_SKILL } from "./skills";

export class DirectorAssistantAgent {
  public static async brainstorm(dossier: ProductDossier, strategy: any, directive?: any): Promise<string[]> {
    console.log(`📋 Director's Assistant: Brainstorming modular 8-second blocks for ${dossier.productName}...`);

    const prompt = `
      COLLECTIVE INTELLIGENCE INPUT:
      Researcher Data: ${JSON.stringify(dossier.specs)}
      Visual DNA: ${dossier.visualDna}
      Pain Points: ${JSON.stringify(dossier.painPoints)}
      Strategist Angle: ${strategy.angle}
      Target Persona: ${strategy.targetAudience}

      BOARDROOM DIRECTIVE (MANDATORY):
      ${directive ? JSON.stringify(directive) : "Maintain high visual intensity and luxury feel."}

      TASK:
      Brainstorm exactly 10 independent "Video Blocks". Each block will be generated as a separate 8-second video.
      
      MANDATORY BRAINSTORMING RULES:
      1. THE STORY THREAD: Create a sequential narrative where Block 1 Hooks, Blocks 2-8 Demonstrate, Block 9 Closes, and Block 10 brands.
      2. VISUAL DNA LOCK: Every scene MUST describe the product using the EXACT Visual DNA provided. No hallucinations.
      3. MODULARITY: Each block must be self-contained (logical start/stop) but visually flow into the next.
      4. DIRECTIVE ALIGNMENT: Block 1 MUST exactly match the "selectedHook" and "edits" decided in the boardroom.
      
      SCENE MAP:
      - Block 1: The Pattern Interrupt Hook.
      - Block 2: The "Pain Point" Reveal.
      - Block 3-5: The Product Hero Shots (using Features: ${JSON.stringify(dossier.features.slice(0, 3))}).
      - Block 6: The "Visual DNA" close-up (Macro Texture).
      - Block 7: The Lifestyle Proof.
      - Block 8: The Objection Handler.
      - Block 9: The Viral Call-to-Action.
      - Block 10: The Logo/Outro.

      OUTPUT JSON:
      {
        "narrativeLogic": "Explanation of how these 10 blocks flow from the Hook to the CTA based on the Strategist's angle.",
        "scenes": [
          "Block 1: [8s concept focusing on hook]",
          "Block 2: [8s concept focusing on problem]",
          ...
        ]
      }
    `;

    return await GeminiService.completion(prompt, DIRECTOR_SKILL, [], true);
  }
}
