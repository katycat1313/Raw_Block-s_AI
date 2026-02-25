import { GeminiService } from "../geminiService";
import { ProductDossier, VideoSequence } from "../../types";
import { GRAPHICS_DESIGNER_SKILL, AUDIO_AGENT_SKILL } from "./skills";

export class SoundGraphicsAgent {
  public static async designAssets(
    rawScenes: string[],
    dossier: ProductDossier,
    strategy: any
  ): Promise<VideoSequence> {
    console.log(`🎨 Sound & Graphics: Designing assets using advanced skills for ${rawScenes.length} scenes...`);

    const prompt = `
      SCENE CONCEPTS:
      ${JSON.stringify(rawScenes, null, 2)}

      PRODUCT CONTEXT:
      Name: ${dossier.productName}
      Visual DNA: ${dossier.visualDna}
      Pain Points: ${JSON.stringify(dossier.painPoints)}
      
      STRATEGY: ${JSON.stringify(strategy)}

      TASK:
      Utilize your specialized SKILLS to convert these concepts into a production-ready Video Sequence.
      
      For EACH scene, follow the "Imagen 4 + Veo 3.1 Hybrid Strategy":
      1. Generate a "Static Anchor" (imagePrompt) for the absolute photorealistic product look.
      2. Generate a "Motion Synthesis" (visualPrompt) for the 8-second movement arc.
      3. Apply "Script Architecting" and "Soundscape Design" for the Audio Script and SFX.
      4. Assign a type (INTRO, UNBOXING, FEATURE, COMPARISON, PROBLEM_SOLUTION, OUTRO).
      5. Duration must be exactly 8 seconds per block (unless it's an OUTRO).

      OUTPUT JSON (VideoSequence format):
      {
        "title": "Creative Title",
        "goal": "${strategy.videoType}",
        "totalDuration": 80,
        "boxes": [
           {
             "type": "string",
             "imagePrompt": "string (Ultra-high-res Imagen 4 static anchor)",
             "visualPrompt": "string (8-second Veo 3.1 motion prompt)",
             "technicalReasoning": "Why this specific camera/lighting/sound setup works for this scene and strategy.",
             "audioScript": "string (Viral TTS script)",
             "sfxDescription": "string (Environmental sounds)",
             "duration": 8,
             "lighting": "string",
             "camera": "string"
           }
        ]
      }
    `;

    const instructions = `
            ${GRAPHICS_DESIGNER_SKILL}
            
            ${AUDIO_AGENT_SKILL}
            
            You are a dual-specialist agent: an elite Graphics Designer and an Audio Architect. 
            Use the workflows, libraries, and principles defined above to ensure the highest conversion and premium quality.
        `;

    return await GeminiService.completion(prompt, instructions, [], true);
  }
}
