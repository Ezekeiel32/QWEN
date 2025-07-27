// src/app/api/[[...route]]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TrainingParameters } from '@/types/training';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// Helper function to validate training parameters
function validateTrainingParams(params: any): params is TrainingParameters {
  const requiredFields = [
    'totalEpochs',
    'batchSize',
    'learningRate',
    'weightDecay',
    'momentumParams',
    'strengthParams',
    'noiseParams',
    'couplingParams',
    'quantumCircuitSize',
    'labelSmoothing',
    'quantumMode',
    'modelName'
  ];

  return requiredFields.every(field => field in params);
}

// Helper function to extract job ID from URL
function extractJobId(url: string): string | null {
  const match = url.match(/\/api\/(status|stop)\/([^\/]+)$/);
  return match ? match[2] : null;
}

// Helper function to find most recent active job
function findMostRecentActiveJob(): string | null {
  const jobsDir = path.join(process.cwd(), 'logs.json');
  if (!fs.existsSync(jobsDir)) {
    return null;
  }

  const files = fs.readdirSync(jobsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(jobsDir, file);
      const stats = fs.statSync(filePath);
      return {
        file,
        mtime: stats.mtime
      };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  for (const { file } of files) {
    const filePath = path.join(jobsDir, file);
    try {
      const jobData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (jobData.status === 'running') {
        return jobData.job_id;
      }
    } catch (error) {
      console.error(`Error reading job file ${file}:`, error);
    }
  }

  return null;
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
        toSnakeCase(v)
      ])
    );
  }
  return obj;
}

// Training endpoint handler
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const snakeData = toSnakeCase(data);
    // Forward the request to the FastAPI backend
    const response = await fetch('http://localhost:9006/api/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snakeData),
    });
    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Status endpoint handler
export async function GET(req: NextRequest) {
  try {
    // --- DATASET SEARCH HANDLER ---
    if (req.nextUrl.pathname === '/api/datasets') {
      // Static dataset list for now
      const datasets = [
        { id: 1, name: "MNIST", description: "Handwritten digits", tags: ["vision", "digits"], category: "vision", size_mb: 20, rating: 5, is_favorited: false },
        { id: 2, name: "IMDB Reviews", description: "Movie reviews for sentiment analysis", tags: ["nlp", "text"], category: "nlp", size_mb: 80, rating: 4, is_favorited: false },
        { id: 3, name: "Titanic", description: "Passenger data for survival prediction", tags: ["tabular", "csv"], category: "tabular", size_mb: 1, rating: 4, is_favorited: false },
      ];
      const search = req.nextUrl.searchParams.get('search')?.toLowerCase() || '';
      const filtered = search
        ? datasets.filter(ds =>
            ds.name.toLowerCase().includes(search) ||
            ds.description?.toLowerCase().includes(search) ||
            ds.tags?.some((tag: string) => tag.toLowerCase().includes(search))
          )
        : datasets;
      return NextResponse.json(filtered);
    }
    // --- END DATASET SEARCH HANDLER ---

    // Check if this is an active-job request
    if (req.url.endsWith('/api/active-job')) {
      const activeJobId = findMostRecentActiveJob();
      return NextResponse.json({ job_id: activeJobId });
    }

    // Regular status request
    const jobId = extractJobId(req.url);
    if (!jobId) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const jobFile = path.join(process.cwd(), 'logs.json', `${jobId}.json`);
    if (!fs.existsSync(jobFile)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobData = JSON.parse(fs.readFileSync(jobFile, 'utf-8'));
    return NextResponse.json(jobData);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Stop endpoint handler
export async function PUT(req: NextRequest) {
  try {
    const jobId = extractJobId(req.url);
    if (!jobId) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const jobFile = path.join(process.cwd(), 'logs.json', `${jobId}.json`);
    if (!fs.existsSync(jobFile)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobData = JSON.parse(fs.readFileSync(jobFile, 'utf-8'));
    jobData.status = 'stopped';
    fs.writeFileSync(jobFile, JSON.stringify(jobData, null, 2));

    return NextResponse.json({ status: 'stopped' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
