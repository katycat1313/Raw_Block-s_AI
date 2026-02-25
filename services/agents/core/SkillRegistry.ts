
import { GeminiService } from "../../geminiService";

export class AgentSkills {
    /**
     * Skill: Deep Market Intelligence
     * Scours Reddit, Forums, and Reviews for raw user data.
     */
    public static async researchMarket(productName: string, productUrl: string) {
        const prompt = `
            PERFORM DEEP MARKET INTELLIGENCE for "${productName}"
            URL: ${productUrl}

            1. Search Reddit and specialized forums for "reviews", "complaints", and "objections".
            2. Identify the "Unspoken Truths": What do people love/hate that isn't on the official page?
            3. Extract 3 high-intensity user quotes.
        `;
        return await GeminiService.completion(prompt, "You are a Market Forensic Analyst.", [{ googleSearch: {} }], true);
    }

    /**
     * Skill: Visual DNA Extraction
     * Analyzes reference material to create a CGI-ready profile.
     */
    public static async extractVisualDNA(productName: string, referenceImages: string[]) {
        const prompt = `
            ANALYZE VISUAL DNA for "${productName}"
            Focus on: Materials, Textures, Primary/Secondary Colors, Logo Placement, and Lighting Reaction.
            Create a profile for a CGI Artist.
        `;
        // This is multimodal
        return await GeminiService.completion(prompt, "You are a Precise CGI Look-Dev Artist.", [], true);
    }

    /**
     * Skill: Psychological Hooking
     * Converts raw features into emotional hooks.
     */
    public static async craftHooks(features: string[], painPoints: string[]) {
        const prompt = `
            CRAFT EMOTIONAL HOOKS
            Features: ${JSON.stringify(features)}
            Pain Points: ${JSON.stringify(painPoints)}
            
            Use 2026 viral patterns. Focus on the first 3 seconds to "Stop the Scroll".
        `;
        return await GeminiService.completion(prompt, "You are a Viral Conversion Psychologist.", [], true);
    }
}
