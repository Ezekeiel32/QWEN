export interface Repository {
  id: string;
  name: string;
  url: string;
  description: string;
  language: string;
  status: 'importing' | 'imported' | 'failed';
  importedAt: string;
  files: CodeFile[];
}

export interface CodeFile {
  path: string;
  content: string;
}

export interface AITask {
  id: string;
  repositoryId: string;
  prompt: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  originalCode?: string;
  modifiedCode?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    codeChange?: {
        filePath: string;
        originalCode: string;
        modifiedCode: string;
    };
}

export interface DebuggerState {
  selectedRepoId: string | null;
  messages: ChatMessage[];
  selectedFilePaths: string[]; // Stored as array for JSON compatibility
  openFolders: string[]; // Stored as array for JSON compatibility
}
