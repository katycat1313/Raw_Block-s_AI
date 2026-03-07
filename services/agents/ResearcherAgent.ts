import { GeminiService } from "../geminiService";
import { ProductDossier } from "../../types";
import { BaseAgent, AgentContext } from "./core/BaseAgent";
import { SharedMemory } from "./core/SharedMemory";

export class ResearcherAgent extends BaseAgent {
    constructor() {
        super("Researcher", "Fact-Based Market Analyst");
    }

    private getSkill(): string {
        return `# Market Researcher Skill

An expert in digital scavenging and sentiment forensics. This skill transforms a simple URL into a comprehensive dossier of user desire, objections, and competitive gaps.

## Core Workflows

### Workflow 1: Visual DNA Extraction
1. **Material Identification**: Extract the exact materials (Aluminium, Vegan Leather, Gorilla Glass).
2. **Color Profile**: Identify the SKU colors and their specific finishes (Matte, High Gloss, Iridescent).
3. **Form Factor**: Map the physical dimensions and design language (Minimalist, Industrial, Brutalist).

### Workflow 2: Sentiment Forensics
1. **Reddit/Forum Scraping**: Find "unfiltered" reviews and complaints.
2. **The "Unspoken Truth"**: Identify what the official marketing *doesn't* say.
3. **Objection Mapping**: List the top 3 reasons people *don't* buy.
`;
    }

    /**
     * Skill: Product Discovery
     */
    private async discoverProduct(url: string, videoUrl: string) {
        const researcherSkill = this.getSkill();
        const prompt = `
            DEEP SCAN: ${url}
            VIDEO: ${videoUrl}
            
            TASK:
            1. Extract core specs.
            2. Identify visual attributes (Visual DNA).
            3. Find 2 extra UGC videos on YouTube/TikTok for this product.

            OUTPUT FORMAT (MANDATORY JSON ONLY):
            {
                "productName": "string",
                "description": "string",
                "visualDna": "string (Detailed material/color/form description)",
                "features": ["string"],
                "specs": { "key": "value" },
                "referenceVideoUrls": ["string"]
            }
        `;
        return await GeminiService.completion(prompt, researcherSkill + "\n\nCRITICAL: You MUST respond with ONLY a valid JSON object. No conversational text, no 'Okay I will scan...', just raw JSON.", [{ googleSearch: {} }], true);
    }

    /**
     * Skill: Sentiment Analysis
     */
    private async analyzeSentiment(productName: string) {
        const researcherSkill = this.getSkill();
        const prompt = `
            SEARCH: "${productName} reviews reddit"
            Find why people DISLIKE this product. What are the specific pain points?

            OUTPUT FORMAT (MANDATORY JSON ONLY):
            {
                "painPoints": ["string"],
                "reviews": ["string (actual quotes or summaries)"],
                "sentimentScore": number (0-100)
            }
        `;
        return await GeminiService.completion(prompt, researcherSkill + "\n\nCRITICAL: You MUST respond with ONLY a valid JSON object. No conversational text.", [{ googleSearch: {} }], true);
    }

    public async execute(context: AgentContext): Promise<AgentContext> {
        this.log(`Starting Research Mission for ${context.dossier.productUrl}...`);
        if (context.onDialogue) context.onDialogue({ agent: this.name, role: this.role, message: `Starting comprehensive scan of ${context.dossier.productUrl} and analysis of reference video...`, type: 'finding' });

        // 1. Initial Discovery
        const facts = await this.discoverProduct(context.dossier.productUrl, context.dossier.referenceVideoUrls[0]);
        if (context.onDialogue) context.onDialogue({ agent: this.name, role: this.role, message: `Product Scan Complete: Identified "${facts.productName}". Visual DNA: "${facts.visualDna}". Key Features found: ${facts.features.slice(0, 3).join(', ')}...`, type: 'finding' });

        // 2. Sentiment Analysis (Now handled by global throttler)
        if (context.onDialogue) context.onDialogue({ agent: this.name, role: this.role, message: `Consulting Reddit and consumer forums to identify real-world objections for ${facts.productName}...`, type: 'thought' });
        const sentiment = await this.analyzeSentiment(facts.productName);
        if (context.onDialogue) context.onDialogue({ agent: this.name, role: this.role, message: `Analysis Finished. Buyer objections identified: ${sentiment.painPoints.join(', ')}. Sentiment Score: ${sentiment.sentimentScore}/100.`, type: 'finding' });

        // 3. Update Dossier
        context.dossier = {
            ...context.dossier,
            ...facts,
            visualDna: typeof facts.visualDna === 'string' ? facts.visualDna : JSON.stringify(facts.visualDna),
            painPoints: sentiment.painPoints || [],
            reviews: sentiment.reviews || []
        };

        // 4. Record to Memory for other agents
        (context as any).sharedMemory?.record(this.name, `Extracted Visual DNA: "${facts.visualDna}". Identified key objections: ${JSON.stringify(sentiment.painPoints)}`, {
            facts,
            sentiment
        });

        return context;
    }

    // Keep static for legacy support for now
    public static async research(productUrl: string, initialVideoUrl: string): Promise<ProductDossier> {
        const instance = new ResearcherAgent();
        const memory = new SharedMemory();
        const context: AgentContext = {
            dossier: { productName: "Pending", description: "", images: [], features: [], referenceVideoUrls: [initialVideoUrl], visualDna: "", specs: {}, reviews: [], productUrl: productUrl },
            memory: [],
            mission: "Initial Research"
        };
        const result = await instance.execute(context as any);
        return result.dossier;
    }
}
