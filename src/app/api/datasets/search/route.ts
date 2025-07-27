import { NextRequest, NextResponse } from 'next/server';

// For HuggingFace API (use environment variable only)
const HF_TOKEN = process.env.HF_TOKEN;
// For GitHub API (use environment variable only)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// For Kaggle API, we'll use the kaggle CLI via child_process (since there's no official REST API)
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function createProxyUrl(externalUrl: string): string {
  // Use a relative path for the proxy, which will be handled by Next.js routing
  return `/api/image-proxy?url=${encodeURIComponent(externalUrl)}`;
}

// Helper: Find kaggle.json in common locations
function findKaggleConfig() {
  const candidates = [
    path.join(process.cwd(), 'kaggle.json'),
    path.join(process.cwd(), 'kaggle', 'kaggle.json'),
    path.join(process.cwd(), 'kaggle(1).json'),
    path.join(process.cwd(), 'kaggle(2).json'),
    path.join(process.env.HOME || '', '.kaggle', 'kaggle.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function parseKaggleCreds(file: string) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return { username: data.username, key: data.key };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query') || '';
  const results: any[] = [];
  const errors: any[] = [];

  // --- HuggingFace Datasets Search ---
  try {
    const hfRes = await fetch(`https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
    });
    if (hfRes.ok) {
      const hfData = await hfRes.json();
      for (const ds of hfData) {
        const queryTerms = new Set<string>();
        const idPart = ds.id.split('/').pop() || ds.id;
        queryTerms.add(idPart.replace(/-/g, ' '));
        (ds.tags || []).forEach(tag => {
            if (tag.startsWith('modality:')) {
                queryTerms.add(tag.split(':')[1]);
            }
        });
        const searchQuery = Array.from(queryTerms).filter(Boolean).join(',');
        const unsplashUrl = `https://source.unsplash.com/300x200/?${encodeURIComponent(searchQuery || 'data')}`;
        const seed = ds.id.replace('/', '');
        let imageUrl = createProxyUrl(`https://picsum.photos/seed/${seed}/300/200`);

        const hasImageTag = (ds.tags || []).includes('modality:image');
        const isVisionDataset = (ds.tags || []).includes('computer-vision');

        if (hasImageTag || isVisionDataset) {
            try {
                const detailsRes = await fetch(`https://huggingface.co/api/datasets/${ds.id}`, {
                    headers: { Authorization: `Bearer ${HF_TOKEN}` },
                });
                if (detailsRes.ok) {
                    const detailsData = await detailsRes.json();
                    const imageFile = (detailsData.siblings || []).find(f => 
                        f.rfilename.endsWith('.png') || 
                        f.rfilename.endsWith('.jpg') || 
                        f.rfilename.endsWith('.jpeg') ||
                        f.rfilename.endsWith('.gif') ||
                        f.rfilename.endsWith('.webp')
                    );

                    if (imageFile) {
                        const hfImageUrl = `https://huggingface.co/datasets/${ds.id}/resolve/main/${encodeURIComponent(imageFile.rfilename)}`;
                        imageUrl = createProxyUrl(hfImageUrl);
                    }
                }
            } catch (e) {
                // Could log this error, but for now we'll just fall back to unsplash
                console.error(`Failed to fetch details for HF dataset ${ds.id}`, e);
            }
        }
        
        results.push({
          name: ds.id,
          source: 'huggingface',
          sourceLabel: 'HuggingFace',
          sourceColor: '#ab47bc',
          sourceIcon: '🤗',
          description: ds.cardData?.description || '',
          url: `https://huggingface.co/datasets/${ds.id}`,
          tags: ds.tags || [],
          imageUrl,
        });
      }
    }
  } catch (err) {
    errors.push({ source: 'huggingface', error: String(err) });
  }

  // --- Kaggle Datasets Search ---
  try {
    const kaggleConfig = findKaggleConfig();
    if (!kaggleConfig) throw new Error('kaggle.json not found. Please place your kaggle.json in the project root or ~/.kaggle.');
    const creds = parseKaggleCreds(kaggleConfig);
    if (!creds) throw new Error('Could not parse kaggle.json.');
    process.env.KAGGLE_USERNAME = creds.username;
    process.env.KAGGLE_KEY = creds.key;
    process.env.KAGGLE_CONFIG_DIR = path.dirname(kaggleConfig);
    const kaggleCmd = `kaggle datasets list -s "${query}" --csv`;
    const kaggleProc = spawn('bash', ['-c', kaggleCmd], {
      env: { ...process.env },
    });
    let kaggleOut = '';
    let kaggleErr = '';
    for await (const chunk of kaggleProc.stdout) {
      kaggleOut += chunk;
    }
    for await (const chunk of kaggleProc.stderr) {
      kaggleErr += chunk;
    }
    if (kaggleErr) throw new Error(kaggleErr);
    
    // --- CSV Parsing Logic ---
    const lines = kaggleOut.trim().split('\n');
    if (lines.length < 2) {
      // No data found, or only header
    } else {
      const header = lines[0].split(',');
      const refIndex = header.indexOf('ref');
      const titleIndex = header.indexOf('title');
      const subtitleIndex = -1; // No direct subtitle, we can use title or leave empty
      
      if (refIndex === -1 || titleIndex === -1) {
        throw new Error('Could not find required columns (ref, title) in Kaggle CSV output.');
      }

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        const ref = row[refIndex];
        const title = row[titleIndex];
        // The description is not in the list view, so we'll leave it empty.
        // A full API call would be needed for that.
        const description = `A dataset titled '${title}' from Kaggle.`; 
        
        if (ref && title) {
          const searchQuery = title.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ',');
          const unsplashUrl = `https://source.unsplash.com/300x200/?${encodeURIComponent(searchQuery || 'data,graph')}`;
          const seed = ref.replace('/', '');
          results.push({
            name: title,
            source: 'kaggle',
            sourceLabel: 'Kaggle',
            sourceColor: '#1976d2',
            sourceIcon: '🟦',
            description: description, // Not available in list view
            url: `https://www.kaggle.com/datasets/${ref}`,
            tags: [], // Tags not provided in list view
            imageUrl: createProxyUrl(`https://picsum.photos/seed/${seed}/300/200`),
          });
        }
      }
    }
  } catch (err) {
    errors.push({ source: 'kaggle', error: String(err) });
  }

  // --- GitHub Dataset Search ---
  try {
    const ghRes = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query + ' dataset')}&sort=stars&order=desc&per_page=10`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
    if (ghRes.ok) {
      const ghData = await ghRes.json();
      for (const repo of ghData.items || []) {
        results.push({
          name: repo.full_name,
          source: 'github',
          sourceLabel: 'GitHub',
          sourceColor: '#24292f',
          sourceIcon: '🐙',
          description: repo.description || '',
          url: repo.html_url,
          tags: ['github', ...(repo.topics || [])],
          imageUrl: createProxyUrl(repo.owner.avatar_url),
        });
      }
    }
  } catch (err) {
    errors.push({ source: 'github', error: String(err) });
  }

  if (results.length === 0) {
    // Fallback: fetch trending/popular datasets from HuggingFace
    try {
      const fallbackRes = await fetch('https://huggingface.co/api/datasets?sort=downloads', {
        headers: { Authorization: `Bearer ${HF_TOKEN}` },
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        for (const ds of fallbackData.slice(0, 10)) {
          results.push({
            name: ds.id,
            source: 'huggingface',
            sourceLabel: 'HuggingFace',
            sourceColor: '#ab47bc',
            sourceIcon: '🤗',
            description: ds.cardData?.description || '',
            url: `https://huggingface.co/datasets/${ds.id}`,
            tags: ds.tags || [],
            imageUrl: '', // or your image logic
          });
        }
      }
    } catch (e) {
      // Ignore fallback errors
    }
  }

  return NextResponse.json({ datasets: results, errors });
}

export async function POST(req: NextRequest) {
  const { goal = '', tasks = [] } = await req.json();
  const query = goal + ' ' + (Array.isArray(tasks) ? tasks.join(' ') : '');
  
  const results: any[] = [];
  const errors: any[] = [];

  // --- HuggingFace Datasets Search ---
  try {
    const hfRes = await fetch(`https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&limit=25`, {
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
    });
    if (hfRes.ok) {
      const hfData = await hfRes.json();
      hfData.forEach((ds, index) => {
        results.push({
          name: ds.id,
          identifier: ds.id,
          source: 'huggingface',
          description: ds.cardData?.description || `A dataset from HuggingFace for ${ds.pipeline_tag || 'various tasks'}.`,
          url: `https://huggingface.co/datasets/${ds.id}`,
          tags: ds.tags || [],
          // Mark the top 3 results as recommended
          is_recommended: index < 3,
        });
      });
    }
  } catch (err) {
    errors.push({ source: 'huggingface', error: String(err) });
  }

  // Fallback if no results found
  if (results.length === 0) {
    try {
      const fallbackRes = await fetch('https://huggingface.co/api/datasets?sort=downloads&direction=-1&limit=10', {
        headers: { Authorization: `Bearer ${HF_TOKEN}` },
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        fallbackData.forEach(ds => {
           results.push({
            name: ds.id,
            identifier: ds.id,
            source: 'huggingface',
            description: ds.cardData?.description || `A popular dataset from HuggingFace.`,
            url: `https://huggingface.co/datasets/${ds.id}`,
            tags: ds.tags || [],
            is_recommended: false, // Fallback results are not "recommended"
          });
        });
      }
    } catch (e) {
      // ignore fallback error
    }
  }

  return NextResponse.json({ datasets: results, errors });
} 