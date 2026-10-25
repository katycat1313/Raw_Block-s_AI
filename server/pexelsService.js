import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getVideoMetadata, generateThumbnail } from './ffmpegService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stockCacheDir = path.join(__dirname, 'storage', 'stock_cache');

// Curated reaction clips that are immediately usable without any third-party credentials
export const CURATED_REACTION_CLIPS = [
  {
    id: 'stock-frustrated-theory',
    title: 'Frustrated Student - Outdated Lectures & Zero Practice',
    category: 'reaction',
    tags: ['shaking head', 'frustrated', 'lectures', 'tired', 'disappointed', 'boring', 'interview'],
    previewUrl: '/storage/thumbnails/stock_frustrated_theory.mp4.jpg',
    videoUrl: '/storage/stock_cache/stock_frustrated_theory.mp4',
    duration: 6.5
  },
  {
    id: 'stock-interview-doubt',
    title: 'Job Interview - Employers Demanding Real Experience',
    category: 'business',
    tags: ['interview', 'doubt', 'questions', 'resume', 'career', 'job', 'hiring'],
    previewUrl: '/storage/thumbnails/stock_interview_doubt.mp4.jpg',
    videoUrl: '/storage/stock_cache/stock_interview_doubt.mp4',
    duration: 6.5
  },
  {
    id: 'stock-client-simulation',
    title: 'Live Client Campaigns & Marketing Simulation Sandbox',
    category: 'marketing',
    tags: ['simulation', 'workshop', 'client', 'campaign', 'laptop', 'hands-on', 'typing', 'analytics'],
    previewUrl: '/storage/thumbnails/stock_client_simulation.mp4.jpg',
    videoUrl: '/storage/stock_cache/stock_client_simulation.mp4',
    duration: 6.5
  },
  {
    id: 'stock-hired-portfolio',
    title: 'Hired! Portfolio Verified & Trusted by Employers',
    category: 'success',
    tags: ['hired', 'portfolio', 'certification', 'trust', 'handshake', 'success', 'offer'],
    previewUrl: '/storage/thumbnails/stock_hired_portfolio.mp4.jpg',
    videoUrl: '/storage/stock_cache/stock_hired_portfolio.mp4',
    duration: 6.5
  }
];

/**
 * Search stock B-Roll video clips via Pexels API with curated fallback.
 */
export async function searchBrollClips({ query, apiKey, limit = 8 }) {
  const effectiveApiKey = apiKey || process.env.PEXELS_API_KEY;

  if (!effectiveApiKey) {
    console.log(`[B-Roll] Searching curated reaction catalog for: "${query}"`);
    const qLower = (query || '').toLowerCase();
    const matched = CURATED_REACTION_CLIPS.filter(c => 
      c.tags.some(t => qLower.includes(t) || t.includes(qLower)) ||
      c.title.toLowerCase().includes(qLower)
    );
    return matched.length > 0 ? matched : CURATED_REACTION_CLIPS;
  }

  try {
    const endpoint = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`;
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': effectiveApiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RawBlocksStudio/1.0'
      }
    });

    if (!res.ok) {
      console.warn(`[Pexels API Error ${res.status}], using curated clips fallback.`);
      return CURATED_REACTION_CLIPS;
    }

    const data = await res.json();
    if (!data.videos || data.videos.length === 0) {
      return CURATED_REACTION_CLIPS;
    }

    return (data.videos || []).map(v => {
      const file = v.video_files?.find(f => f.quality === 'hd' && f.width >= 1280) || v.video_files?.[0];
      return {
        id: `pexels-${v.id}`,
        title: `Pexels Stock: ${query}`,
        previewUrl: v.image,
        videoUrl: file?.link,
        duration: v.duration,
        width: file?.width || 1920,
        height: file?.height || 1080
      };
    });
  } catch (err) {
    console.warn('[Pexels Error]', err.message);
    return CURATED_REACTION_CLIPS;
  }
}

/**
 * Download or import a selected B-Roll video into server storage and index it as an asset.
 */
export async function importBrollClip({ videoUrl, title, outputDir }) {
  const fileId = `broll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const filename = `${fileId}.mp4`;
  const filePath = path.join(outputDir, filename);

  console.log(`[B-Roll] Importing clip: ${title || videoUrl}`);

  // 1. Check if it's a local stock cache clip
  if (videoUrl.includes('/storage/stock_cache/')) {
    const baseName = path.basename(videoUrl);
    const localStockPath = path.join(stockCacheDir, baseName);
    if (fs.existsSync(localStockPath)) {
      console.log(`[B-Roll] Copying curated stock clip: ${baseName}`);
      fs.copyFileSync(localStockPath, filePath);
      const meta = await getVideoMetadata(filePath);
      return {
        filePath,
        filename,
        title: title || 'Stock B-Roll Reaction',
        duration: meta.duration,
        width: meta.width,
        height: meta.height
      };
    }
  }

  // 2. Otherwise download remote URL (e.g. from Pexels API)
  try {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  } catch (downloadErr) {
    console.warn(`[B-Roll] Download failed (${downloadErr.message}). Using local stock fallback.`);
    // Fallback to stock cache
    const fallbackFile = path.join(stockCacheDir, 'stock_client_simulation.mp4');
    if (fs.existsSync(fallbackFile)) {
      fs.copyFileSync(fallbackFile, filePath);
    } else {
      throw downloadErr;
    }
  }

  const meta = await getVideoMetadata(filePath);
  console.log(`[B-Roll] Clip saved successfully: ${filename} (${meta.duration.toFixed(1)}s)`);

  return {
    filePath,
    filename,
    title: title || 'Stock B-Roll Clip',
    duration: meta.duration,
    width: meta.width,
    height: meta.height
  };
}
