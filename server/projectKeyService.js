import fs from 'fs';
import path from 'path';

/**
 * Categorize a video clip into one of the 5 standardized commercial video archetypes:
 * A: Hooks & Problem Agitation (B-Roll Reactions)
 * B: Core App Simulations & Interactive Workflows (Screen UI)
 * C: Metrics, Analytics & Reporting Dashboards (Numbers/Data)
 * D: Social Proof, Certifications & Portfolios (Outcomes)
 * E: Offers, Pricing & Calls to Action (Outro/Signup)
 */
export function classifyClipCategory(clip) {
  const text = `${clip.title || ''} ${clip.description || ''} ${(clip.tags || []).join(' ')} ${clip.originalName || ''} ${clip.filename || ''}`.toLowerCase();

  // D: Social Proof, Certification, Portfolio, Hiring, Interview
  if (
    text.includes('portfolio') ||
    text.includes('cert') ||
    text.includes('hire') ||
    text.includes('interview') ||
    text.includes('success') ||
    text.includes('alumni') ||
    text.includes('employer')
  ) {
    return 'D';
  }

  // A: Hooks, Frustration, Doubt, Theory vs Practice, Boredom, B-Roll reactions
  if (
    text.includes('broll') ||
    text.includes('frustrat') ||
    text.includes('theory') ||
    text.includes('doubt') ||
    text.includes('bored') ||
    text.includes('lecture') ||
    text.includes('shaking head') ||
    text.includes('hook') ||
    text.includes('fail')
  ) {
    return 'A';
  }

  // C: Metrics, Reports, Performance, Analytics, Havoc, Conversion
  if (
    text.includes('report') ||
    text.includes('preformance') ||
    text.includes('performance') ||
    text.includes('metric') ||
    text.includes('analytic') ||
    text.includes('conversion') ||
    text.includes('traffic') ||
    text.includes('growth') ||
    text.includes('havoc') ||
    text.includes('kpi')
  ) {
    return 'C';
  }

  // E: Offers, Pricing, Free Trial, Subscribe, CTA
  if (
    text.includes('pricing') ||
    text.includes('trial') ||
    text.includes('subscribe') ||
    text.includes('offer') ||
    text.includes('cta') ||
    text.includes('sign up')
  ) {
    return 'E';
  }

  // B: Core App Simulations & Interactive Features (Default for UI / recordings)
  return 'B';
}

export const CATEGORY_DEFINITIONS = {
  A: {
    letter: 'A',
    icon: '🎣',
    name: 'Hooks & Problem Agitation',
    role: 'hook_problem',
    color: '#f87171',
    description: 'B-roll reactions, student frustration, the "theory trap", and scroll-stopping hooks'
  },
  B: {
    letter: 'B',
    icon: '⚡',
    name: 'Core App Simulations & Workflows',
    role: 'live_demo',
    color: '#38bdf8',
    description: 'Active client simulations, campaign builders, and interactive app walkthroughs'
  },
  C: {
    letter: 'C',
    icon: '📊',
    name: 'Metrics, Analytics & Dashboards',
    role: 'metrics_results',
    color: '#fbbf24',
    description: 'Performance reports, real-time conversion graphs, and traffic dashboards'
  },
  D: {
    letter: 'D',
    icon: '🏆',
    name: 'Proof, Portfolios & Certifications',
    role: 'social_proof',
    color: '#34d399',
    description: 'Live verified portfolios, employer credentials, and student outcome proof'
  },
  E: {
    letter: 'E',
    icon: '🎯',
    name: 'Offers, Pricing & Calls to Action',
    role: 'call_to_action',
    color: '#f472b6',
    description: '1-week free trial, $97/mo pricing, subscribe buttons, and outro screen'
  }
};

/**
 * Assigns clean letter codes (A1, A2, B1, B2, C1...) to an array of clips.
 */
export function assignBlockTaxonomy(clips) {
  const buckets = { A: [], B: [], C: [], D: [], E: [] };

  // Sort into buckets
  clips.forEach((clip) => {
    const cat = classifyClipCategory(clip);
    buckets[cat].push(clip);
  });

  const enriched = [];

  ['A', 'B', 'C', 'D', 'E'].forEach((letter) => {
    buckets[letter].forEach((clip, idx) => {
      const code = `${letter}${idx + 1}`;
      const catDef = CATEGORY_DEFINITIONS[letter];
      enriched.push({
        ...clip,
        blockCode: code,
        categoryLetter: letter,
        categoryName: catDef.name,
        categoryIcon: catDef.icon,
        categoryColor: catDef.color
      });
    });
  });

  return enriched;
}

/**
 * Generates human-readable BLOCK_KEY.txt content for the active project folder.
 */
export function formatBlockKeyText({ projectName, appUrl, clips }) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const buckets = { A: [], B: [], C: [], D: [], E: [] };

  clips.forEach((clip) => {
    const letter = clip.categoryLetter || classifyClipCategory(clip);
    if (!buckets[letter]) buckets[letter] = [];
    buckets[letter].push(clip);
  });

  let text = '';
  text += '========================================================================================\n';
  text += `🎬 RAW BLOCKS AI: MASTER TAXONOMY KEY & ASSET DECODER\n`;
  text += `   Project Folder : ${projectName}\n`;
  text += `   Target App URL : ${appUrl || 'N/A'}\n`;
  text += `   Generated At   : ${now}\n`;
  text += `   Total Blocks   : ${clips.length} labeled blocks ready for automated assembly\n`;
  text += '========================================================================================\n\n';

  text += 'HOW TO DIRECT AGENTS WITH THIS KEY:\n';
  text += 'You can instruct the agents by block code in your prompts!\n';
  text += 'Example: "Start with Hook [A1], cut to Live Simulator [B1] at 1.25x speed, show Metrics [C1], and close with Proof [D1]."\n\n';
  text += '----------------------------------------------------------------------------------------\n\n';

  ['A', 'B', 'C', 'D', 'E'].forEach((letter) => {
    const def = CATEGORY_DEFINITIONS[letter];
    const items = buckets[letter] || [];
    text += `[CATEGORY ${def.letter}] ${def.icon} ${def.name.toUpperCase()} (${items.length} Blocks)\n`;
    text += `Purpose: ${def.description}\n`;
    text += '----------------------------------------------------------------------------------------\n';

    if (items.length === 0) {
      text += `  (No clips assigned to this category yet)\n\n`;
      return;
    }

    items.forEach((item, idx) => {
      const code = item.blockCode || `${letter}${idx + 1}`;
      const duration = (item.duration || 4.0).toFixed(1);
      const type = item.contentType === 'screen_recording' ? 'SCREEN UI' : 'STOCK B-ROLL';
      text += `  • [${code}] ${item.title}\n`;
      text += `      Type     : ${type} | Runtime: ~${duration}s | Res: ${item.width || 1920}x${item.height || 1080}\n`;
      text += `      File     : ${item.filename || path.basename(item.filePath || '')}\n`;
      text += `      Content  : ${item.description || 'Raw video block ready for narrative beat.'}\n`;
      if (item.tags && item.tags.length > 0) {
        text += `      Tags     : ${item.tags.join(', ')}\n`;
      }
      text += '\n';
    });

    text += '\n';
  });

  text += '========================================================================================\n';
  text += 'END OF TAXONOMY KEY - RAW BLOCKS AI STUDIO\n';
  text += '========================================================================================\n';

  return text;
}

/**
 * Ensures the project folder and its BLOCK_KEY.txt exist on disk.
 */
export function syncProjectKeyFile({ storageDir, projectName = 'krechet_academy', appUrl = 'https://krechetacademy.com', clips = [] }) {
  const projectsDir = path.join(storageDir, 'projects');
  const projectFolder = path.join(projectsDir, projectName);

  if (!fs.existsSync(projectFolder)) {
    fs.mkdirSync(projectFolder, { recursive: true });
  }

  // Update or create project.json metadata
  const metaPath = path.join(projectFolder, 'project.json');
  const meta = {
    projectName,
    appUrl,
    updatedAt: new Date().toISOString(),
    clipsCount: clips.length
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  // Format and save BLOCK_KEY.txt
  const keyContent = formatBlockKeyText({ projectName, appUrl, clips });
  const keyPath = path.join(projectFolder, 'BLOCK_KEY.txt');
  fs.writeFileSync(keyPath, keyContent, 'utf8');

  return {
    projectFolder,
    keyPath,
    keyContent
  };
}
