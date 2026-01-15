import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProductDetails, OptimizedPrompt, Platform, AspectRatio, AssetVariation } from "../types";

export class GeminiService {
  private static getAI() {
    const key = localStorage.getItem('conversionflow_key');
    if (!key) throw new Error("No API Key detected. Please connect in Factory Config.");
    return new GoogleGenAI({ apiKey: key });
  }

  private static getAPIKey(): string {
    const key = localStorage.getItem('conversionflow_key');
    if (!key) throw new Error("No API Key detected. Please connect in Factory Config.");
    return key;
  }

  private static getMimeType(base64: string): string {
    const match = base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9.+_-]+);base64,/);
    return match ? match[1] : 'image/jpeg';
  }

  static async optimizePrompts(details: ProductDetails, platform: Platform, images?: string[]): Promise<OptimizedPrompt> {
    const ai = this.getAI();

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

Language Style: Use an ENGAGING AND SWEET tone that people love to hear. Establish IMMEDIATE TRUST AND AUTHORITY by highlighting authentic product details. Lead with a hook, but maintain a helpful, premium, and friendly vibe. No corporate or aggressive sales speak; your goal is to be a trusted advisor who genuinely loves the product.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedProductName: { type: Type.STRING, description: details.productUrl ? "The EXACT product name as found on the provided URL - this confirms you fetched the correct product" : "Product name" },
              videoPrompt: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              hook: { type: Type.STRING },
              audioScript: { type: Type.STRING },
              conversionStrategy: { type: Type.STRING },
              visualBrief: { type: Type.STRING },
              psychologicalAngle: { type: Type.STRING },
              conversionScore: { type: Type.NUMBER },
              researchData: {
                type: Type.OBJECT,
                properties: {
                  painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  competitorWeakness: { type: Type.ARRAY, items: { type: Type.STRING } },
                  winningHookPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sentimentScore: { type: Type.INTEGER },
                  buyerIntentSignals: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["painPoints", "competitorWeakness", "winningHookPatterns", "sentimentScore", "buyerIntentSignals"]
              },
              triggers: { type: Type.ARRAY, items: { type: Type.STRING } },
              variations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    videoPrompt: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING },
                    audioScript: { type: Type.STRING },
                    ambientSoundDescription: { type: Type.STRING }
                  },
                  required: ["id", "label", "description", "videoPrompt", "imagePrompt", "audioScript", "ambientSoundDescription"]
                }
              },
              launchCalendar: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    platform: { type: Type.STRING },
                    contentLabel: { type: Type.STRING },
                    strategicGoal: { type: Type.STRING },
                    hookType: { type: Type.STRING },
                    optimalTime: { type: Type.STRING, description: "Research-backed best posting time based on platform and 2026 trends" }
                  },
                  required: ["day", "platform", "contentLabel", "strategicGoal", "hookType", "optimalTime"]
                }
              },
              social_tiktok_caption: { type: Type.STRING },
              social_tiktok_hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              social_tiktok_bestTime: { type: Type.STRING, description: "Research-backed peak posting time for TikTok" },
              social_youtube_caption: { type: Type.STRING },
              social_youtube_hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              social_youtube_bestTime: { type: Type.STRING, description: "Research-backed peak posting time for YouTube" },
              social_instagram_caption: { type: Type.STRING },
              social_instagram_hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              social_instagram_bestTime: { type: Type.STRING, description: "Research-backed peak posting time for Instagram" },
              discoveredVisualDna: { type: Type.STRING, description: "Detailed visual description of the product based on discovered search clips and images to ensure 100% fidelity" }
            },
            required: [
              "extractedProductName", "videoPrompt", "imagePrompt", "hook", "audioScript", "conversionStrategy",
              "visualBrief", "psychologicalAngle", "conversionScore", "researchData", "triggers",
              "variations", "launchCalendar", "social_tiktok_caption", "social_tiktok_hashtags", "social_tiktok_bestTime",
              "social_youtube_caption", "social_youtube_hashtags", "social_youtube_bestTime",
              "social_instagram_caption", "social_instagram_hashtags", "social_instagram_bestTime", "discoveredVisualDna"
            ]
          }
        } as any
      });

      if (!response.text) {
        console.error("Gemini API Error: Empty response or safety block", response);
        throw new Error("The AI Research Engine returned no data. This is typically due to safety filters or a temporary API outage. Try adjusting your brand description.");
      }

      const raw = JSON.parse(response.text);
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
      return JSON.parse(response.text) as AssetVariation;
    } catch (err: any) {
      console.error("Expansion Variation Error:", err);
      throw new Error(`Custom expansion failed: ${err.message}`);
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
          model: 'imagen-4.0-generate-001',
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
        model: 'imagen-4.0-generate-001',
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
            text: `🚨 YOU ARE ANALYISING SOURCE MEDIA FOR A PREMIUM PRODUCT VIDEO. 
            
            YOUR MISSION:
            1. Identify the EXACT product, its features, and its aesthetic.
            2. Describe the movement, lighting, and environment in the provided clips.
            3. CREATE A GENERATION PROMPT THAT ENHANCES AND EXTENDS THIS SPECIFIC MEDIA.
            
            🚨 MANDATORY: DO NOT "BUTCHER" THE SOURCE MEDIA. 
            Your goal is to SHAPE and ENHANCE what you see into a high-quality product clip.
            - If a clip shows a hand movement, describe it to maintain continuity.
            - If a clip has a specific lighting style, preserve it.
            - Focus on "Cinematic Extension" - making the source material look like a premium studio-grade advertisement.

            MANDATORY VISUAL ANALYSIS:
            - PRODUCT: Colors, materials, branding, text.
            - MOTION: How the product is being moved or used in clips.
            - AESTHETIC: Lighting, background, camera angle.

            NOW CREATE A VIDEO GENERATION PROMPT based on this scene: "${prompt}"

            The prompt MUST include:
            - The EXACT product from the source media.
            - Instructions to EXTEND and ENHANCE the existing visual context.
            - "Stitched Continuity" - ensure the new video feels like it belongs with the provided clips.
            - 8 seconds of smooth, high-fidelity footage.

            FORMAT YOUR RESPONSE AS:
            VISUAL ANALYSIS: [Detailed observations]
            VIDEO GENERATION PROMPT: [Complete detailed prompt focusing on enhancement and continuity]` }
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

    const constraint = " MAXIMUM VISUAL FIDELITY. Rigid object permanence. No morphing. Clean cinematic motion. Professional studio lighting. 4K ProRES aesthetic.";
    const continuityFocus = " MAINTAIN VISUAL CONTINUITY: The generated clip MUST look like a premium enhancement of the provided source media. Do not deviate from the product appearance or core aesthetic.";

    const finalVideoPrompt = `CINEMATIC PRODUCT ADVERTISEMENT. ${videoPrompt}. AMBIENT: ${ambientSound}. ${constraint}${continuityFocus}`;

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
    while (!result.done) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      result = await (ai as any).operations.getVideosOperation({ operation: result });
      onProgress("Refining product details & cinematic motion...");
    }

    const downloadLink = result.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URL returned from Veo generation");
    const apiKey = this.getAPIKey();
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
    return URL.createObjectURL(await response.blob());
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
        model: 'imagen-4.0-generate-001',
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

    while (!result.done) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      result = await (ai as any).operations.getVideosOperation({ operation: result });
      onProgress("Applying corrections and validating accuracy...");
    }

    const downloadLink = result.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URL returned from Veo generation");
    const apiKey = this.getAPIKey();
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
    return URL.createObjectURL(await response.blob());
  }

  static async generateConnectiveNarrative(slots: { rank: number, name: string }[]): Promise<string> {
    const ai = this.getAI();
    const slotContext = slots.map(s => `Rank #${s.rank}: ${s.name}`).join('\n');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{
          role: 'user', parts: [{
            text: `You are writing a CONNECTIVE NARRATIVE for a top ${slots.length} countdown video. 
        Your goal is to provide the "glue" that holds the video together.
        
        SITUATION:
        We have ${slots.length} products being showcased. Each product has its own detailed description.
        You need to write an INTRO, TRANSITIONS between ranks, and an OUTRO.
        
        TONE:
        Engaging, sweet, approachable, and premium. You sound like a helpful friend who is genuinely excited about these finds.

        PRODUCTS:
        ${slotContext}

        OUTPUT FORMAT:
        Write a single cohesive script that leaves pauses (marked as [PAUSE]) where the product-specific descriptions will go.
        
        EXAMPLE: "Today we're looking at the top ${slots.length} game changers for your home. Starting things off... [PAUSE] ...and that was rank ${slots[0].rank}. But moving on to rank ${slots[1]?.rank || 'X'}, this next one is a total life saver... [PAUSE] ...and finally, our number one spot, the ultimate choice... [PAUSE] ...thanks for watching our top ${slots.length} countdown!"

        Keep it concise and focus on the SEAMLESS FLOW.` }]
        }],
      });

      return response.text || '';
    } catch (err: any) {
      console.error("Connective Narrative Error:", err);
      throw new Error(`Failed to generate connective narrative: ${err.message}`);
    }
  }
}
