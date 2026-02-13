
import { GeminiService } from "../geminiService";
import { ProductDossier, SocialStrategy } from "../../types";
import { BaseAgent, AgentContext } from "./core/BaseAgent";

export class SocialMediaAgent extends BaseAgent {
  constructor() {
    super("SocialStrategist", "Viral Marketing & Psychology Expert");
  }

  /**
   * Skill: Psychological Angle Mapping
   */
  private async mapAngle(dossier: ProductDossier) {
    const prompt = `
            STRATEGY BRIEF:
            Product: ${dossier.productName}
            Pain Points: ${JSON.stringify(dossier.painPoints)}
            
            TASK: Pick the #1 psychological trigger (FOMO, Authority, Solution, Aspiration).

            OUTPUT FORMAT (MANDATORY JSON ONLY):
            {
                "angle": "string",
                "targetAudience": "string",
                "caption": "string",
                "hashtags": ["string"],
                "firstComment": "string",
                "bestTime": "string"
            }
        `;
    return await GeminiService.completion(prompt, "You are a Master of Conversion Psychology. Respond ONLY with raw JSON.", [], true);
  }

  public async execute(context: AgentContext): Promise<AgentContext> {
    this.log(`Developing viral strategy for ${context.dossier.productName}...`);
    if (context.onDialogue) context.onDialogue({ agent: this.name, role: this.role, message: `Analyzing product specs and user objections to map the perfect psychological trigger for ${context.dossier.productName}...`, type: 'thought' });

    // 1. Map the angle
    const strategyData = await this.mapAngle(context.dossier);

    // 🕵️ EXTRA VALIDATION: Stop "undefined" leakage
    if (!strategyData || typeof strategyData !== 'object' || !strategyData.angle) {
      console.error("Strategist Fail: Invalid response format.", strategyData);
      const rawSnippet = JSON.stringify(strategyData).substring(0, 100);
      throw new Error(`Social Strategist failed. Output: ${rawSnippet}. Please retry.`);
    }

    if (context.onDialogue) context.onDialogue({ agent: this.name, role: this.role, message: `Strategy Locked: Selected "${strategyData.angle}" targeting ${strategyData.targetAudience}. Drafting conversion copy now.`, type: 'finding' });

    // 2. Update Strategy
    context.strategy = {
      ...context.strategy,
      ...strategyData
    } as SocialStrategy;

    // 3. Record to Memory
    (context as any).sharedMemory?.record(this.name, `Selected Angle: "${strategyData.angle}". Strategy targets: ${strategyData.targetAudience}`, {
      strategy: strategyData
    });

    return context;
  }

  // Legacy static support
  public static async developStrategy(dossier: ProductDossier): Promise<SocialStrategy> {
    const instance = new SocialMediaAgent();
    const context: AgentContext = {
      dossier,
      memory: [],
      mission: "Develop Strategy"
    };
    const result = await instance.execute(context as any);
    return result.strategy!;
  }
}
