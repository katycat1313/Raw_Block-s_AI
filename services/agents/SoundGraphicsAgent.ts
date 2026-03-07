import { GeminiService } from "../geminiService";
import { ProductDossier, VideoSequence } from "../../types";
import graphicsDesignerSkill from './skills/GraphicsDesigner.md?raw';
import audioAgentSkill from './skills/AudioAgent.md?raw';

export class SoundGraphicsAgent {
  public static async designAssets(
    rawScenes: string[],
    dossier: ProductDossier,
    strategy: any
  ): Promise<VideoSequence> {
    console.log(`🎨 Sound & Graphics: Designing assets using advanced skills for ${rawScenes.length} scenes...`);

    const prompt = `
      SHOT CONCEPTS:
      ${JSON.stringify(rawScenes, null, 2)}

      PRODUCT CONTEXT:
      Name: ${dossier.productName}
      Visual DNA: ${dossier.visualDna}

      STRATEGY: ${JSON.stringify(strategy)}

      TASK:
      Convert these b-roll shot concepts into production-ready shot specifications.

      For EACH shot:
      1. Write a "imagePrompt" (Imagen 4) — a photorealistic still frame showing exactly what the shot looks like at its peak moment.
      2. Write a "visualPrompt" (Runway) — a short, motion-focused description for a 2–4 second clip. Describe ONLY what moves and how. Keep it under 60 words.
      3. Assign the correct shot type: HERO, MACRO, IN_USE, REVEAL, ENVIRONMENTAL, or PACKAGING.
      4. Set duration to 3 seconds (use 4 for IN_USE shots that need more time for the action).
      5. Specify lighting and camera angle clearly.

      RUNWAY PROMPT GUIDELINES:
      - Lead with the motion: "Slow push-in to..." / "Macro lens glides across..." / "Hand reaches in and..."
      - Describe light quality: soft diffused, hard rim, warm golden, cool studio
      - No narrative. No story. Just what the camera sees moving.
      - Do NOT reference specific brand names, logos, or text — these will hallucinate.

      OUTPUT JSON (VideoSequence format):
      {
        "title": "B-Roll Library: ${dossier.productName}",
        "goal": "b-roll footage library",
        "totalDuration": 24,
        "blocks": [
           {
             "type": "HERO | MACRO | IN_USE | REVEAL | ENVIRONMENTAL | PACKAGING",
             "imagePrompt": "string (Imagen 4 still frame — photorealistic, describes the exact composition)",
             "visualPrompt": "string (Runway motion prompt — under 60 words, leads with the motion)",
             "technicalReasoning": "Why this shot type and setup serves the target audience.",
             "audioScript": "",
             "sfxDescription": "string (ambient sound that would accompany this shot — optional)",
             "duration": 3,
             "lighting": "string",
             "camera": "string"
           }
        ]
      }
    `;

    const instructions = `
            ${graphicsDesignerSkill}
            
            ${audioAgentSkill}
            
            You are a dual-specialist agent: an elite Graphics Designer and an Audio Architect. 
            Use the workflows, libraries, and principles defined above to ensure the highest conversion and premium quality.
        `;

    return await GeminiService.completion(prompt, instructions, [], true);
  }
}
