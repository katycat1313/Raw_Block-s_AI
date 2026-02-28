import { Type } from "@google/genai";

// Types for Vertex AI Responses
interface VertexResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    };
  }>;
  error?: any;
}

export class GeminiService {
  private static tokenCache: { token: string; projectId: string; expires: number } | null = null;

  public static async getAuth() {
    if (this.tokenCache && Date.now() < this.tokenCache.expires) {
      return { token: this.tokenCache.token, projectId: this.tokenCache.projectId };
    }
    try {
      const res = await fetch('/api/auth/token');
      if (!res.ok) throw new Error("Failed to fetch auth token from proxy");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      this.tokenCache = {
        token: data.token,
        projectId: data.projectId,
        expires: Date.now() + (50 * 60 * 1000)
      };
      return data;
    } catch (e: any) {
      console.error("Auth Error:", e);
      throw new Error(`Authentication failed: ${e.message}`);
    }
  }

  private static async callVertex(model: string, method: 'generateContent' | 'predict', payload?: any): Promise<any> {
    const { token, projectId } = await this.getAuth();
    const location = 'us-central1'; // Or your desired region
    const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:${method}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error (${response.status}): ${errText}`);
    }

    return response.json();
  }

  // Public wrapper for Agents to use
  public static async completion(
    prompt: string,
    systemInstruction: string,
    tools: any[] = [],
    jsonMode: boolean = true
  ): Promise<any> {
    const ai = this.getAI();
    const mimeType = jsonMode ? "application/json" : "text/plain";

    const PRIMARY_MODEL = 'gemini-2.0-flash-exp';
    const FALLBACK_MODEL = 'gemini-1.5-flash';

    try {
      const response = await ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: tools,
        generationConfig: { responseMimeType: mimeType }
      });

      if (!response.text) throw new Error("Agent completion returned no data.");
      return jsonMode ? this.parseGenAIResponse(response.text) : response.text;
    } catch (err: any) {
      const errorMessage = err.message?.toLowerCase() || '';
      // Check for quota (429) or internal server (500) errors to trigger fallback
      if (errorMessage.includes('429') || errorMessage.includes('500') || errorMessage.includes('quota') || errorMessage.includes('internal')) {
        console.warn(`[Model Fallback] Primary model (${PRIMARY_MODEL}) failed (${err.message}). Failing over to ${FALLBACK_MODEL}...`);

        const fallbackResponse = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: tools,
          generationConfig: { responseMimeType: mimeType }
        });

        if (!fallbackResponse.text) throw new Error("Fallback completion returned no data.");
        return jsonMode ? this.parseGenAIResponse(fallbackResponse.text) : fallbackResponse.text;
      }

      console.error("Agent Completion Error:", err);
      throw err;
    }
  }

  private static getAI() {
    return {
      models: {
        generateContent: async (params: { model: string, contents: any[], systemInstruction?: any, tools?: any, generationConfig?: any }) => {
          const body: any = {
            contents: params.contents,
            system_instruction: params.systemInstruction,
            tools: params.tools,
            generation_config: params.generationConfig
          };

          const res = await GeminiService.callVertex(params.model, 'generateContent', body);
          return {
            text: res.candidates?.[0]?.content?.parts?.[0]?.text
          };
        }
      }
    };
  }

  private static parseGenAIResponse(text: string): any {
    const regex = /```(json)?(.*)```/s;
    const match = text.match(regex);
    if (match && match[2]) {
      try {
        return JSON.parse(match[2]);
      } catch (e) {
        console.error("Failed to parse extracted JSON:", e);
        throw new Error("AI response was not valid JSON despite being instructed.");
      }
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse raw AI response as JSON:", text);
      throw new Error("AI response was not valid JSON.");
    }
  }
}
