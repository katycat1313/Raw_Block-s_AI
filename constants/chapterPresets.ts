export interface ChapterPreset {
  part: number;
  title: string;
  summary: string;
  script: string;
}

export const CHAPTER_PRESETS: ChapterPreset[] = [
  {
    part: 1,
    title: 'Ch 1: The Hook & Simulation Cockpit',
    summary: 'The Theory Trap & Day 1 Launcher',
    script: `[Part 1] Most digital marketing courses trap you in outdated theory and passive videos. At Krechet Academy, your journey begins immediately in the simulation cockpit—where you choose your learning mode and launch directly into real-world business challenges.`
  },
  {
    part: 2,
    title: 'Ch 2: Live AI Mentorship',
    summary: 'Sarah Jenkins 1-on-1 Guidance',
    script: `[Part 2] You're never left guessing. With your personal AI mentor Sarah Jenkins, you receive instant, tailored feedback on search intent, conversion rate optimization, and real agency problem-solving as you execute.`
  },
  {
    part: 3,
    title: 'Ch 3: Agency Client Dossier',
    summary: 'Jenny\'s Artisan Java & Unit Economics',
    script: `[Part 3] Step into the shoes of a marketing agency lead. In your client onboarding dossier for Jenny's Artisan Java, you analyze real revenue targets, customer acquisition costs, and unit economics before touching a single campaign.`
  },
  {
    part: 4,
    title: 'Ch 4: SEO Workbench & Call to Action',
    summary: 'Live CMS Optimization & Real-Time Score',
    script: `[Part 4] Jump straight into the live SEO workbench. Edit heading structures, optimize meta descriptions, and publish live changes to watch your audit scores climb in real time. Future-proof your marketing career with real hands-on execution. Start your 7-day trial at Krechet Academy today.`
  }
];
