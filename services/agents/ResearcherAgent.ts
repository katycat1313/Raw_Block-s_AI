import { GeminiService } from "../geminiService";
import { ProductDossier } from "../../types";

export class ResearcherAgent {
    public static async research(productUrl: string, initialVideoUrl: string): Promise<ProductDossier> {
        console.log(`🕵️ Researcher: Analyzing ${productUrl} and ${initialVideoUrl}...`);

        const prompt = `
      RESEARCH TARGET:
      Product URL: ${productUrl}
      Reference Video: ${initialVideoUrl}

      YOUR MISSION:
      You are not simulating research. You are executing REAL research using the Google Search tool.
      
      1. ACCESS THE PRODUCT URL: Extract the EXACT Product Name, accurate Description, Real Pricing, and Technical Specs.
         - COPY 3 actual user reviews verbatim (if available).
         - EXTRACT 3 specific "Pain Points" mentioned in negative reviews or FAQ sections.
      
      2. ANALYZE THE REFERENCE VIDEO: Identify the "Visual DNA" (colors, materials, lighting style, camera movement).
      
      3. FIND COMPLEMENTARY VIDEOS (CRITICAL):
         - Use Google Search to find at least 2 other REAL videos (YouTube/TikTok) about THIS SPECIFIC PRODUCT.
         - VALIDATE they are for the same product.
         - EXTRACT the actual URLs.
         - If you cannot verify a URL is real and relevant, DO NOT include it.
      
      4. VISUAL DNA COMPILATION:
         - Describe the product's physical appearance in detail for the CGI artist (Material, Finish, Logo Placement).

      OUTPUT JSON:
      {
        "productName": "Exact Name from Page",
        "description": "Real description from page",
        "images": ["real_image_url_1", "real_image_url_2"],
        "features": ["feature 1", "feature 2"],
        "referenceVideoUrls": ["found_video_url_1", "found_video_url_2"],
        "visualDna": "Detailed visual description...",
        "specs": {"key": "value"},
        "reviews": ["Real quote 1", "Real quote 2"],
        "painPoints": ["Real pain point 1", "Real pain point 2"],
        "pricePoint": "$XX.XX"
      }
    `;

        const instructions = `You are a Fact-Based Researcher. NO SIMULATIONS. NO PLACEHOLDERS.
    - You must use the 'googleSearch' tool to visit the URL and find 3rd party videos.
    - VERIFY every piece of data.
    - If you can't find extra videos, return an empty list for 'referenceVideoUrls', do NOT invent fake YouTube links.`;

        try {
            const result = await GeminiService.completion(prompt, instructions, [{ googleSearch: {} }], true);

            // Ensure the initial video is in the list
            const videos = new Set(result.referenceVideoUrls || []);
            videos.add(initialVideoUrl);

            return {
                ...result,
                referenceVideoUrls: Array.from(videos)
            } as ProductDossier;
        } catch (e) {
            console.error("Researcher Failed:", e);
            // Fallback if AI fails
            return {
                productName: "Unknown Product",
                description: "Research failed",
                images: [],
                features: [],
                referenceVideoUrls: [initialVideoUrl],
                visualDna: "Generic",
                specs: {},
                reviews: []
            };
        }
    }
}
