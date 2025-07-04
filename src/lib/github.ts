
import type { Repository, CodeFile } from '@/types';

function safeAtob(b64: string): string {
    try {
        const binaryString = atob(b64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        // Use TextDecoder to handle UTF-8 characters correctly.
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch (e) {
        console.warn("Failed to decode base64 content, likely a binary file or malformed content. Skipping.", e);
        return "";
    }
}

const textFileExtensions = new Set([
  // Web development
  '.html', '.htm', '.css', '.scss', '.less', '.sass', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.json', '.xml', '.svg',
  // Configuration
  '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.env', 'Dockerfile', '.dockerignore', '.gitignore', '.gitattributes',
  // Scripts
  '.sh', '.bash', '.ps1', '.bat', '.cmd',
  // Documents
  '.md', '.markdown', '.txt', '.rst',
  // Source code
  '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.php', '.rs', '.swift', '.kt', '.kts', '.dart', '.lua', '.pl', '.pm', '.t',
  // SQL
  '.sql',
  // Ruby on Rails
  '.erb', 'Gemfile', 'Gemfile.lock',
  // Go
  'go.mod', 'go.sum',
  // Vue
  '.vue',
  // Svelte
  '.svelte',
  // Other project files
  'Makefile', 'README'
]);

const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.vscode', 'vendor', '.idea', 'target', 'bin', 'obj', 'tmp', '.cache']);
const ignoredFiles = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

export async function importGithubRepo(url: string, githubPat: string, onProgress: (message: string) => void): Promise<Repository> {
    const urlMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
        throw new Error("Invalid GitHub repository URL.");
    }

    const [, owner, repo] = urlMatch;
    
    onProgress(`Fetching repository details for ${owner}/${repo}...`);
    
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };
    if (githubPat) {
        headers['Authorization'] = `Bearer ${githubPat}`;
    }

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
        if(repoRes.status === 404) throw new Error("Repository not found or it's private. A GitHub PAT is required for private repos.");
        if(repoRes.status === 401) throw new Error("Invalid GitHub PAT. Please check your token in Settings.");
        if(repoRes.status === 403) throw new Error("GitHub API rate limit exceeded. Please add a PAT in Settings or wait an hour.");
        throw new Error(`Failed to fetch repository details (status: ${repoRes.status}).`);
    }
    const repoData = await repoRes.json();

    onProgress("Fetching file tree...");
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`, { headers });
    if (!treeRes.ok) throw new Error("Failed to fetch file tree.");
    const treeData = await treeRes.json();

    if(treeData.truncated) {
        onProgress("Warning: Repository is very large, file list is truncated.");
    }
    
    const filesToFetch = treeData.tree.filter((file: any) => {
        const extension = '.' + file.path.split('.').pop();
        const fileName = file.path.split('/').pop();
        return file.type === 'blob' &&
        (textFileExtensions.has(extension) || textFileExtensions.has(fileName)) &&
        !ignoredFiles.has(fileName) &&
        !file.path.split('/').some((dir: string) => ignoredDirs.has(dir))
    });

    onProgress(`Found ${filesToFetch.length} text files to import.`);

    const importedFiles: CodeFile[] = [];

    const chunkSize = 15;
    for (let i = 0; i < filesToFetch.length; i += chunkSize) {
        const chunk = filesToFetch.slice(i, i + chunkSize);
        onProgress(`Fetching files ${i + 1}-${Math.min(i + chunkSize, filesToFetch.length)} of ${filesToFetch.length}...`);
        
        const promises = chunk.map(async (file: any) => {
            try {
                const fileRes = await fetch(file.url, { headers });
                if (!fileRes.ok) return null;
                const fileData = await fileRes.json();
                if (fileData.encoding !== 'base64' || !fileData.content) return null;

                const content = safeAtob(fileData.content);
                if (content) {
                    return {
                        path: file.path,
                        content: content,
                    };
                }
            } catch (error) {
                console.warn(`Skipping file ${file.path} due to fetch error:`, error);
            }
            return null;
        });

        const settledFiles = await Promise.all(promises);
        importedFiles.push(...settledFiles.filter((f): f is CodeFile => f !== null));
    }
    
    onProgress(`Successfully imported ${importedFiles.length} files.`);

    const newRepo: Repository = {
        id: repoData.id.toString(),
        name: repoData.full_name,
        url: repoData.html_url,
        description: repoData.description || 'No description.',
        language: repoData.language,
        status: 'imported',
        importedAt: new Date().toISOString(),
        files: importedFiles,
    };
    
    return newRepo;
}
