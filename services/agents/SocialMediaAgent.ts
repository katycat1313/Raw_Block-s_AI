import { GeminiService } from "../geminiService";
import { SocialStrategy } from "../../types";
import { BaseAgent, AgentContext } from "./core/BaseAgent";
import socialStrategistSkill from './skills/SocialStrategist.md?raw';
import productStrategistSkill from './skills/ProductStrategist.md?raw';

export class SocialMediaAgent extends BaseAgent {
  constructor() {
    super("SocialStrategist", "Viral Marketing & Psychology Expert");
  }

  private getSkills(): string {
    return socialStrategistSkill + '\n' + productStrategistSkill;
  }

  public async execute(context: AgentContext): Promise<AgentContext> {
    this.log(`Building conversion strategy for ${context.dossier.productName}...`);
    if (context.onDialogue) context.onDialogue({ agent: this.name, role: this.role, message: `Analyzing dossier for ${context.dossier.productName} to select the optimal buying angle and social strategy...`, type: 'thought' });

    const skills = this.getSkills();
    const prompt = `
      PRODUCT DOSSIER:
      - Product: ${context.dossier.productName}
      - Description: ${context.dossier.description}
      - Visual DNA: ${context.dossier.visualDna}
      - Key Features: ${JSON.stringify(context.dossier.features)}
      - Pain Points: ${JSON.stringify(context.dossier.painPoints)}

      TASK:
      Using your Social Strategist and Product Strategist skills, build a complete social media strategy.
      Select the best psychological "Buying Angle" for this product and audience.
      Draft a viral caption with hashtags optimized for maximum reach.

      OUTPUT FORMAT (MANDATORY JSON ONLY):
      {
        "angle": "string (e.g. The Instant Solution / The Lifestyle Upgrade / The FOMO Urgency)",
        "targetAudience": "string (specific micro-audience description)",
        "videoType": "string (e.g. ASMR Unboxing, POV Review, Before/After)",
        "psychologicalTriggers": ["string"],
        "caption": "string (viral ready caption)",
        "hashtags": ["string"],
        "firstComment": "string",
        "bestTime": "string",
        "sentimentAnalysis": "string"
      }
    `;

    const strategy: SocialStrategy = await GeminiService.completion(prompt, skills + "\n\nCRITICAL: You MUST respond with ONLY a valid JSON object. No extra text.", [], true);

    if (context.onDialogue) context.onDialogue({ agent: this.name, role: this.role, message: `Strategy locked: "${strategy.angle}" angle targeting "${strategy.targetAudience}". Psychological triggers: ${strategy.psychologicalTriggers?.join(', ')}.`, type: 'finding' });

    context.strategy = { ...context.strategy, ...strategy };
    return context;
  }
}
