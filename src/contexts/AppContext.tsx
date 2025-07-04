
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Repository, AITask, DebuggerState, ChatMessage } from '@/types';

interface AppContextType {
  repositories: Repository[];
  tasks: AITask[];
  debuggerState: DebuggerState;
  addRepository: (repo: Repository) => void;
  removeRepository: (repoId: string) => void;
  updateFileContent: (repoId: string, filePath: string, newContent: string) => void;
  addTask: (task: AITask) => void;
  setDebuggerState: (newState: Partial<DebuggerState>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_DEBUGGER_STATE: DebuggerState = {
  selectedRepoId: null,
  messages: [],
  openFolders: [],
};


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [debuggerState, setDebuggerStateInternal] = useState<DebuggerState>(DEFAULT_DEBUGGER_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedRepos = localStorage.getItem('qwen-weaver-repos');
      if (storedRepos) {
        setRepositories(JSON.parse(storedRepos));
      }
      const storedTasks = localStorage.getItem('qwen-weaver-tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
      const storedDebuggerState = localStorage.getItem('qwen-weaver-debugger-state');
      if (storedDebuggerState) {
        setDebuggerStateInternal(prev => ({...prev, ...JSON.parse(storedDebuggerState)}));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if(isLoaded) {
        try {
            localStorage.setItem('qwen-weaver-repos', JSON.stringify(repositories));
        } catch (e) {
            console.error("Failed to save repositories to local storage", e);
        }
    }
  }, [repositories, isLoaded]);
  
  useEffect(() => {
    if(isLoaded) {
        try {
            localStorage.setItem('qwen-weaver-tasks', JSON.stringify(tasks));
        } catch (e) {
            console.error("Failed to save tasks to local storage", e);
        }
    }
  }, [tasks, isLoaded]);

  useEffect(() => {
    if(isLoaded) {
        try {
            localStorage.setItem('qwen-weaver-debugger-state', JSON.stringify(debuggerState));
        } catch (e) {
            console.error("Failed to save debugger state to local storage", e);
        }
    }
  }, [debuggerState, isLoaded]);

  const addRepository = (repo: Repository) => {
    setRepositories(prev => {
        const existing = prev.find(r => r.id === repo.id);
        if (existing) {
            return prev.map(r => r.id === repo.id ? repo : r);
        }
        return [...prev, repo];
    });
  };

  const removeRepository = (repoId: string) => {
    if (debuggerState.selectedRepoId === repoId) {
        setDebuggerStateInternal(DEFAULT_DEBUGGER_STATE);
    }
    setRepositories(prev => prev.filter(r => r.id !== repoId));
  };

  const updateFileContent = (repoId: string, filePath: string, newContent: string) => {
    setRepositories(prev => 
      prev.map(repo => {
        if (repo.id === repoId) {
          return {
            ...repo,
            files: repo.files.map(file => 
              file.path === filePath ? { ...file, content: newContent } : file
            ),
          };
        }
        return repo;
      })
    );
  };

  const addTask = (task: AITask) => {
    setTasks(prev => [task, ...prev].slice(0, 100)); // Keep last 100 tasks
  };

  const setDebuggerState = (newState: Partial<DebuggerState>) => {
    setDebuggerStateInternal(prev => ({ ...prev, ...newState }));
  };

  const value: AppContextType = {
      repositories,
      tasks,
      debuggerState,
      addRepository,
      removeRepository,
      updateFileContent,
      addTask,
      setDebuggerState
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
