
import { GeminiService } from "./geminiService";

export class ImagenService {
    private static readonly MODEL_ID = 'imagen-4.0-ultra-generate-001';

    /**
     * Generates high-quality reference images using Google's Imagen model on Vertex AI.
     * This ensures Veo has a perfect visual anchor for video generation.
     * 
     * @param prompt The detailed image generation prompt.
     * @param aspectRatio The aspect ratio for the image (server default usually 1:1, but we can specifying via parameters if supported).
     * @returns The base64 encoded image string or a GCS URI if configured.
     */
    public static async generateReferenceImage(prompt: string, aspectRatio: string = "1:1"): Promise<string> {
        console.log(`🎨 ImagenService: Generating reference image for prompt: "${prompt.substring(0, 50)}..."`);

        try {
            // Auth using the shared GeminiService token handling
            const { token, projectId } = await GeminiService.getAuth();
            const location = 'us-central1';

            // Vertex AI Prediction Endpoint for Imagen
            const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${this.MODEL_ID}:predict`;

            // Construct the request body for Imagen
            // Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide
            const requestBody = {
                instances: [
                    {
                        prompt: prompt
                    }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: aspectRatio,
                    // Optional: safetySettings, negativePrompt, etc.
                    // personGeneration: "allow_adult", // Be careful with policies
                }
            };

            const data = await GeminiService.protectedFetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            // Parse the response
            // Structure: { predictions: [ { bytesBase64Encoded: string, mimeType: string } ] }
            if (data.predictions && data.predictions.length > 0) {
                const image = data.predictions[0];
                // Return as a data URL for immediate use
                return `data:${image.mimeType || 'image/png'};base64,${image.bytesBase64Encoded}`;
            } else {
                throw new Error("No predictions returned from Imagen.");
            }
        } catch (error: any) {
            console.error("Imagen Generation Failed:", error);
            throw new Error(`Imagen Service Error: ${error.message}`);
        }
    }

    /**
     * Creates a dedicated prompt for a product reference image based on its Visual DNA.
     */
    public static createVisualPrompt(productName: string, visualDna: string, description: string): string {
        return `
      Professional product photography of ${productName}.
      ${visualDna}
      Features: ${description}.
      High resolution, 8k, photorealistic, studio lighting, neutral background.
      The product should be the clear focus, centered, showing key details.
      No text, no watermarks.
    `.trim();
    }
}
