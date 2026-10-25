import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
import { generateThumbnail } from './ffmpegService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stockDir = path.join(__dirname, 'storage', 'stock_cache');
const thumbDir = path.join(__dirname, 'storage', 'thumbnails');
if (!fs.existsSync(stockDir)) fs.mkdirSync(stockDir, { recursive: true });
if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

const clipsToGen = [
  {
    file: 'stock_frustrated_theory.mp4',
    title: 'Frustrated with Boring Lectures & Zero Practice',
    category: 'reaction',
    tags: ['shaking head', 'frustrated', 'lectures', 'tired', 'disappointed'],
    color: '#1a101f',
    text: 'FRUSTRATED WITH OUTDATED DIGITAL MARKETING COURSES',
    sub: 'Hours of video lectures with zero hands-on campaign work'
  },
  {
    file: 'stock_interview_doubt.mp4',
    title: 'Job Interview: How Do You Prove Real Experience?',
    category: 'business',
    tags: ['interview', 'doubt', 'questions', 'resume', 'career'],
    color: '#0f172a',
    text: 'JOB INTERVIEW: HOW DO YOU PROVE REAL EXPERIENCE?',
    sub: 'Employers want to see verified campaign results, not paper certs'
  },
  {
    file: 'stock_client_simulation.mp4',
    title: 'Interactive Client Simulation Workshops',
    category: 'marketing',
    tags: ['simulation', 'workshop', 'client', 'campaign', 'laptop', 'hands-on'],
    color: '#042f2e',
    text: 'LIVE CLIENT WORKSHOPS & INTERACTIVE SIMULATION',
    sub: 'Practice with real budgets, live ad managers, and client briefs'
  },
  {
    file: 'stock_hired_portfolio.mp4',
    title: 'Employer-Trusted Portfolio & Real Experience Certificate',
    category: 'success',
    tags: ['hired', 'portfolio', 'certification', 'trust', 'handshake', 'success'],
    color: '#142a17',
    text: 'PROVEN PORTFOLIO THAT EMPLOYERS ACTUALLY TRUST',
    sub: 'Your coursework automatically builds a live verifiable showcase'
  }
];

async function generateAll() {
  console.log('[StockGenerator] Generating 4 baseline 1080p stock assets...');

  for (const item of clipsToGen) {
    const targetFile = path.join(stockDir, item.file);
    const thumbFile = path.join(thumbDir, `${item.file}.jpg`);

    const vf = [
      `drawtext=text='${item.text}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2-35:box=1:boxcolor=black@0.65:boxborderw=24`,
      `drawtext=text='${item.sub}':fontcolor=0x94a3b8:fontsize=26:x=(w-text_w)/2:y=(h-text_h)/2+40:box=1:boxcolor=black@0.5:boxborderw=16`,
      `vignette=PI/3.5`
    ].join(',');

    const args = [
      '-f', 'lavfi',
      '-i', `color=c=${item.color}:s=1920x1080:d=6.5`,
      '-vf', vf,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y',
      targetFile
    ];

    await new Promise((resolve, reject) => {
      execFile(ffmpegStatic, args, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    try {
      await generateThumbnail(targetFile, thumbFile, 1.0);
    } catch (_) {}

    console.log(`[StockGenerator] Rendered: ${item.file}`);
  }

  console.log('[StockGenerator] All stock reaction assets generated successfully!');
}

generateAll().catch(e => console.error(e));
