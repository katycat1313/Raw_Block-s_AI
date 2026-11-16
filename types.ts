
export enum Platform {
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  INSTAGRAM = 'instagram'
}

export enum AspectRatio {
  PORTRAIT = '9:16',
  LANDSCAPE = '16:9',
  SQUARE = '1:1'
}

export enum ConversionAngle {
  SOLUTION = 'The Instant Solution',
  LIFESTYLE = 'The Lifestyle Upgrade',
  URGENCY = 'The FOMO/Urgency',
  COMPARISON = 'The Contrast/Result'
}

export enum AppView {
  GENERATOR = 'generator',
  HISTORY = 'history',
  LIBRARY = 'library'
}

export interface SocialStrategy {
  caption: string;
  hashtags: string[];
  firstComment: string;
  bestTime: string;
  // Agent fields
  targetAudience?: string;
  videoType?: string;
  psychologicalTriggers?: string[];
  angle?: string;
  sentimentAnalysis?: string;
}

export interface CalendarEntry {
  day: string;
  platform: Platform;
  contentLabel: string;
  strategicGoal: string;
  hookType: string;
  optimalTime: string;
}

export interface AssetVariation {
  id: string;
  label: string;
  description: string;
  videoPrompt: string;
  imagePrompt: string;
  audioScript: string;
  ambientSoundDescription: string;
}

export interface ProductDetails {
  name: string;
  benefit: string;
  price: string;
  audience: string;
  cta: string;
  angle: ConversionAngle;
  affiliateLink?: string;
  productUrl?: string;
  customScript?: string;
  customVideoInstruction?: string;
}

export interface ResearchData {
  painPoints: string[];
  competitorWeakness: string[];
  winningHookPatterns: string[];
  sentimentScore: number;
  buyerIntentSignals: string[];
}

export interface OptimizedPrompt {
  videoPrompt: string;
  imagePrompt: string;
  hook: string;
  audioScript: string;
  conversionStrategy: string;
  visualBrief: string;
  psychologicalAngle: string;
  conversionScore: number;
  triggers: string[];
  variations: AssetVariation[];
  launchCalendar: CalendarEntry[];
  social: Record<Platform, SocialStrategy>;
  researchData?: ResearchData;
  discoveredVisualDna?: string;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  voiceoverUrl?: string;
  timestamp: number;
  prompt: string;
  label?: string;
  strategy?: SocialStrategy;
}

export interface ProductionRun {
  id: string;
  timestamp: number;
  details: ProductDetails;
  optimized: OptimizedPrompt;
  assets: GeneratedAsset[];
  referenceImages: string[];
}

export interface AppState {
  currentView: AppView;
  isKeySelected: boolean;
  isOptimizing: boolean;
  isGenerating: boolean;
  batchProgress: { current: number; total: number; label: string } | null;
  details: ProductDetails;
  referenceImages: string[];
  optimized: OptimizedPrompt | null;
  assets: GeneratedAsset[];
  history: ProductionRun[];
  error: string | null;
  customPrompt: string;
  customAudioScript: string;
  customVideoPrompt: string;
}

export interface CountdownSlot {
  id: string;
  rank: number;
  productName: string;
  description: string;
  productUrl?: string;
  customScript?: string;
  referenceYoutubeUrls?: string[];
  media: {
    images: string[];
    clips: string[];
  };
  excludeFromMaster?: boolean;
  category?: string;
  tags?: string[];
  targetAudience?: string;
  originalContext?: string;
  sourceVideoUrl?: string;
  clipType?: string;
  segment?: {
    startTime: string; // "MM:SS"
    endTime: string;   // "MM:SS"
    duration: number;  // seconds
  };
  generated: {
    videoUrl?: string;
    imageUrl?: string; // Reference image from Imagen 4
    audioUrl?: string;
    script?: string;
    videoPrompt?: string; // Veo 3.1 motion prompt
    imagePrompt?: string; // Imagen 4 static prompt
    status: 'idle' | 'generating' | 'done' | 'error';
    error?: string;
    debugLog?: string[];
  };
}

export interface AssetLibrary {
  slots: CountdownSlot[];
}

export interface DialogueEvent {
  agent: string;
  role: string;
  message: string;
  type: 'thought' | 'debate' | 'prompt' | 'finding';
  timestamp: number;
}

export interface CountdownProject {
  id: string;
  title: string;
  slots: CountdownSlot[];
  finalVideoUrl?: string;
  connectiveNarrative?: string;
  status: 'idle' | 'assembling' | 'done' | 'error' | 'agent_finished' | 'boardroom' | 'awaiting_approval';
  boardroomLog?: DialogueEvent[];
  settings: {
    isAffiliatePromotion: boolean;
    legalDisclosureText: string;
    debugMode: boolean;
    videoType?: string;
  };
}

// --- Agent Types ---

export interface ProductDossier {
  productName: string;
  description: string;
  images: string[];
  features: string[];
  referenceVideoUrls: string[]; // Includes the user provided one + found ones
  visualDna: string; // "Black matte finish, silver buttons..."
  specs: Record<string, string>;
  reviews: string[];
  pricePoint?: string;
  painPoints?: string[];
  productUrl?: string;
}

export interface BoxConfig {
  id: string;
  type: 'HERO' | 'MACRO' | 'IN_USE' | 'REVEAL' | 'ENVIRONMENTAL' | 'PACKAGING' | 'INTRO' | 'UNBOXING' | 'FEATURE' | 'COMPARISON' | 'PROBLEM_SOLUTION' | 'OUTRO' | 'TESTIMONIAL' | 'AD';
  duration: number;
  visualPrompt: string; // Motion prompt for Veo 3.1
  imagePrompt: string;  // Product reference prompt for Imagen 4
  audioScript: string;
  sfxDescription?: string;
  lighting?: string;
  camera?: string;
  transition: string;
  sourceClip?: {
    videoUrl: string;
    startTime: string;
    endTime: string;
  };
}

export interface VideoSequence {
  title: string;
  blocks: BoxConfig[];
  totalDuration: number;
  goal: string;
  musicTrack?: string;
}

export interface AgentStatus {
  step: 'researching' | 'strategizing' | 'directing' | 'refining' | 'production' | 'done';
  message: string;
  progress: number;
}


export enum VideoGoal {
  COMMENTS = 'comments',
  CLICKS   = 'clicks',
  TRAFFIC  = 'traffic',
  SIGNUPS  = 'signups',
  SALES    = 'sales',
  VIEWS    = 'views',
}

export const VIDEO_GOAL_CONFIG: Record<VideoGoal, {
  label: string;
  icon: string;
  tagline: string;
  hookStyle: string;
  ctaStyle: string;
  sceneHints: string;
  agentInstruction: string;
}> = {
  [VideoGoal.COMMENTS]: {
    label: 'Comments',
    icon: '💬',
    tagline: 'Spark conversation',
    hookStyle: 'Controversial or polarising opener — poses a question the viewer must answer',
    ctaStyle: 'End with an open question directed at the viewer ("Drop a comment: have you tried this?")',
    sceneHints: 'Show relatable pain-points and community moments; avoid hard-sell screens',
    agentInstruction: 'Optimise for comment rate. Use a debate-sparking hook. End with a direct viewer question. Avoid price mentions — focus on shared experience and relatability.',
  },
  [VideoGoal.CLICKS]: {
    label: 'Clicks',
    icon: '👆',
    tagline: 'Drive link taps',
    hookStyle: 'Curiosity gap or cliffhanger — viewer must click to get the payoff',
    ctaStyle: 'Prominent verbal CTA + on-screen arrow pointing to link ("Click the link in bio NOW")',
    sceneHints: 'Show the destination page loading — give a glimpse of what they get after clicking',
    agentInstruction: 'Optimise for click-through rate. Open with a curiosity gap. Show a preview of the landing destination. Close with an urgent, specific CTA directing viewers to the link.',
  },
  [VideoGoal.TRAFFIC]: {
    label: 'Traffic',
    icon: '🌐',
    tagline: 'Drive site visits',
    hookStyle: 'Authority / proof-based opener — show impressive metrics or results first',
    ctaStyle: 'State the URL clearly and repeat it; show it on screen ("Visit krechet.academy")',
    sceneHints: 'Prioritise analytics dashboards, SEO ranking charts, live traffic graphs to signal credibility',
    agentInstruction: 'Optimise for website visits. Lead with social proof (metrics, results). Show the app live. State and display the URL twice — verbally and on-screen.',
  },
  [VideoGoal.SIGNUPS]: {
    label: 'Sign-ups',
    icon: '✍️',
    tagline: 'Capture leads',
    hookStyle: 'Problem-aware hook — agitate the pain then immediately present the solution',
    ctaStyle: 'Walk through the sign-up flow on screen; end with "Create your free account today"',
    sceneHints: 'Must show: registration/onboarding screen, the first win a new user gets, success state',
    agentInstruction: 'Optimise for sign-up conversion. Agitate the problem in the hook. Demonstrate the onboarding flow visually. End with the registration screen visible and a low-friction CTA (free trial, no credit card).',
  },
  [VideoGoal.SALES]: {
    label: 'Sales',
    icon: '🛒',
    tagline: 'Convert buyers',
    hookStyle: 'Transformation hook — before/after framing or dramatic result reveal',
    ctaStyle: 'State pricing with anchor ("Normally , today only ") + urgency trigger + buy link',
    sceneHints: 'Show product in use delivering a clear result; include testimonial text overlay if available',
    agentInstruction: 'Optimise for purchase conversion. Use a transformation hook. Show the product delivering a tangible result. Include social proof. Close with price, urgency, and a direct buy CTA.',
  },
  [VideoGoal.VIEWS]: {
    label: 'Views',
    icon: '👁️',
    tagline: 'Maximise watch-time',
    hookStyle: 'Pattern interrupt — unexpected visual or bold statement in the first 1-2 seconds',
    ctaStyle: 'Soft CTA — "Follow for more" or "Save this video"; keep it low friction',
    sceneHints: 'Prioritise fast-paced, visually varied cuts; show the most striking UI moments first',
    agentInstruction: 'Optimise for watch-time and view count. Open with a pattern-interrupt visual. Keep cuts tight and energy high. End with a follow or save CTA — do not push hard conversion.',
  },
};
