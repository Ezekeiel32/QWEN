
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
    role: 'user' | 'ai' | 'system';
    content: string;
}

export interface DebuggerState {
  selectedRepoId: string | null;
  messages: ChatMessage[];
  openFolders: string[];
}
