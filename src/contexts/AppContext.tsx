"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Repository, AITask } from '@/types';

interface AppContextType {
  repositories: Repository[];
  tasks: AITask[];
  addRepository: (repo: Repository) => void;
  removeRepository: (repoId: string) => void;
  updateFileContent: (repoId: string, filePath: string, newContent: string) => void;
  addTask: (task: AITask) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [tasks, setTasks] = useState<AITask[]>([]);
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

  return (
    <AppContext.Provider value={{ repositories, tasks, addRepository, removeRepository, updateFileContent, addTask }}>
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
