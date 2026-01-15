
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
  HISTORY = 'history'
}

export interface SocialStrategy {
  caption: string;
  hashtags: string[];
  firstComment: string;
  bestTime: string;
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
  media: {
    images: string[];
    clips: string[];
  };
  excludeFromMaster?: boolean;
  category?: string;
  tags?: string[];
  generated: {
    videoUrl?: string;
    audioUrl?: string;
    script?: string;
    videoPrompt?: string;
    status: 'idle' | 'generating' | 'done' | 'error';
    error?: string;
  };
}

export interface AssetLibrary {
  slots: CountdownSlot[];
}

export interface CountdownProject {
  id: string;
  title: string;
  slots: CountdownSlot[];
  finalVideoUrl?: string;
  connectiveNarrative?: string;
  status: 'idle' | 'assembling' | 'done' | 'error';
}
