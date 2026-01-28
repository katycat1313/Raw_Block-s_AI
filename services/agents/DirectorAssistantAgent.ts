import { GeminiService } from "../geminiService";
import { ProductDossier } from "../../types";

export class DirectorAssistantAgent {
  public static async brainstorm(dossier: ProductDossier, strategy: any): Promise<string[]> {
    console.log(`📋 Director's Assistant: Brainstorming scenes for ${dossier.productName}...`);

    const prompt = `
      PROJECT DATA:
      Product: ${dossier.productName}
      Features: ${JSON.stringify(dossier.features)}
      Visual DNA: ${dossier.visualDna}
      Video Type: ${strategy.videoType}
      Angle: ${strategy.angle}
      Target Audience: ${strategy.targetAudience}

      TASK:
      Create exactly 10 distinct, sequential scene concepts (Boxes).
      CRITICAL: You must use the ACTUAL PRODUCT FEATURES in the Visual DNA. (e.g., if Visual DNA says "Silver finish", DO NOT say "Red finish").
      
      The flow must be logical:
      1. Hook (0-3s)
      2. Problem/Intro
      3. Feature 1 Demo (Real feature: ${dossier.features[0] || 'Key Feature'})
      4. Feature 2 Demo (Real feature: ${dossier.features[1] || 'Secondary Feature'})
      5. Application/UseCase
      6. Social Proof/Testimonial
      7. Objection Handling (Address: ${dossier.painPoints?.[0] || 'Common concern'})
      8. Value Stack
      9. CTA
      10. Outro logo

      OUTPUT JSON:
      {
        "scenes": [
          "Scene 1: [Detailed concept using Visual DNA]",
          ...
        ]
      }
    `;

    const instructions = "You are a specialized Assistant Director. You plan scenes based on PHYSICAL REALITY of the product.";

    const result = await GeminiService.completion(prompt, instructions, [], true);
    return result.scenes || [];
  }
}
