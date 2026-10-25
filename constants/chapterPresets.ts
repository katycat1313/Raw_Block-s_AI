export interface ChapterPreset {
  part: number;
  title: string;
  summary: string;
  script: string;
}

export const CHAPTER_PRESETS: ChapterPreset[] = [
  {
    part: 1,
    title: 'Ch 1: The Hook',
    summary: 'The Theory Trap',
    script: `[Part 1] Most digital marketing courses teach you how theory used to work five years ago. Endless slide decks, zero real-world feedback, and no idea how to actually scale a brand from scratch. If you're tired of courses that leave you with a certificate and zero confidence, it's time to look at what sets The Kreative Academy apart.`
  },
  {
    part: 2,
    title: 'Ch 2: How It Works',
    summary: 'Live Multi-Module Execution',
    script: `[Part 2] Unlike typical platforms that rely entirely on pre-recorded lectures, The Kreative Academy focuses on a 100% practical, multi-module execution model. Instead of just reading about SEO, funnels, and ad metrics, you’re actively building, auditing, and optimizing live campaigns. You get hands-on mentorship from industry veterans who teach from current market experience—not outdated textbooks.`
  },
  {
    part: 3,
    title: 'Ch 3: Key Advantages',
    summary: 'AI Workflows & Placement',
    script: `[Part 3] What makes subscribing to this platform a game-changer? AI-Driven Workflows: Master modern automation and AI-integrated social media strategies that save hours of grunt work. Live Project Experience: Work directly on real business pages and scenarios rather than hypothetical case studies. Verified Placement Support: Benefit from structured career guidance and placement pathways designed to take you from a complete beginner to a hired professional.`
  },
  {
    part: 4,
    title: 'Ch 4: Call to Action',
    summary: 'Subscribe & Future-Proof Career',
    script: `[Part 4] Stop learning marketing in theory and start executing it in practice. Step inside the modern production ecosystem, build your portfolio, and future-proof your career. Subscribe to The Kreative Academy today and master the skills that actually drive revenue.`
  }
];
