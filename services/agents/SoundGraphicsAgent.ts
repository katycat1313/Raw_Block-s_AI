import { GeminiService } from "../geminiService";
import { ProductDossier, VideoSequence, BoxConfig } from "../../types";

export class SoundGraphicsAgent {
    public static async designAssets(
        rawScenes: string[],
        dossier: ProductDossier,
        strategy: any
    ): Promise<VideoSequence> {
        console.log(`🎨 Sound & Graphics: Designing assets for ${rawScenes.length} scenes...`);

        const prompt = `
      SCENE CONCEPTS:
      ${JSON.stringify(rawScenes, null, 2)}

      VISUAL DNA: ${dossier.visualDna}
      STRATEGY: ${JSON.stringify(strategy)}

      TASK:
      Convert these concepts into a production-ready Video Sequence.
      For EACH scene, write:
      1. A detailed Veo/Imagen Visual Prompt (photorealistic, 4k, specific lighting/angles).
      2. A viral Audio Script (Text-to-Speech).
      3. Assign a type (INTRO, UNBOXING, FEATURE, COMPARISON, PROBLEM_SOLUTION, OUTRO, TESTIMONIAL, AD).
      4. Estimated duration (seconds).

      OUTPUT JSON (VideoSequence format):
      {
        "title": "Creative Title",
        "goal": "${strategy.videoType}",
        "totalDuration": 60,
        "boxes": [
           // ... BoxConfig objects
        ]
      }
    `;

        const instructions = "You are an expert Sound Designer and CGI Artist. Your prompts ensure the AI generator creates perfect visuals. Your scripts are viral.";

        return await GeminiService.completion(prompt, instructions, [], true);
    }
}
