import { Type, Modality } from "@google/genai";
import { ProductDetails, OptimizedPrompt, Platform, AspectRatio, AssetVariation } from "../types";

// Types for Vertex AI Responses
interface VertexResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    };
  }>;
  text?: string;
  predictions?: any[];
  error?: any;
  name?: string; // For Operations
  done?: boolean;
  response?: any;
}

export class GeminiService {
  private static tokenCache: { token: string; projectId: string; expires: number } | null = null;
  private static lastRequestPromise: Promise<void> = Promise.resolve();

  // 🌍 High-Availability Config
  private static readonly REGIONS = ['us-central1', 'europe-west1', 'asia-northeast1'];
  private static currentRegionIndex = 0;
  private static readonly MIN_GAP_BASE = 12000;
  private static backoffPenalty = 0; // Dynamic additional wait time
  private static readonly FALLBACK_MODEL = 'gemini-1.5-flash';
  private static readonly PRIMARY_MODEL = 'gemini-2.0-flash-exp';

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

  /**
   * Global protective throttler shared by ALL services.
   * Features: Atomic Queueing, Priority, Exponential Backoff with Jitter.
   */
  public static async protectedFetch(url: string, options: any, priority: 'user' | 'agent' = 'agent', maxRetries = 5): Promise<any> {
    let result: any;
    let error: any;

    // 🚦 ATOMIC QUEUE: Hold the lock until the request is DONE
    const currentPromise = this.lastRequestPromise.then(async () => {
      // 1. Adaptive Gap: Base + User Priority + Backoff Penalty
      const baseGap = priority === 'user' ? this.MIN_GAP_BASE / 2 : this.MIN_GAP_BASE;
      const totalGap = baseGap + this.backoffPenalty;

      if (this.backoffPenalty > 0) {
        console.info(`[Pacing] Throttling active: Adding ${Math.round(this.backoffPenalty / 1000)}s penalty to gap.`);
      }

      await new Promise(r => setTimeout(r, totalGap));

      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          const response = await fetch(url, options);

          if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) {
              // 📈 Increase penalty on 429
              this.backoffPenalty = Math.min(this.backoffPenalty + 5000, 60000);

              attempt++;
              if (attempt < maxRetries) {
                // 🎲 Jittered Backoff: prevents "thundering herd" pattern
                const jitter = Math.random() * 2000;
                const backoff = (Math.pow(2, attempt + 1) * 1000) + jitter;
                console.warn(`[Quota Protection] 429 detected. Cooling down for ${Math.round(backoff / 1000)}s (Attempt ${attempt}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, backoff));
                continue;
              }
              throw new Error("Quota Exhausted (429) after multiple retries.");
            }
            throw new Error(`API Error (${response.status}): ${errText}`);
          }

          result = await response.json();
          // 📉 Decrease penalty on success
          this.backoffPenalty = Math.max(0, this.backoffPenalty - 2000);
          return;
        } catch (e: any) {
          if (attempt === maxRetries - 1 || !e.message?.includes("429")) {
            error = e;
            return;
          }
          attempt++;
          const jitter = Math.random() * 1000;
          await new Promise(r => setTimeout(r, (Math.pow(2, attempt) * 1000) + jitter));
        }
      }
    });

    this.lastRequestPromise = currentPromise.catch(() => { });
    await currentPromise;

    if (error) throw error;
    return result;
  }

  private static async callVertex(model: string, method: 'generateContent' | 'predict' | 'getOp', payload?: any): Promise<any> {
    const { token, projectId } = await this.getAuth();

    // 🌍 REGIONAL ROTATION: Cycle through locations to shard quota
    const location = this.REGIONS[this.currentRegionIndex];
    this.currentRegionIndex = (this.currentRegionIndex + 1) % this.REGIONS.length;

    let url = '';
    if (method === 'getOp') {
      url = `https://${location}-aiplatform.googleapis.com/v1beta1/${payload}`;
    } else {
      url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:${method}`;
    }

    const priority = (payload?.contents?.[0]?.parts?.[0]?.text?.length > 1000) ? 'agent' : 'user';

    return await this.protectedFetch(url, {
      method: method === 'getOp' ? 'GET' : 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: method === 'getOp' ? undefined : JSON.stringify(payload)
    }, priority);
  }

  // Public wrapper for Agents to use
  public static async completion(
    prompt: string,
    systemInstruction: string,
    tools: any[] = [],
    jsonMode: boolean = true
  ): Promise<any> {
    const ai = this.getAI();

    // Vertex AI limitation: Cannot use 'responseMimeType: application/json' (Controlled Generation) combined with Google Search tool.
    // workaround: Disable JSON enforcement at API level if search is active, but still parse manually.
    const hasSearch = tools.some((t: any) => t.googleSearch !== undefined);
    const mimeType = (jsonMode && !hasSearch) ? "application/json" : "text/plain";

    // Strength requirement for JSON if we can't enforce at API level
    const effectiveSystemPrompt = jsonMode && hasSearch
      ? `${systemInstruction}\n\nSTRICT REQUIREMENT: YOUR RESPONSE MUST BE A VALID JSON OBJECT. DO NOT INCLUDE ANY PREAMBLE, EXPLANATION, OR CHAT. ONLY OUTPUT RAW JSON.`
      : systemInstruction;

    // STAGE 1: Attempt Primary High-Performance Model (2.0-flash-exp)
    try {
      const response = await ai.models.generateContent({
        model: this.PRIMARY_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: tools,
          systemInstruction: effectiveSystemPrompt,
          responseMimeType: mimeType
        } as any
      });

      if (!response.text) throw new Error("Agent completion returned no data.");
      return jsonMode ? this.parseGenAIResponse(response.text) : response.text;
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("Quota")) {
        console.warn(`[Model Fallback] Primary model (${this.PRIMARY_MODEL}) quota exceeded. Failing over to ${this.FALLBACK_MODEL}...`);

        // STAGE 2: Fallback to battle-tested 1.5-flash with high quota pool
        const fallbackResponse = await ai.models.generateContent({
          model: this.FALLBACK_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            tools: tools,
            systemInstruction: effectiveSystemPrompt,
            responseMimeType: mimeType
          } as any
        });

        if (!fallbackResponse.text) throw new Error("Fallback completion returned no data.");
        return jsonMode ? this.parseGenAIResponse(fallbackResponse.text) : fallbackResponse.text;
      }

      console.error("Agent Completion Error:", err);
      throw err;
    }
  }

  // Shim to match the GoogleGenAI SDK style for existing code
  private static getAI() {
    return {
      models: {
        generateContent: async (params: { model: string, contents: any[], config?: any }) => {
          // Map SDK params to Vertex REST format
          // SDK: systemInstruction -> REST: system_instruction
          // SDK: config -> REST: generation_config
          // SDK: tools -> REST: tools
          const body: any = {
            contents: params.contents.map(c => ({
              role: c.role,
              parts: c.parts.map((p: any) => p.text ? { text: p.text } : { inline_data: { mime_type: p.inlineData.mimeType, data: p.inlineData.data } })
            }))
          };

          if (params.config) {
            const { systemInstruction, tools, ...genConfig } = params.config;
            if (systemInstruction) {
              body.system_instruction = { parts: [{ text: systemInstruction }] };
            }
            if (tools) {
              body.tools = tools;
            }
            if (Object.keys(genConfig).length > 0) {
              body.generation_config = genConfig;
              // Vertex specific: strict JSON mode needs different handling? usually implies response_mime_type
              if (genConfig.responseMimeType) body.generation_config.response_mime_type = genConfig.responseMimeType;
              if (genConfig.responseSchema) body.generation_config.response_schema = genConfig.responseSchema;
            }
          }

          const res = await GeminiService.callVertex(params.model, 'generateContent', body);

          if (!res) {
            throw new Error("Vertex AI returned an empty response. The mission may have been interrupted or blocked.");
          }

          // Map back to SDK-like response object
          return {
            text: res.candidates?.[0]?.content?.parts?.[0]?.text,
            candidates: res.candidates
          };
        },
        generateImages: async (params: { model: string, prompt: string, config?: any }) => {
          // Imagen on Vertex: predict endpoint
          // Body: { instances: [{ prompt: string }], parameters: { sampleCount, ... } }
          const body = {
            instances: [{ prompt: params.prompt }],
            parameters: {
              sampleCount: params.config?.numberOfImages || 1,
              aspectRatio: params.config?.aspectRatio,
              // Add other params if needed
            }
          };
          const res = await GeminiService.callVertex(params.model, 'predict', body);

          if (!res) {
            throw new Error("Imagen API returned an empty response.");
          }

          // Map back to SDK-like response
          // Imagen 3/4 returns predictions: [{ bytesBase64Encoded: string, mimeType: string }]
          const images = res.predictions?.map((p: any) => ({
            image: { imageBytes: p.bytesBase64Encoded || p.bytes } // Handle variations
          })) || [];

          return { generatedImages: images };
        },
        generateVideos: async (params: { model: string, prompt: string, config?: any, image?: any }) => {
          // Veo on Vertex: predict endpoint, returns LRO
          const instance: any = { prompt: params.prompt };
          if (params.image) {
            instance.image = { bytesBase64Encoded: params.image.imageBytes, mimeType: params.image.mimeType };
          }
          const body = {
            instances: [instance],
            parameters: {
              aspectRatio: params.config?.aspectRatio,
              video_config: { // Veo specific
                resolution: params.config?.resolution,
                frame_rate: '24fps'
              }
            }
          };

          // NOTE: generateVideos in SDK returns an OPERATION wrapper. Here we return the raw LRO response.
          // The calling code expects { done: boolean, error, response... } and checks via operations.getVideosOperation
          // We need to mimic that structure.
          const res = await GeminiService.callVertex(params.model, 'predict', body);

          if (!res) {
            throw new Error("Veo API returned an empty response.");
          }

          // Mimic the SDK "result" object
          return {
            done: false, // Initially false
            name: res.name || res.metadata?.name, // Capture operation name
            response: res // Raw response
          };
        }
      },
      operations: {
        getVideosOperation: async (params: { operation: any }) => {
          // Poll the operation
          const opName = params.operation.name;
          if (!opName) throw new Error("Invalid operation - no name returned");

          const res = await GeminiService.callVertex('', 'getOp', opName);

          // Check if done
          if (res.done) {
            // Operation complete. The result is in res.response (or res.result)
            // Veo LRO result layout: { response: { generatedVideos: [...] } } ??
            // Actually Vertex LRO result is usually in `response` field.

            // Mapping to what the existing code expects: result.response.generatedVideos[0].video.uri
            // We'll return the whole LRO object
            return {
              done: true,
              response: res.response || res.result || res, // Pass through
              error: res.error
            };
          }

          return {
            done: false,
            name: opName
          };
        }
      }
    };
  }

  // Redundant but keeping for compatibility if referenced
  private static getAPIKey(): string {
    return "BEARER_TOKEN_AUTHENTICATED";
  }

  private static parseGenAIResponse(text: string): any {
    // Helper to extract the FIRST valid JSON block by balancing braces
    const extractJSON = (str: string) => {
      let start = -1;
      let openChar = '';
      let closeChar = '';

      // 1. Find the first opener
      for (let i = 0; i < str.length; i++) {
        if (str[i] === '{') {
          start = i;
          openChar = '{';
          closeChar = '}';
          break;
        }
        if (str[i] === '[') {
          start = i;
          openChar = '[';
          closeChar = ']';
          break;
        }
      }

      if (start === -1) return str; // No JSON found, try parsing raw

      // 2. Scan forward to find the MATCHING closer
      let balance = 0;
      let inString = false;
      let escaped = false;

      for (let i = start; i < str.length; i++) {
        const char = str[i];

        if (!escaped && char === '"') {
          inString = !inString;
        }

        if (!inString) {
          if (char === openChar) balance++;
          else if (char === closeChar) balance--;
        }

        if (char === '\\' && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }

        if (balance === 0) {
          // Success: Found the exact end of the first root element
          return str.substring(start, i + 1);
        }
      }

      // If we get here, brackets might be unbalanced or truncated.
      // Fallback: Return from start to the very last matching closer we can find (original behavior)
      const lastClose = str.lastIndexOf(closeChar);
      if (lastClose > start) return str.substring(start, lastClose + 1);

      return str.substring(start);
    };

    const cleanComp = extractJSON(text);

    try {
      const parsed = JSON.parse(cleanComp);
      // 🕵️ AUTO-UNWRAP: If AI wrapped the object in an array, fix it
      return (Array.isArray(parsed) && parsed.length === 1) ? parsed[0] : parsed;
    } catch (e) {
      console.error(`JSON Parse Error. Cleaned (len: ${cleanComp.length}):`, cleanComp, `Raw (len: ${text.length}):`, text);
      // Try one last-ditch cleanup for common trailing commas
      try {
        const parsed = JSON.parse(cleanComp.replace(/,\s*([}\]])/g, '$1'));
        return (Array.isArray(parsed) && parsed.length === 1) ? parsed[0] : parsed;
      } catch (e2) {
        throw new Error("Intelligence Engine returned malformed JSON. Please try again.");
      }
    }
  }

  private static getMimeType(base64: string): string {
    const match = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9.+_-]+);base64,/);
    return match ? match[1] : 'image/jpeg';
  }

  static async optimizePrompts(details: ProductDetails & { referenceYoutubeUrls?: string[] }, platform: Platform, images?: string[]): Promise<OptimizedPrompt> {
    const ai = this.getAI();

    // Build YouTube reference context if provided
    const youtubeReferenceContext = details.referenceYoutubeUrls && details.referenceYoutubeUrls.length > 0
      ? `
        🎬 YOUTUBE STYLE REFERENCE VIDEOS:
        The user has provided the following YouTube videos as style/format references.
        MANDATORY: Use Google Search to analyze these videos and extract:
        - Visual style and editing patterns
        - Pacing and rhythm
        - Hook techniques used
        - Transition styles
        - Overall aesthetic and tone
        - What makes these videos engaging

        Reference Videos:
        ${details.referenceYoutubeUrls.map((url, i) => `${i + 1}. ${url}`).join('\n        ')}

        Apply the successful elements from these reference videos to your generated content prompts.
        `
      : '';

    // Build product context - prioritize product URL if provided
    const productContext = details.productUrl
      ? `⚠️ PRODUCT URL PROVIDED: ${details.productUrl}

        🚨 MANDATORY FIRST STEP - DO NOT SKIP:
        1. Navigate to and fetch the EXACT product page at this URL
        2. Read the ENTIRE page content - title, description, images, reviews, specifications
        3. Identify the SPECIFIC PRODUCT being sold on this page
        4. Extract the EXACT product name as shown on the page
        5. DO NOT analyze similar products, competitors, or related items
        6. ONLY use data from THIS SPECIFIC URL

        REQUIRED EXTRACTIONS FROM THIS URL ONLY:
        - Exact product name (as written on the page)
        - Full product description
        - All product images (for accurate visual reference)
        - Customer reviews and ratings
        - Price and current offers
        - Technical specifications
        - Key features and benefits

        ⛔ IGNORE any manual input below if it contradicts the product at this URL.
        ⛔ DO NOT make assumptions - only use data visible on this product page.
        ${details.benefit ? `\n(User's additional context for description: ${details.benefit})` : ''}
        ${details.customVideoInstruction ? `\n🚨 MANDATORY VIDEO SCENE INSTRUCTION: ${details.customVideoInstruction}` : ''}
        ${details.customScript ? `\n🚨 MANDATORY AUDIO/TTS SCRIPT: ${details.customScript}` : ''}`
      : `Product: "${details.name}"
        Narrative/Description: "${details.benefit}"
        ${details.customVideoInstruction ? `\n🚨 MANDATORY VIDEO SCENE INSTRUCTION: ${details.customVideoInstruction}` : ''}
        ${details.customScript ? `\n🚨 MANDATORY AUDIO/TTS SCRIPT: ${details.customScript}` : ''}`;

    const parts: any[] = [
      {
        text: `PERFORM DEEP MARKET ANALYSIS, TREND INTELLIGENCE & CONVERSION PSYCHOLOGY

        ${productContext}
        ${youtubeReferenceContext}

        🔍 PHASE 1: PRODUCT DATA EXTRACTION & VERIFICATION
        
        🚨 MANDATORY: VISUAL DNA DISCOVERY
        Use Google Search to find ACTUAL VIDEO CLIPS, UNBOXINGS, and OFFICIAL PRODUCT DEMOS for the product.
        - Analyze the visual consistency: What specific colors (RGB/Hex if possible), textures, and logos are present?
        - Observe the mechanical movement: How does the product move? How does it react to light?
        - EXTRACT A 'VISUAL DNA' profile to ensure that the generated Veo 3.1 video does not 'butcher' or distort the product's appearance.
        
        ${details.productUrl ? `
        🚨 STEP 1A (MANDATORY): Fetch the product page at ${details.productUrl}
        - Use Google Search or direct fetch to access this EXACT URL
        - Read and extract ONLY the product information from THIS page
        - Confirm the product name, category, and primary use case
        - DO NOT search for "similar products" or "alternatives" - ONLY this URL

        🚨 STEP 1B: Extract from the fetched page ONLY:
        - Product title (exact text from page)
        - Main product images (download/reference the actual images)
        - Product description (word-for-word from the page)
        - Customer reviews (actual quotes from the page)
        - Price and specifications (as listed on the page)

        ⛔ CHECKPOINT: Confirm the product you extracted matches the URL provided. If analyzing a "massage gun" when the URL is for something else, STOP and re-fetch the correct URL.
        ` : ''}

        PHASE 2: DEEP MARKET INTELLIGENCE (only after extracting product data above)
        MANDATORY: Execute recursive Google Searches to uncover LIVE 2026 discourse for ${details.productUrl ? 'THIS PRODUCT' : `"${details.name}"`}:
        
        1. REDDIT/FORUMS: Search for "${details.benefit || details.name} reviews" and "objections to ${details.name}".
           - Identify: EXACT user objections (e.g., "too expensive", "battery dies fast").
           - Extract: Verbatim pain points from current threads.
        
        2. TIKTOK/REELS: Search for viral formats involving "${details.name}" or similar items.
           - Identify: Trending 2026 sounds and "Stop the Scroll" hook patterns.
        
        3. COMPETITOR GAP ANALYSIS: Search for leading competitors of ${details.name}.
           - Identify: What people hate about alternatives.
           - Strategy: Frame ${details.name} as the specific fix.
        
        4. BUYER INTENT MAPPING:
           - Analyze: Search queries indicating readiness to buy.

        🧠 PHASE 2: PSYCHOLOGICAL TRIGGER MAPPING
        Identify and rank these conversion psychology principles for "${details.name}":
        1. TRUST BUILDERS: What visual cues, testimonials, or demonstrations build immediate credibility?
        2. SOCIAL PROOF: What phrases indicate "everyone is buying this" (e.g., "sold out 3x", "1M+ sold")
        3. SCARCITY/URGENCY: Time-sensitive language without being salesy (e.g., "before restocking fee kicks in")
        4. AUTHORITY: Expert endorsements, certifications, or "as seen on" opportunities
        5. RECIPROCITY: Free value given before the ask (tips, hacks, education)
        6. LOSS AVERSION: What problems does NOT having this product cause? (frame the pain)

        📊 MANDATORY ANALYTICS OUTPUT:
        - 4 Pain Points (Actual user objections found - use "quotes")
        - 4 Competitor Gaps (Specific failures of other brands solved here)
        - 4 High-Intent Buyer Signals (Exact phrases people type when buying)
        - 1 Sentiment Score (0-100, calculated from live review data)
        - Top 3 Psychological Triggers (Ranked by effectiveness for this product)

        🎬 PHASE 3: CONTENT VARIATION GENERATION
        CRITICAL: Generate EXACTLY 4 UNIQUE variations, each using a different psychological angle:

        Variation 1: TRUST & AUTHORITY - Show hands-on demonstration, real results, testimonial-style
        Variation 2: SOCIAL PROOF & FOMO - Trending format, "everyone's talking about this" angle
        Variation 3: PROBLEM/SOLUTION - Lead with pain point, show transformation
        Variation 4: LIFESTYLE UPGRADE - Aspirational, show the "after" state, elevate daily life

        ${details.customScript || details.customVideoInstruction ? `
        🚨 SPECIAL OVERRIDE INSTRUCTIONS:
        ${details.customVideoInstruction ? `- VISUALS: For ALL variations, you MUST base the image and video prompts on this user instruction: "${details.customVideoInstruction}". Adapt the psychological tone to match, but keep these core visual elements.` : ''}
        ${details.customScript ? `- SCRIPT: For ALL variations, use the provided script "${details.customScript}" as the primary foundation. You may modify the tone slightly to fit the variation angle (Trust vs FOMO), but keep the core message and CTA verbatim.` : ''}
        ` : ''}
        
        For EACH variation, ensure:
        - IMAGE PROMPT: ${images && images.length > 0 ? '🎯 REFERENCE IMAGES PROVIDED: The user has uploaded reference images of the EXACT product. Your prompt MUST instruct to show THIS SPECIFIC product (as seen in the reference images) in the scene. Describe: ' : ''}Photorealistic smartphone UGC style. ${images && images.length > 0 ? 'Real hands holding/using the EXACT product from the reference images. ' : 'Include specific trust-building elements (hands holding product, '}real environment, authentic lighting, user testimonial vibes). Mention specific props, settings, and emotional tone. ${images && images.length > 0 ? '⚠️ CRITICAL: The product must match the reference images exactly - same colors, features, size, details.' : ''}
        - VIDEO PROMPT: ${images && images.length > 0 ? '🎯 REFERENCE IMAGE PROVIDED: The EXACT product to feature is shown in the reference image. ' : ''}8-second UGC clip showing ${images && images.length > 0 ? 'the EXACT product from the reference image being used by a real person. ' : ''}Specify: opening frame, hand movements, product showcase angle, background setting, lighting (natural window light, golden hour, etc.). Include trust cues like "real person unboxing" or "genuine reaction shot". ${images && images.length > 0 ? '⚠️ The product MUST match the reference image - same appearance, colors, features.' : ''}
        - AUDIO SCRIPT: 20-30 words max. Use 2026 viral language patterns. Lead with a hook question or bold claim. End with subtle CTA.
        - AMBIENT SOUND: Describe realistic environmental audio that enhances authenticity (e.g., "soft paper rustling, gentle package opening, satisfied exhale")

        📅 PHASE 4: STRATEGIC LAUNCH CALENDAR
        Generate a 7-day posting schedule starting Monday, January 13, 2026:
        - Day 1-2: Trust-building content (Variation 1)
        - Day 3-4: Social proof content (Variation 2)
        - Day 5-6: Problem-solution content (Variation 3)
        - Day 7: Lifestyle/aspiration content (Variation 4)

        For EACH day specify:
        - Exact date and optimal time based on platform algorithm patterns (TikTok: 6-9 PM, Instagram: 7-9 AM / 8-10 PM, YouTube: 11 AM-2 PM)
        - Which variation to post
        - Which platform (rotate strategically)
        - Strategic goal (e.g., "Build initial trust", "Trigger FOMO", "Close hesitant buyers")

        OUTPUT: JSON ONLY. Use current 2026 slang, trending phrases, and viral patterns. Every element should be optimized for maximum conversion and purchase intent.`
      }
    ];

    if (images && images.length > 0) {
      images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: this.getMimeType(img),
            data: img.split(',')[1]
          }
        });
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts }],
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `You are a World-Class Conversion Psychologist, Trend Analyst, and Viral Marketing Strategist with access to real-time 2026 data. You ONLY speak in JSON.
          
          STRICT JSON OUTPUT FORMAT REQUIRED:
          {
            "extractedProductName": "string (The EXACT product name)",
            "videoPrompt": "string",
            "imagePrompt": "string",
            "hook": "string",
            "audioScript": "string",
            "conversionStrategy": "string",
            "visualBrief": "string",
            "psychologicalAngle": "string",
            "conversionScore": number,
            "researchData": {
              "painPoints": ["string"],
              "competitorWeakness": ["string"],
              "winningHookPatterns": ["string"],
              "sentimentScore": number,
              "buyerIntentSignals": ["string"]
            },
            "triggers": ["string"],
            "variations": [
              {
                "id": "string",
                "label": "string",
                "description": "string",
                "videoPrompt": "string",
                "imagePrompt": "string",
                "audioScript": "string",
                "ambientSoundDescription": "string"
              }
            ],
            "launchCalendar": [
              {
                "day": "string",
                "platform": "string",
                "contentLabel": "string",
                "strategicGoal": "string",
                "hookType": "string",
                "optimalTime": "string"
              }
            ],
            "social_tiktok_caption": "string",
            "social_tiktok_hashtags": ["string"],
            "social_tiktok_bestTime": "string",
            "social_youtube_caption": "string",
            "social_youtube_hashtags": ["string"],
            "social_youtube_bestTime": "string",
            "social_instagram_caption": "string",
            "social_instagram_hashtags": ["string"],
            "social_instagram_bestTime": "string",
            "discoveredVisualDna": "string"
          }


${details.productUrl ? `
🚨 CRITICAL FIRST STEP - PRODUCT URL VERIFICATION:
You have been given a specific product URL: ${details.productUrl}

MANDATORY PROCESS:
1. Fetch this EXACT URL using Google Search or direct access
2. Read the ENTIRE page content to identify the SPECIFIC product being sold
3. Extract the EXACT product name from the page title/heading
4. Verify you are analyzing the CORRECT product (not a related/similar item)
5. If you find yourself analyzing a "massage gun" or any product that doesn't match the URL, STOP and re-fetch the correct page

CHECKPOINT BEFORE PROCEEDING:
- What is the exact product name from the URL?
- Does this match what you're about to analyze?
- Have you actually fetched and read THIS specific URL's content?

Only proceed with content generation AFTER confirming you have the CORRECT product from the provided URL.
` : ''}

Your mission: ${details.productUrl ? `Use the actual product data you extracted from ${details.productUrl} as the foundation for ALL content. DO NOT use data from similar products or searches - ONLY from this exact URL.` : ''} Use Google Search to find ACTUAL trending phrases, viral formats, and real buyer psychology from Reddit, TikTok, Twitter, and YouTube. Every recommendation must be backed by real data you discover.

ACCURACY MANDATE: ${details.productUrl ? `⛔ Since a product URL is provided, you MUST represent ONLY the product at that URL. If you're analyzing a different product (like a massage gun when the URL is for something else), you have made an error. Start over and fetch the correct URL.` : 'Ensure all generated content accurately represents the product without exaggeration or misrepresentation.'}

Psychological Framework: Apply Cialdini's 6 principles (Social Proof, Authority, Scarcity, Reciprocity, Consistency, Liking) + modern viral psychology (authenticity signals, parasocial trust, FOMO mechanics, aspiration triggers).

Image/Video Instructions: ${images && images.length > 0 ? `🎯 CRITICAL: The user has uploaded ${images.length} reference image(s) of the EXACT product. When generating image/video prompts, you MUST instruct the AI to show THIS SPECIFIC product as seen in the reference images. The generated content should feature the EXACT product from the references - matching colors, shape, size, features, details precisely. ` : ''}Every visual must match the ACTUAL product appearance ${details.productUrl ? '(as seen on the product page)' : ''}${images && images.length > 0 ? ' (as seen in the uploaded reference images)' : ''}. Include trust-building elements: real hands, authentic environments, natural lighting, relatable settings. Show the product as it truly is - accurate size, color, features. Avoid stock photo vibes. Think 'my friend showing me the real product' energy.

Language Style: Use an ENGAGING AND SWEET tone that people love to hear. Establish IMMEDIATE TRUST AND AUTHORITY by highlighting authentic product details. Lead with a hook, but maintain a helpful, premium, and friendly vibe. No corporate or aggressive sales speak; your goal is to be a trusted advisor who genuinely loves the product.`
        } as any
      } as any);

      if (!response.text) {
        console.error("Gemini API Error: Empty response or safety block", response);
        throw new Error("The AI Research Engine returned no data. This is typically due to safety filters or a temporary API outage. Try adjusting your brand description.");
      }

      const raw = this.parseGenAIResponse(response.text);
      console.log("Research Phase Success:", raw);

      // Verify product extraction if URL was provided
      if (details.productUrl && raw.extractedProductName) {
        console.log(`✓ Product extracted from URL: "${raw.extractedProductName}"`);
        console.log(`URL provided: ${details.productUrl}`);

        // Alert user about what product was detected
        if (typeof window !== 'undefined') {
          console.warn(`📦 PRODUCT DETECTED: ${raw.extractedProductName}\nIf this is incorrect, the AI may have analyzed the wrong product page.`);
        }
      }

      return {
        ...raw,
        social: {
          tiktok: {
            caption: raw.social_tiktok_caption || "",
            hashtags: raw.social_tiktok_hashtags || [],
            firstComment: `Get yours here: ${details.affiliateLink || 'Link in Bio'} 🔥`,
            bestTime: raw.social_tiktok_bestTime || "6:30 PM"
          },
          youtube: {
            caption: raw.social_youtube_caption || "",
            hashtags: raw.social_youtube_hashtags || [],
            firstComment: `Official Link: ${details.affiliateLink || 'In Description'} ↘️`,
            bestTime: raw.social_youtube_bestTime || "11:00 AM"
          },
          instagram: {
            caption: raw.social_instagram_caption || "",
            hashtags: raw.social_instagram_hashtags || [],
            firstComment: `Shop now: ${details.affiliateLink || 'Link in Bio'} 🔗`,
            bestTime: raw.social_instagram_bestTime || "8:00 PM"
          }
        }
      } as OptimizedPrompt;
    } catch (err: any) {
      console.error("CRITICAL: optimizePrompts Failed", err);
      // Narrow down common causes
      if (err.message.includes("400")) {
        throw new Error("Factory Logic Error (400): The model 'gemini-3-pro' might not be enabled for your key or the request format is slightly off. Check browser console.");
      }
      if (err.message.includes("Unexpected token")) {
        throw new Error("Intelligence Engine returned malformed JSON. Try clicking 'Initialize' again.");
      }
      throw new Error(`Market Research failed: ${err.message}`);
    }
  }

  static async generateAudio(script: string, voiceName: string = 'Kore'): Promise<string> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: 'user', parts: [{ text: `Social Media UGC Narration. Authentic, fast-paced. High-fidelity voice. Voice: ${voiceName}. Script: ${script}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        } as any,
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        console.error("TTS Missing Audio Data:", response);
        throw new Error("Gemini-TTS did not return any audio data. Check if your API key has access to the 2.5 TTS preview.");
      }

      const audioBytes = this.decode(base64Audio);
      return URL.createObjectURL(this.createWavBlob(audioBytes, 24000));
    } catch (err: any) {
      console.error("TTS Synthesis Error:", err);
      throw new Error(`Voiceover synthesis failed (Chirp 3): ${err.message}`);
    }
  }

  static async generateExpansionVariation(
    context: OptimizedPrompt,
    type: 'video' | 'image',
    customPrompt?: string,
    customAudioScript?: string,
    customVideoPrompt?: string
  ): Promise<AssetVariation> {
    const ai = this.getAI();

    let prompt = `Generate one extra ${type} version based on the brand hook: "${context.hook}". UGC style, 4K smartphone realism.`;

    if (customPrompt) {
      prompt += `\nAdditional Context: ${customPrompt}`;
    }

    if (type === 'video') {
      if (customVideoPrompt) {
        prompt += `\n🚨 MANDATORY VIDEO SCENE: ${customVideoPrompt}`;
      }
      if (customAudioScript) {
        prompt += `\n🚨 MANDATORY AUDIO SCRIPT: ${customAudioScript}`;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              videoPrompt: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              audioScript: { type: Type.STRING },
              ambientSoundDescription: { type: Type.STRING }
            }
          }
        } as any
      });
      if (!response.text) throw new Error("Empty variation response");
      return this.parseGenAIResponse(response.text) as AssetVariation;
    } catch (err: any) {
      console.error("Expansion Variation Error:", err);
      throw new Error(`Custom expansion failed: ${err.message}`);
    }
  }

  static async analyzeVideoContent(
    videoUrl: string,
    targetAudience: string,
    productName: string
  ): Promise<Array<{ description: string; script: string; visualBrief: string; audience_alignment: string; clip_type: string }>> {
    const ai = this.getAI();

    // Director Persona Prompt
    const prompt = `
      🚨 DIRECTOR MODE: FULL VIDEO SEQUENCE BREAKDOWN
      
      SOURCE CONTEXT: ${videoUrl}
      PRODUCT: ${productName}
      
      YOUR ROLE: 
      You are a Master Video Editor & Archivist.
      
      MANDATORY TASK:
      Break down the ENTIRE video URL provided into a chronological list of distinct, NON-OVERLAPPING segments.
      You must walk through the video from Start (00:00) to End.
      
      FOR EVERY SINGLE SCENE or STEP shown in the video, create a separate clip entry.
      
      CATEGORIZATION LABELS (Use these exactly):
      - 'INTRO': The very beginning, hook, or introduction.
      - 'UNBOXING_STEP': A specific single step in the unboxing process (e.g. "Opening the lid", "Removing the plastic").
      - 'PROBLEM_DEMO': A segment showing a problem or struggle that the product solves.
      - 'SOLUTION_ACTION': The specific moment the product solves the problem.
      - 'FEATURE_HIGHLIGHT': A focused look at a specific feature (e.g. "Close up of the button", "Showing the port").
      - 'OUTRO': The final verdict, call to action, or ending.
      
      CRITICAL RULES:
      1. **NO OVERLAPS:** If Clip 1 ends at 00:15, Clip 2 CANNOT start before 00:15.
      2. **GRANULARITY:** Do not group "Unboxing" into one big 2-minute clip. Break it down: "Box Front" (5s), "Opening Lid" (3s), "Taking out manual" (4s).
      3. **COA (Content of Action):** "visualBrief" must describe exactly what visual action happens (e.g., "Hands peeling off the protective film").
      4. **SCRIPT:** Write a short, punchy, new voiceover line that *could* go over this specific clip.
      
      OUTPUT SCHEMA (Strict JSON Array):
      [
        {
          "visualBrief": "Detailed visual description of the footage (e.g., 'Close up shot of thumb pressing the power button')...",
          "context_caption": "What is happening in the original video...",
          "script": "New AI voiceover line for this specific moment...",
          "description": "Short label (e.g. 'Unboxing Step 1' or 'The click sound')...",
          "audience_alignment": "Why this specific detail matters...",
          "clip_type": "INTRO" | "UNBOXING_STEP" | "PROBLEM_DEMO" | "SOLUTION_ACTION" | "FEATURE_HIGHLIGHT" | "OUTRO",
          "start_timestamp": "MM:SS",
          "end_timestamp": "MM:SS"
        }
      ]
      
      IF YOU CANNOT FIND EXACT TIMESTAMPS via 'googleSearch' tools (transcripts/chapters), you must infer logically distinct steps based on standard video pacing for this product type, but ensure they are SEQUENTIAL and do not overlap.
      
      RETURN ONLY THE JSON ARRAY.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `You are a Precise Video Segmenter.
          
          YOUR GOAL: Create a linear timeline of the video content.
          
          1. SEARCH FIRST: Use googleSearch to find the video transcript and chapters for ${videoUrl}.
          2. MAP THE TIMELINE: identifying key visual events.
          3. BREAK IT DOWN: Turn every distinct action into a separate "Lego Block".
          4. NO OVERLAP: Ensure end_timestamp of Clip N <= start_timestamp of Clip N+1.
          5. COVERAGE: Try to cover the essence of the whole video, not just random parts.
          
          Variable clip lengths are fine (2s to 30s), but keep them tightly focused on ONE specific action or feature.`
        } as any
      } as any);

      if (!response.text) throw new Error("Director analysis failed to return data.");
      return this.parseGenAIResponse(response.text);
    } catch (err: any) {
      console.error("Director Mode Error:", err);
      throw new Error(`Director analysis failed: ${err.message}`);
    }
  }



  private static decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private static createWavBlob(pcmData: Uint8Array, sampleRate: number): Blob {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 32 + pcmData.length, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    return new Blob([header, pcmData as any], { type: 'audio/wav' });
  }

  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  static async generateImage(prompt: string, aspectRatio: AspectRatio, referenceImages?: string[]): Promise<string> {
    const ai = this.getAI();

    // AGGRESSIVE VISUAL ANALYSIS: Force Gemini to describe EXACTLY what it sees
    if (referenceImages && referenceImages.length > 0) {
      try {
        // Step 1: FORCE Gemini to describe the product in extreme detail
        const analysisParts: any[] = [
          {
            text: `🚨 YOU ARE LOOKING AT A PRODUCT IMAGE. DESCRIBE EVERY DETAIL YOU SEE:

MANDATORY VISUAL ANALYSIS (describe what you ACTUALLY SEE in the image):

1. PRODUCT CATEGORY: What type of product is this? (bottle, electronic device, clothing, tool, food item, cosmetic, etc.)

2. EXACT COLORS YOU SEE:
   - Primary color (be specific: "metallic blue", "matte black", "glossy red", "transparent clear", etc.)
   - Secondary colors
   - Accent colors
   - Finish type (glossy, matte, metallic, transparent, textured)

3. SHAPE & FORM:
   - Overall shape (cylindrical, rectangular, curved, spherical, etc.)
   - Dimensions and proportions (tall/short, wide/narrow, thick/thin)
   - Edges (rounded, sharp, beveled)

4. VISIBLE TEXT & LABELS:
   - Brand name as written on product
   - Product name/title
   - Any text, numbers, or symbols visible
   - Label placement and style

5. PHYSICAL FEATURES:
   - Buttons, switches, openings, caps, lids
   - Texture (smooth, ribbed, patterned)
   - Materials (plastic, metal, glass, fabric, etc.)
   - Any distinctive design elements

6. PACKAGING (if visible):
   - Box/container colors and design
   - Logo placement
   - Product visibility through packaging

7. UNIQUE IDENTIFIERS:
   - What makes this product instantly recognizable?
   - Distinctive features that set it apart

NOW CREATE AN IMAGE GENERATION PROMPT:

Use your visual analysis above to create a HYPER-DETAILED prompt for generating this scene: "${prompt}"

The prompt MUST include:
- The exact product you just described (with all colors, shapes, features, text)
- Real human hands holding/using this specific product
- UGC smartphone photo style with natural lighting
- Authentic home/real-world environment
- Trust-building composition (testimonial energy)

FORMAT YOUR RESPONSE AS:
VISUAL ANALYSIS: [Your detailed observations from the image]

IMAGE GENERATION PROMPT: [Complete detailed prompt including the exact product from your analysis above + the scene requirements + UGC style elements]` }
        ];

        referenceImages.forEach(img => {
          analysisParts.push({
            inlineData: {
              mimeType: this.getMimeType(img),
              data: img.split(',')[1]
            }
          });
        });

        const analysisResponse = await ai.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: [{ role: 'user', parts: analysisParts }]
        });

        const fullAnalysis = analysisResponse.text || prompt;
        console.log("🔍 FORCED VISUAL ANALYSIS:", fullAnalysis);

        // Extract just the image generation prompt part (after "IMAGE GENERATION PROMPT:")
        const promptMatch = fullAnalysis.match(/IMAGE GENERATION PROMPT:\s*(.+)/is);
        const detailedPrompt = promptMatch ? promptMatch[1].trim() : fullAnalysis;

        console.log("📸 FINAL PRODUCT-AWARE PROMPT:", detailedPrompt);

        // Step 2: Generate with Imagen using the detailed product-aware prompt
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-ultra-generate-001',
          prompt: detailedPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio,
            sampleImageSize: '2K',
            includeRaiReason: true
          } as any
        });

        const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) throw new Error("No image data returned from Imagen API");

        return `data:image/png;base64,${imageBytes}`;

      } catch (err: any) {
        console.error("Product-aware image generation error:", err);
        // Fall back to basic approach if multimodal analysis fails
        console.warn("Falling back to basic image generation...");
      }
    }

    // Fallback: Basic image generation without reference
    const enhancedPrompt = `AUTHENTIC UGC SMARTPHONE PHOTO - Shot on iPhone style with natural lighting. TRUST-BUILDING ELEMENTS REQUIRED: Real human hands visible, genuine environment (kitchen counter, desk, bedroom), soft natural window light or golden hour lighting, slight lens distortion for authenticity, subtle grain/noise for realism. AVOID: Perfect studio lighting, stock photo aesthetics, overly polished look. AIM FOR: "My friend sent me this" vibes, relatable setting, testimonial energy. ${prompt}`;

    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-ultra-generate-001',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: aspectRatio,
          sampleImageSize: '2K',
          includeRaiReason: true
        } as any
      });

      const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) throw new Error("No image data returned from Imagen API");

      return `data:image/png;base64,${imageBytes}`;
    } catch (err: any) {
      console.error("Image generation error:", err);
      throw new Error(`Image generation failed: ${err.message}`);
    }
  }

  static async generateVideo(prompt: string, ambientSound: string, aspectRatio: AspectRatio, onProgress: (status: string) => void, referenceImages?: string[], referenceClips?: string[]): Promise<string> {
    const ai = this.getAI();
    const mappedAspectRatio = aspectRatio === AspectRatio.SQUARE ? '9:16' : aspectRatio;

    let videoPrompt = prompt;

    // AGGRESSIVE MULTIMODAL ANALYSIS: Extract context from images AND clips
    if ((referenceImages && referenceImages.length > 0) || (referenceClips && referenceClips.length > 0)) {
      try {
        onProgress("🔍 Analyzing multimodal context (Images + Clips)...");

        const analysisParts: any[] = [
          {
            text: `🚨 CRITICAL: CREATE A HIGH-QUALITY, REALISTIC PRODUCT VIDEO

            You are analyzing reference media to create an 8-second product showcase video that looks REAL and PROFESSIONAL.

            YOUR MISSION:
            1. Study the EXACT product in the reference images/clips - every detail matters
            2. Extract the precise visual DNA: colors (exact hex codes if possible), materials, textures, logos, proportions
            3. Create a video generation prompt that produces REALISTIC footage that could pass as real UGC

            🚨 ABSOLUTE REQUIREMENTS FOR REALISM:

            PRODUCT ACCURACY (Most Critical):
            - The product MUST look IDENTICAL to the reference images
            - Exact colors - no shifting, no artistic interpretation
            - Correct size, shape, and proportions
            - All text, logos, and branding must be accurate and readable
            - Materials should look authentic (plastic looks like plastic, metal like metal, etc.)

            HUMAN REALISM:
            - Real human hands with natural skin tones and textures
            - Anatomically correct - all 5 fingers visible and natural
            - Natural grip and interaction with the product
            - Realistic movements - not robotic, not too smooth

            ENVIRONMENT & LIGHTING:
            - Authentic home or studio setting (not overly perfect)
            - Natural lighting: window light, golden hour, or soft diffused light
            - Realistic shadows that match the lighting direction
            - Subtle imperfections that make it look real (slight grain, natural bokeh)

            CAMERA WORK:
            - Handheld smartphone aesthetic with subtle natural movement
            - Focus pulls that feel organic
            - Framing that a real person would use

            CONTEXT FOR THIS VIDEO: "${prompt}"

            ANALYZE THE REFERENCE MEDIA AND PROVIDE:

            VISUAL ANALYSIS:
            - Exact product description (colors, materials, size, features, any text/logos)
            - Current lighting and environment style
            - Any motion or usage patterns shown

            VIDEO GENERATION PROMPT:
            [Write a detailed prompt that will generate a realistic 8-second clip featuring THIS EXACT PRODUCT. Include specific details about the product appearance, human interaction, environment, lighting, and camera movement. The goal is footage that looks indistinguishable from real UGC.]` }
        ];

        if (referenceImages) {
          referenceImages.forEach(img => {
            analysisParts.push({
              inlineData: {
                mimeType: this.getMimeType(img),
                data: img.split(',')[1]
              }
            });
          });
        }

        if (referenceClips) {
          referenceClips.forEach(clip => {
            analysisParts.push({
              inlineData: {
                mimeType: this.getMimeType(clip),
                data: clip.split(',')[1]
              }
            });
          });
        }

        const analysisResponse = await ai.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: [{ role: 'user', parts: analysisParts }]
        });

        const fullAnalysis = analysisResponse.text || prompt;
        const promptMatch = fullAnalysis.match(/VIDEO GENERATION PROMPT:\s*(.+)/is);
        videoPrompt = promptMatch ? promptMatch[1].trim() : fullAnalysis;

        console.log("🎬 MULTIMODAL CONTEXT-AWARE VIDEO PROMPT:", videoPrompt);
        onProgress("🎬 Synthesizing Veo 3.1 with enhanced continuity...");

      } catch (err: any) {
        console.error("Multimodal analysis error:", err);
        onProgress("Generating video...");
      }
    }

    const constraint = ` CRITICAL QUALITY REQUIREMENTS:
    - MAXIMUM VISUAL FIDELITY: The product must look EXACTLY like the reference images - same colors, textures, logos, proportions
    - RIGID OBJECT PERMANENCE: The product must not morph, distort, or change shape throughout the clip
    - REALISTIC HUMAN INTERACTION: Show natural hand movements, proper grip, realistic skin tones
    - AUTHENTIC LIGHTING: Natural window light or soft studio lighting, realistic shadows and reflections
    - CLEAN CINEMATIC MOTION: Smooth camera movements, no jitter, professional quality
    - 4K UGC AESTHETIC: Looks like high-end smartphone footage shot by a real person`;

    const continuityFocus = ` VISUAL ACCURACY MANDATE:
    - The product in the video MUST match the reference images exactly
    - Preserve exact product colors (no color shifting)
    - Maintain correct product scale and proportions
    - Keep all logos, text, and branding accurate
    - Do not add or remove product features`;

    const finalVideoPrompt = `HIGH-FIDELITY PRODUCT SHOWCASE VIDEO. ${videoPrompt}. AMBIENT: ${ambientSound}. ${constraint} ${continuityFocus}`;

    const generateConfig: any = {
      model: 'veo-3.1-generate-preview',
      prompt: finalVideoPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: mappedAspectRatio as any,
        enhanceRealism: true,
        includeAudio: true
      }
    };

    if (referenceImages && referenceImages.length > 0) {
      generateConfig.image = { imageBytes: referenceImages[0].split(',')[1], mimeType: this.getMimeType(referenceImages[0]) };
    }

    let result = await (ai as any).models.generateVideos(generateConfig);
    const startTime = Date.now();
    while (!result.done) {
      if (Date.now() - startTime > 180000) throw new Error("Video generation timed out (3m limit).");
      await new Promise(resolve => setTimeout(resolve, 5000));
      result = await (ai as any).operations.getVideosOperation({ operation: result });
      onProgress("Refining product details & cinematic motion...");
    }

    // Log full response for debugging
    console.log("Veo API Full Response:", JSON.stringify(result, null, 2));

    const downloadLink = result.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      // Check for rejection reasons
      const rejectionReason = result.response?.generatedVideos?.[0]?.video?.rejectionReason;
      const errorDetails = result.response?.error || result.error;

      if (rejectionReason) {
        throw new Error(`Video generation rejected: ${rejectionReason}`);
      } else if (errorDetails) {
        throw new Error(`Video generation error: ${JSON.stringify(errorDetails)}`);
      } else {
        console.error("Unexpected Veo response structure:", result);
        throw new Error("No video URL returned from Veo generation. Check console for full API response.");
      }
    }
    const response = await fetch(downloadLink);
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
    return URL.createObjectURL(await response.blob());
  }

  /**
   * SIMPLE VIDEO GENERATION
   * Just creates an 8-second product video from images + feature description.
   * No marketing fluff, no countdown logic, no complex prompts.
   */
  static async generateSimpleVideo(
    productName: string,
    featureDescription: string,
    referenceImages: string[],
    onProgress: (status: string) => void,
    targetAudience: string = "General"
  ): Promise<{ videoUrl: string; script: string; videoPrompt: string }> {
    const ai = this.getAI();

    onProgress(`Director Mode: Analyzing scene for ${targetAudience}...`);

    // Step 1: Analyze images to understand the product
    let productAnalysis = '';
    if (referenceImages.length > 0) {
      const analysisParts: any[] = [
        {
          text: `Look at these product images and describe:
1. What is this product ? (exact name, type, category)
2. What does it look like ? (colors, materials, size, shape, any text / logos)
3. How would someone use it ?

  Keep it brief - just the facts.`
        }
      ];

      referenceImages.forEach(img => {
        analysisParts.push({
          inlineData: {
            mimeType: this.getMimeType(img),
            data: img.split(',')[1]
          }
        });
      });

      try {
        const analysisResponse = await ai.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: [{ role: 'user', parts: analysisParts }]
        });
        productAnalysis = analysisResponse.text || '';
      } catch (err) {
        console.error("Image analysis error:", err);
        productAnalysis = productName;
      }
    }

    onProgress("Creating video prompt...");

    // Step 2: Generate a simple video prompt
    const videoPrompt = `8 - second UGC - style product video.
  Product: ${productName || productAnalysis}
Feature to showcase: ${featureDescription || 'general product overview'}

Show a real person's hands naturally using/holding this product.
Natural lighting(window light or soft indoor lighting).
  Clean, simple background(desk, table, couch).
    Smooth, subtle camera movement.
The product must look exactly like the reference image - same colors, size, and details.`;

    // Step 3: Generate a simple script (15-20 words max)
    const scriptPrompt = `Write a 15 - 20 word voiceover script for a product video.
  Product: ${productName}
Feature: ${featureDescription || 'general product overview'}

Rules:
- Conversational, not salesy
  - One clear benefit
    - No hashtags or emojis
      - End with a soft call to action

Just output the script, nothing else.`;

    let script = '';
    try {
      const scriptResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: scriptPrompt }] }]
      });
      script = scriptResponse.text || `Check out the ${featureDescription || productName}. It's a game changer.`;
    } catch (err) {
      script = `Check out the ${featureDescription || productName}. It's a game changer.`;
    }

    onProgress("Generating video with Veo...");

    // Step 4: Generate the video
    const generateConfig: any = {
      model: 'veo-3.1-generate-preview',
      prompt: videoPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '9:16',
        includeAudio: true
      }
    };

    // Use first image as reference
    if (referenceImages.length > 0) {
      generateConfig.image = {
        imageBytes: referenceImages[0].split(',')[1],
        mimeType: this.getMimeType(referenceImages[0])
      };
    }

    let result = await (ai as any).models.generateVideos(generateConfig);
    const startTime = Date.now();
    while (!result.done) {
      if (Date.now() - startTime > 180000) throw new Error("Video generation timed out (3m limit).");
      await new Promise(resolve => setTimeout(resolve, 5000));
      result = await (ai as any).operations.getVideosOperation({ operation: result });
      onProgress("Rendering video...");
    }

    console.log("Veo API Response:", JSON.stringify(result, null, 2));

    const downloadLink = result.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      const rejectionReason = result.response?.generatedVideos?.[0]?.video?.rejectionReason;
      if (rejectionReason) {
        throw new Error(`Video rejected: ${rejectionReason}`);
      }
      throw new Error("No video generated. Check console for details.");
    }

    const videoResponse = await fetch(downloadLink);
    if (!videoResponse.ok) throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    const videoUrl = URL.createObjectURL(await videoResponse.blob());

    return { videoUrl, script, videoPrompt };
  }

  static async regenerateImageWithFeedback(
    originalPrompt: string,
    feedback: string,
    originalImageUrl: string,
    aspectRatio: AspectRatio,
    referenceImages?: string[]
  ): Promise<string> {
    const ai = this.getAI();

    // Create an enhanced prompt that incorporates the user's feedback
    const regenerationPrompt = `REGENERATE this image with the following corrections and improvements:

ORIGINAL INTENT: ${originalPrompt}

USER FEEDBACK & CORRECTIONS:
${feedback}

CRITICAL REQUIREMENTS:
1. Maintain the authentic UGC smartphone photo style
2. Address ALL user feedback points precisely
3. Ensure product is accurately represented (no exaggeration or misrepresentation)
4. Keep trust-building elements: real hands, genuine environment, natural lighting
5. Fix any inaccuracies or misleading elements mentioned in feedback

ACCURACY PRIORITY: The product must be shown truthfully. If the user pointed out misrepresentations, correct them completely. Trust and honesty are more important than visual appeal.

${originalPrompt}`;

    try {
      const config: any = {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
        sampleImageSize: '2K',
        includeRaiReason: true
      };

      // Add the original image as a reference for consistency
      if (referenceImages && referenceImages.length > 0) {
        config.referenceImages = referenceImages.map(img => ({
          referenceType: 'STYLE',
          referenceImage: {
            imageBytes: img.split(',')[1]
          }
        }));
      }

      const response = await ai.models.generateImages({
        model: 'imagen-4.0-ultra-generate-001',
        prompt: regenerationPrompt,
        config
      });

      const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;

      if (!imageBytes) {
        throw new Error("No image data returned from regeneration");
      }

      return `data:image/png;base64,${imageBytes}`;
    } catch (err: any) {
      console.error("Image regeneration error:", err);
      throw new Error(`Failed to regenerate image with feedback: ${err.message}`);
    }
  }

  static async regenerateVideoWithFeedback(
    originalPrompt: string,
    ambientSound: string,
    feedback: string,
    aspectRatio: AspectRatio,
    onProgress: (status: string) => void,
    referenceImages?: string[]
  ): Promise<string> {
    const ai = this.getAI();
    const mappedAspectRatio = aspectRatio === AspectRatio.SQUARE ? '9:16' : aspectRatio;

    // Create an enhanced prompt that incorporates the user's feedback
    const regenerationPrompt = `REGENERATE this video with the following corrections and improvements:

ORIGINAL SCENE: ${originalPrompt}

USER FEEDBACK & CORRECTIONS:
${feedback}

CRITICAL REQUIREMENTS:
1. Maintain authentic UGC smartphone footage style
2. Address ALL user feedback points precisely
3. Ensure product is accurately represented (no exaggeration, distortion, or misrepresentation)
4. Keep trust signals: real person, genuine reactions, natural environment
5. Fix any inaccuracies, wrong angles, or misleading elements mentioned in feedback
6. Anatomically correct hands and realistic physics
7. Natural lighting and smartphone sensor characteristics

ACCURACY PRIORITY: The product demonstration must be truthful and accurate. If the user identified any misrepresentations, correct them completely. Honest representation builds trust and conversions.

AMBIENT SOUND: ${ambientSound}

${originalPrompt}`;

    const constraint = " STRICT PHYSICAL CONSISTENCY. Anatomically correct hands (show all 5 fingers naturally). Real person visible (face or hands). Genuine reactions and movements. Rigid objects. No morphing. Mobile sensor jitter. Natural smartphone white balance. High-ISO grain. 4K RAW UGC authenticity.";
    const trustElements = " CONVERSION PSYCHOLOGY: Include trust signals - real unboxing moment, genuine first reaction, hands-on demonstration, relatable home environment, natural lighting (window/golden hour), subtle enthusiasm (not over-acted). Goal: Viewer thinks 'my friend showing me this product'.";
    const videoPrompt = `AUTHENTIC UGC SMARTPHONE FOOTAGE - REGENERATED WITH CORRECTIONS. ${regenerationPrompt}${constraint}${trustElements}`;

    const generateConfig: any = {
      model: 'veo-3.1-generate-preview',
      prompt: videoPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: mappedAspectRatio as any,
        enhanceRealism: true,
        includeAudio: true
      }
    };

    if (referenceImages && referenceImages.length > 0) {
      generateConfig.image = { imageBytes: referenceImages[0].split(',')[1], mimeType: this.getMimeType(referenceImages[0]) };
    }

    onProgress("Regenerating video with your feedback...");
    let result = await (ai as any).models.generateVideos(generateConfig);

    const startTime = Date.now();
    while (!result.done) {
      if (Date.now() - startTime > 180000) throw new Error("Video generation timed out (3m limit).");
      await new Promise(resolve => setTimeout(resolve, 5000));
      result = await (ai as any).operations.getVideosOperation({ operation: result });
      onProgress("Applying corrections and validating accuracy...");
    }

    const downloadLink = result.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URL returned from Veo generation");
    const response = await fetch(downloadLink);
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
    return URL.createObjectURL(await response.blob());
  }

  static async generateConnectiveNarrative(slots: { rank: number, name: string }[], isAffiliate?: boolean, disclosure?: string, videoType: string = 'SHOWCASE'): Promise<string> {
    const ai = this.getAI();
    const slotContext = slots.map(s => `Rank #${s.rank}: ${s.name}`).join('\n');

    let typeContext = "";
    switch (videoType) {
      case 'UNBOXING': typeContext = "Focus on the excitement of opening, packaging feel, and first impressions. Use words like 'revealing', 'inside the box', 'packaging'."; break;
      case 'HOW_TO': typeContext = "Focus on utility, steps, and learning. Use words like 'guide', 'step-by-step', 'how to use'. Tone: Educational & Clear."; break;
      case 'TROUBLESHOOTING': typeContext = "Focus on solving problems and fixing issues. Tone: Helpful, reassuring, 'don't worry'."; break;
      case 'COMPARISON': typeContext = "Focus on pros/cons and differences. Tone: Analytical and objective."; break;
      default: typeContext = "Focus on general showcase and premium appeal."; break;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{
          role: 'user', parts: [{
            text: `You are writing a CONNECTIVE NARRATIVE for a top ${slots.length} ${videoType.toLowerCase()} video. 
        Your goal is to provide the "glue" that holds the video together.
        
        SITUATION:
        We have ${slots.length} products being covered. Each product has its own detailed description.
        You need to write an INTRO, TRANSITIONS between ranks, and an OUTRO.
        ${isAffiliate ? `\n🚨 LEGAL COMPLIANCE: This is an affiliate promotion. You MUST subtly but clearly mention '${disclosure}' in the intro and outro.` : ''}

        TONE & STYLE (${videoType}):
        ${typeContext}
        General Tone: Engaging, sweet, approachable, and premium. You sound like a helpful friend.

        PRODUCTS:
        ${slotContext}

        OUTPUT FORMAT:
        Write a single cohesive script that leaves pauses (marked as [PAUSE]) where the product-specific descriptions will go.
        
        EXAMPLE: "Today we're looking at the top ${slots.length} game changers. Starting things off... [PAUSE] ...and that was rank ${slots[0].rank}. But moving on to rank ${slots[1]?.rank || 'X'}, this next one is interesting... [PAUSE] ...and finally, our number one spot... [PAUSE] ...thanks for watching!"

        Keep it concise and focus on the SEAMLESS FLOW.` }]
        }],
      });

      return response.text || '';
    } catch (err: any) {
      console.error("Connective Narrative Error:", err);
      throw new Error(`Failed to generate connective narrative: ${err.message}`);
    }
  }

  /**
   * GENERATE VIDEO DIRECTLY FROM PROMPT
   * Uses the pre-optimized Visual Brief from Director Mode.
   */
  static async describeImage(imageBase64: string): Promise<string> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-pro",
        contents: [{
          role: 'user',
          parts: [
            { text: "Describe this product image in extreme detail, focusing on materials, colors, lighting, textures, and the product's physical appearance. This description will be used to instruct a video generation AI to recreate this exact product. Be precise and concise." },
            { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
          ]
        }]
      });

      return response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text || "");
    } catch (err: any) {
      console.error("Image Description Error:", err);
      throw new Error(`Failed to analyze reference image: ${err.message}`);
    }
  }

  static async curateSequence(
    availableSlots: any[],
    goal: string
  ): Promise<string[]> {
    const ai = this.getAI();

    // Create a catalog for the AI
    const catalog = availableSlots.map(s => `ID: ${s.id} | Type: ${s.clipType || 'General'} | Desc: ${s.description} | Dur: ${s.segment?.duration}s`).join('\n');

    const prompt = `
      🚨 ROLE: MASTER VIDEO EDITOR
      
      TASK: Select the perfect sequence of clips from the CATALOG below to build a "${goal}" video.
      
      CATALOG:
      ${catalog}
      
      RULES:
      1. Pick 3-6 clips that create a complete narrative arc (Hook -> Core Action -> Feature -> Payoff).
      2. IGNORE clips that seem redundant or low quality.
      3. ORDER MATTERS. The sequence must flow logically.
      
      OUTPUT:
      Return ONLY a JSON array of Strings, representing the IDs of the selected clips in order.
      Example: ["id_1", "id_5", "id_2"]
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json"
        } as any
      } as any);

      return this.parseGenAIResponse(response.text || "[]");
    } catch (err: any) {
      console.error("Auto-Curate Error:", err);
      throw new Error("Failed to auto-curate sequence.");
    }
  }

  static async applyStyleTransform(
    basePrompt: string,
    style: string
  ): Promise<string> {
    const ai = this.getAI();
    const prompt = `
      TASK: Rewrite the following video generation prompt to match a specific DIRECTORIAL STYLE.
      
      ORIGINAL PROMPT: "${basePrompt}"
      TARGET STYLE/VIBE: "${style}"
      
      INSTRUCTIONS:
      1. Keep the SUBJECT (product/action) exactly the same.
      2. Change the LIGHTING, CAMERA MOVEMENT, MOOD, and AESTHETIC to match the Target Style.
      3. Keep it under 40 words.
      
      OUTPUT: Just the new prompt text.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      return response.text?.trim() || basePrompt;
    } catch (e) {
      return basePrompt;
    }
  }

  static async generateVideoFromPrompt(
    prompt: string,
    onProgress: (status: string) => void,
    imageBase64?: string | null
  ): Promise<string> {
    const ai = this.getAI();
    onProgress("Initializing Veo Engine...");

    const generateConfig: any = {
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '9:16',
        includeAudio: true // Veo generates audio too
      }
    };

    if (imageBase64) {
      const mimeType = this.getMimeType(imageBase64);
      const data = imageBase64.split(',')[1]; // Remove header if present
      generateConfig.image = { imageBytes: data, mimeType: mimeType };
    }

    let result = await (ai as any).models.generateVideos(generateConfig);

    const startTime = Date.now();
    while (!result.done) {
      if (Date.now() - startTime > 180000) throw new Error("Video generation timed out (3m limit).");
      await new Promise(resolve => setTimeout(resolve, 5000));
      result = await (ai as any).operations.getVideosOperation({ operation: result });
      onProgress("Rendering video assets...");
    }

    // console.log("Veo Direct Response:", JSON.stringify(result, null, 2));

    const downloadLink = result.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      const rejectionReason = result.response?.generatedVideos?.[0]?.video?.rejectionReason;
      if (rejectionReason) throw new Error(`Video rejected: ${rejectionReason}`);
      throw new Error("No video generated.");
    }

    const videoResponse = await fetch(downloadLink);
    if (!videoResponse.ok) throw new Error("Failed to download generated video.");

    return URL.createObjectURL(await videoResponse.blob());
  }
}
