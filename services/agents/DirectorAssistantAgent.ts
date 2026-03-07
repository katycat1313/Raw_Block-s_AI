import { GeminiService } from "../geminiService";
import { ProductDossier } from "../../types";
import directorSkill from './skills/Director.md?raw';

export class DirectorAssistantAgent {
  public static async brainstorm(
    dossier: ProductDossier,
    strategy: any,
    directive?: any,
    qaFeedbackContext?: string
  ): Promise<string[]> {
    console.log(`📋 Director's Assistant: Designing b-roll shot library for ${dossier.productName}...`);

    const prompt = `
      ${qaFeedbackContext || ''}

      COLLECTIVE INTELLIGENCE INPUT:
      Researcher Data: ${JSON.stringify(dossier.specs)}
      Visual DNA: ${dossier.visualDna}
      Key Features: ${JSON.stringify(dossier.features.slice(0, 5))}
      Strategist Angle: ${strategy.angle}
      Target Persona: ${strategy.targetAudience}

      BOARDROOM DIRECTIVE:
      ${directive ? JSON.stringify(directive) : "Focus on premium feel, texture, and tactile moments."}

      TASK:
      Design exactly 8 independent b-roll shots for this product.
      Each shot is a standalone 2–4 second clip an editor can cut to.
      These are NOT narrative scenes — they are raw footage moments.

      SHOT DESIGN RULES:
      1. STANDALONE: Each shot must work completely on its own. No shot depends on another.
      2. VARIETY: Mix shot distances (macro, medium, wide) and angles (top-down, 3/4, eye-level, low-angle).
      3. MOTION OVER NARRATIVE: Describe a physical moment or movement, not a story beat.
      4. ATMOSPHERE OVER ACCURACY: Focus on light, texture, motion, and feel — not brand-specific details AI cannot reliably reproduce.
      5. SHORT DURATION: Each shot should feel like 2–4 seconds of footage.

      SHOT TYPE MIX (use each type at most twice):
      - HERO: Product alone, well-lit, slow push-in or hold. Premium feel.
      - MACRO: Extreme close-up on texture, material, finish, or a specific detail.
      - IN_USE: Hands naturally interacting with the product — pressing, opening, holding, adjusting.
      - REVEAL: Product entering the frame — sliding in, rising up, being set down.
      - ENVIRONMENTAL: Product in its natural context — on a desk, in a bag, in a kitchen.
      - PACKAGING: Box, sleeve, or wrapping being handled or revealed.

      SHOTS TO DESIGN (one of each, plus two extras from any type):
      - Shot 1: HERO
      - Shot 2: MACRO (highlight the Visual DNA material/texture)
      - Shot 3: IN_USE (most compelling feature: ${dossier.features[0] || 'core function'})
      - Shot 4: REVEAL
      - Shot 5: ENVIRONMENTAL
      - Shot 6: MACRO (different detail from Shot 2)
      - Shot 7: IN_USE (secondary feature: ${dossier.features[1] || 'secondary function'})
      - Shot 8: HERO (different angle from Shot 1)

      OUTPUT JSON:
      {
        "narrativeLogic": "Brief note on why this shot mix serves the ${strategy.targetAudience} audience.",
        "scenes": [
          "Shot 1 [HERO]: [2-4s description of what happens visually]",
          "Shot 2 [MACRO]: [2-4s description of what happens visually]",
          ...
        ]
      }
    `;

    return await GeminiService.completion(prompt, directorSkill, [], true);
  }
}
