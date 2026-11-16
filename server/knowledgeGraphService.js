import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const embeddingsCachePath = path.join(__dirname, 'storage', 'embeddings_cache.json');

/**
 * Cosine similarity between two float vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Load embeddings cache from disk.
 */
function loadEmbeddingsCache() {
  if (!fs.existsSync(embeddingsCachePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(embeddingsCachePath, 'utf8'));
  } catch (_) {
    return {};
  }
}

/**
 * Save embeddings cache to disk.
 */
function saveEmbeddingsCache(cache) {
  try {
    const dir = path.dirname(embeddingsCachePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(embeddingsCachePath, JSON.stringify(cache), 'utf8');
  } catch (_) {}
}

/**
 * Knowledge Graph mapping product features to semantic concepts.
 */
export const KNOWLEDGE_GRAPH = {
  features: {
    'Havoc Calls': {
      aliases: ['havoc call', 'crisis simulation', 'emergency client call', 'unexpected crisis', 'jenny crisis alert', 'pricing mistake'],
      concepts: ['havoc calls', 'crisis communications', 'client emergency', 'keep em on their toes', 'branching decisions', 'text from jenny', 'real-time sms', 'agency pressure', 'client retention'],
      relatedFeatures: ['Jenny\'s Artisan Java', 'Client Dossier & Messaging', 'SEO Workbench']
    },
    'Client Dossier & Messaging': {
      aliases: ['client dossier', 'message client', 'jenny message', 'client briefing', 'brand research', 'coffee roastery dossier'],
      concepts: ['client dossier', 'message the client', 'direct client messaging', 'unit economics', 'cac', 'ltv', 'revenue targets', 'unfair advantage', '48-hour roast freshness', 'supermarket stale beans', 'sensory copywriting'],
      relatedFeatures: ['Havoc Calls', 'SEO Workbench', 'Weekly Client Cadence']
    },
    'Weekly Client Cadence': {
      aliases: ['weekly simulation', 'new client each week', 'syllabus roadmap', 'curriculum structure', 'chapter 1 day 1'],
      concepts: ['new client each week', 'weekly cadence', 'pass the simulation', 'just-in-time learning', '7-day curriculum', 'hands-on simulation', 'free week trial', 'active execution', 'agency flight simulator'],
      relatedFeatures: ['Client Dossier & Messaging', 'SEO Workbench', 'Sarah Jenkins']
    },
    'SEO Workbench': {
      aliases: ['seo simulation', 'cms editor', 'h1 optimizer', 'audit score calculator', 'defect tracker'],
      concepts: ['seo workbench', 'defect tracking', 'h1 tags', 'headline optimization', 'audit scores', 'keyword optimization', 'cms editing', 'ga4 attribution', 'organic search growth', 'click benchmarks'],
      relatedFeatures: ['Havoc Calls', 'Client Dossier & Messaging', 'Sarah Jenkins']
    },
    'Sarah Jenkins': {
      aliases: ['ai mentor', 'sarah jenkins mentorship', 'ai instructor', 'marketing coach', 'socratic mentor'],
      concepts: ['ai mentor', 'feedback', 'socratic dialogue', 'coaching', 'simulation validation', 'search intent', '97% buyer readiness', 'proposing on first date', 'conversion rate optimization'],
      relatedFeatures: ['Weekly Client Cadence', 'SEO Workbench', 'Havoc Calls']
    }
  }
};

/**
 * Stage 4: Generate 3072-dimensional vector embedding for text using gemini-embedding-001.
 */
export async function getEmbedding(text, geminiApiKey) {
  const cleanText = (text || '').trim();
  if (!cleanText) return null;

  const cache = loadEmbeddingsCache();
  if (cache[cleanText]) {
    return cache[cleanText];
  }

  const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (!effectiveKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: cleanText
    });

    const vector = response.embeddings?.[0]?.values;
    if (vector && Array.isArray(vector)) {
      cache[cleanText] = vector;
      saveEmbeddingsCache(cache);
      return vector;
    }
  } catch (err) {
    console.warn('[KnowledgeGraph] Embedding generation error:', err.message);
  }
  return null;
}

/**
 * Expand a semantic query using the Knowledge Graph relations.
 */
export function expandQueryWithKnowledgeGraph(query) {
  const qLower = (query || '').toLowerCase();
  const expandedConcepts = new Set();
  expandedConcepts.add(qLower);

  for (const [featureName, node] of Object.entries(KNOWLEDGE_GRAPH.features)) {
    const isDirectMatch = qLower.includes(featureName.toLowerCase()) || node.aliases.some(a => qLower.includes(a));
    const isConceptMatch = node.concepts.some(c => qLower.includes(c));

    if (isDirectMatch || isConceptMatch) {
      expandedConcepts.add(featureName.toLowerCase());
      node.concepts.forEach(c => expandedConcepts.add(c));
    }
  }

  return Array.from(expandedConcepts).join(' ');
}

/**
 * Semantic Vector Search over Knowledge Blocks.
 * Replaces primitive string matching with embeddings + Knowledge Graph context.
 */
export async function searchKnowledgeBlocksSemantic({
  query,
  blocks = [],
  limit = 5,
  minScore = 40,
  geminiApiKey
}) {
  if (!blocks || blocks.length === 0) return [];
  const expandedQuery = expandQueryWithKnowledgeGraph(query);
  const queryVector = await getEmbedding(expandedQuery, geminiApiKey);

  const scoredBlocks = [];

  for (const block of blocks) {
    if (!block.reusable && (block.overallScore || 0) < minScore) continue;

    let vectorScore = 0.5; // Neutral baseline
    if (queryVector) {
      const blockText = `${block.feature || ''} ${block.transcript || ''} ${block.transcriptSummary || ''} ${(block.tags || []).join(' ')}`;
      const blockVector = await getEmbedding(blockText, geminiApiKey);
      if (blockVector) {
        vectorScore = cosineSimilarity(queryVector, blockVector);
      }
    }

    // Knowledge graph concept boost
    let graphBoost = 0;
    const blockHaystack = `${block.feature} ${block.transcript} ${(block.tags || []).join(' ')}`.toLowerCase();
    for (const [featureName, node] of Object.entries(KNOWLEDGE_GRAPH.features)) {
      if (blockHaystack.includes(featureName.toLowerCase()) || node.aliases.some(a => blockHaystack.includes(a))) {
        const queryMatchesConcept = node.concepts.some(c => expandedQuery.toLowerCase().includes(c));
        if (queryMatchesConcept) {
          graphBoost += 0.20;
          break;
        }
      }
    }

    // Composite semantic relevance score:
    // 50% Vector Similarity + 20% Knowledge Graph Boost + 30% Quality Teaching Score
    const qualityFactor = ((block.overallScore || 70) / 100);
    const finalRelevance = (vectorScore * 0.50) + (graphBoost) + (qualityFactor * 0.30);

    scoredBlocks.push({
      ...block,
      semanticRelevance: Number(finalRelevance.toFixed(3)),
      vectorSimilarity: Number(vectorScore.toFixed(3)),
      graphBoost: Number(graphBoost.toFixed(3))
    });
  }

  // Sort descending by final relevance
  scoredBlocks.sort((a, b) => b.semanticRelevance - a.semanticRelevance);
  return scoredBlocks.slice(0, limit);
}
