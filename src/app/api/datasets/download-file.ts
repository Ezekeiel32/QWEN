import { NextRequest } from 'next/server';
import { createWriteStream, existsSync, statSync, rmSync, mkdirSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import archiver from 'archiver';

export const runtime = 'nodejs';

async function fetchHuggingFaceFiles(datasetId: string, branch: string) {
  const apiUrl = `https://huggingface.co/api/datasets/${datasetId}/tree/${branch}`;
  const res = await fetch(apiUrl);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.error) return null;
  return json;
}

async function downloadAllHuggingFaceFiles(datasetId: string, tempDir: string) {
  // Try both 'main' and 'master' branches
  let files = await fetchHuggingFaceFiles(datasetId, 'main');
  if (!files) files = await fetchHuggingFaceFiles(datasetId, 'master');
  if (!files || !Array.isArray(files) || files.length === 0) throw new Error('No files found in HuggingFace dataset (tried both main and master branches).');
  // Download each file
  for (const file of files) {
    if (file.type === 'file') {
      // Try both branches for the file URL
      let fileUrl = `https://huggingface.co/datasets/${datasetId}/resolve/main/${file.path}`;
      let fileRes = await fetch(fileUrl);
      if (!fileRes.ok) {
        fileUrl = `https://huggingface.co/datasets/${datasetId}/resolve/master/${file.path}`;
        fileRes = await fetch(fileUrl);
      }
      if (!fileRes.ok) throw new Error(`Failed to download file: ${file.path}`);
      const filePath = path.join(tempDir, file.path);
      mkdirSync(path.dirname(filePath), { recursive: true });
      const fileStream = createWriteStream(filePath);
      await new Promise((resolve, reject) => {
        fileRes.body.pipe(fileStream);
        fileRes.body.on('error', reject);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
      });
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get('source');
    const identifier = searchParams.get('identifier');
    const dest_dir = `datasets/${source}`;
    if (!source || !identifier) {
      console.error('Missing required fields:', { source, identifier });
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), { status: 400 });
    }
    if (source === 'huggingface') {
      // Download all files, zip, and stream
      const tempDir = path.join('/tmp', `hf_${identifier.replace(/[\/:*?"<>|]/g, '_')}_${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });
      try {
        await downloadAllHuggingFaceFiles(identifier, tempDir);
      } catch (err: any) {
        rmSync(tempDir, { recursive: true, force: true });
        console.error('HuggingFace ZIP download error:', err);
        return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
      }
      // Zip and stream
      const archiveName = `${identifier.replace(/[\/:*?"<>|]/g, '_')}.zip`;
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = new ReadableStream({
        start(controller) {
          archive.on('data', (chunk) => controller.enqueue(chunk));
          archive.on('end', () => {
            controller.close();
            rmSync(tempDir, { recursive: true, force: true });
          });
          archive.on('error', (err) => controller.error(err));
          archive.directory(tempDir, false);
          archive.finalize();
        }
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${archiveName}"`,
        },
      });
    } else if (source === 'github') {
      try {
        const match = identifier.match(/github.com\/([^\/]+\/[^\/]+)/);
        if (match) {
          const repo = match[1];
          const zipUrl = `https://github.com/${repo}/archive/refs/heads/main.zip`;
          return Response.redirect(zipUrl, 302);
        } else {
          throw new Error('Invalid GitHub repo URL');
        }
      } catch (err: any) {
        console.error('GitHub direct download error:', err);
        return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
      }
    }
    // Fallback: old logic for Kaggle or other sources
    let datasetPath = '';
    if (source === 'kaggle') {
      const kaggleCmd = `kaggle datasets download -d ${identifier} -p ${dest_dir} --unzip`;
      await new Promise((resolve, reject) => {
        const proc = spawn('bash', ['-c', kaggleCmd], { env: { ...process.env } });
        proc.on('close', (code) => code === 0 ? resolve(0) : reject(new Error('Kaggle download failed')));
      });
      datasetPath = dest_dir;
    } else {
      return new Response(JSON.stringify({ error: 'Unknown source.' }), { status: 400 });
    }
    if (!existsSync(datasetPath)) {
      console.error('Dataset not found after download:', datasetPath);
      return new Response(JSON.stringify({ error: 'Dataset not found after download.' }), { status: 404 });
    }
    if (statSync(datasetPath).isDirectory()) {
      const archiveName = `${path.basename(datasetPath)}.zip`;
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = new ReadableStream({
        start(controller) {
          archive.on('data', (chunk) => controller.enqueue(chunk));
          archive.on('end', () => controller.close());
          archive.on('error', (err) => controller.error(err));
          archive.directory(datasetPath, false);
          archive.finalize();
        }
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${archiveName}"`,
        },
      });
    } else {
      const fileName = path.basename(datasetPath);
      const fileStream = createWriteStream(datasetPath);
      return new Response(fileStream as any, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }
  } catch (err: any) {
    console.error('Download-file API error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
} 