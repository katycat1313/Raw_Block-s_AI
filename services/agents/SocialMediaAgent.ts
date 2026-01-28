import { GeminiService } from "../geminiService";
import { ProductDossier } from "../../types";

export class SocialMediaAgent {
  public static async developStrategy(dossier: ProductDossier): Promise<{
    targetAudience: string;
    videoType: string;
    psychologicalTriggers: string[];
    angle: string;
    sentimentAnalysis: string;
  }> {
    console.log(`🧠 Social Media Agent: Developing strategy for ${dossier.productName}...`);

    const prompt = `
      PRODUCT DATA (REAL RESEARCH):
      Name: ${dossier.productName}
      Description: ${dossier.description}
      Real User Reviews: ${JSON.stringify(dossier.reviews)}
      Verified Pain Points: ${JSON.stringify(dossier.painPoints)}
      Visual DNA: ${dossier.visualDna}

      YOUR MISSION:
      Use the **ACTUAL** reviews and pain points above to formulate a strategy.
      - If users complain about "Battery Life", the angle must address that.
      - If users praise "Durability", the angle must highlight that.
      
      Decide the BEST type of video to create (Review, Comparison, How-To, Troubleshooting, Ad).
      
      OUTPUT JSON:
      {
        "targetAudience": "Specific persona based on review analysis",
        "videoType": "One of: REVIEW, COMPARISON, HOW_TO, TROUBLESHOOTING, AD",
        "psychologicalTriggers": ["trigger1", "trigger2"],
        "angle": "The primary selling angle derived from REAL user feedback",
        "sentimentAnalysis": "Summary of active user sentiment (Positive/Negative/Mixed)"
      }
    `;

    const instructions = "You are a Real-Time Social Strategist. You rely on HARD DATA from the research dossier, not assumptions.";

    return await GeminiService.completion(prompt, instructions, [], true);
  }
}
