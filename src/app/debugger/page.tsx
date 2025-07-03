"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal, Bot, User, FileCode, Check, ChevronsUpDown, Search, Folder, FolderOpen, Minus } from "lucide-react";
import { CodeChangeCard } from "@/components/cards/CodeChangeCard";
import type { ChatMessage, CodeFile, Repository } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useSettings } from "@/hooks/use-settings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { analyzeCode } from "@/ai/flows/ai-debugger-chat";
import { applyCodeChanges } from "@/ai/flows/apply-code-changes";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Types for file tree
interface FileTreeNode {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: FileTree;
  content?: string;
}

interface FileTree {
  [key: string]: FileTreeNode;
}

// Helper to build the file tree
const buildFileTree = (files: CodeFile[]): FileTree => {
  const tree: FileTree = {};

  files.forEach(file => {
    const parts = file.path.split('/');
    let currentLevel = tree;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        currentLevel[part] = {
          name: part,
          type: 'file',
          path: file.path,
          content: file.content,
        };
      } else {
        const folderPath = parts.slice(0, index + 1).join('/');
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            type: 'folder',
            path: folderPath,
            children: {},
          };
        }
        currentLevel = currentLevel[part].children!;
      }
    });
  });

  return tree;
};

// Helper to get all file paths from a node
const getFilesInNode = (node: FileTreeNode): string[] => {
  if (node.type === 'file') {
    return [node.path];
  }
  if (node.type === 'folder' && node.children) {
    return Object.values(node.children).flatMap(child => getFilesInNode(child));
  }
  return [];
};

export default function DebuggerPage() {
  const { repositories, updateFileContent, addTask } = useAppContext();
  const { settings } = useSettings();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [fileSearch, setFileSearch] = useState('');
  const [repoOpen, setRepoOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const repoId = searchParams.get('repoId');
    if (repoId) {
      setSelectedRepoId(repoId);
    } else if (repositories.length > 0) {
      setSelectedRepoId(repositories[0].id);
    }
  }, [searchParams, repositories]);

  const selectedRepo = useMemo(() => {
    return repositories.find(repo => repo.id === selectedRepoId);
  }, [selectedRepoId, repositories]);
  
  const fileTree = useMemo(() => {
    if (!selectedRepo) return {};
    const files = selectedRepo.files.filter(file => file.path.toLowerCase().includes(fileSearch.toLowerCase()));
    return buildFileTree(files);
  }, [selectedRepo, fileSearch]);

  const handleSend = async () => {
    if (!input.trim() || !selectedRepo) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const contextFiles = selectedRepo.files.filter(file => selectedFilePaths.has(file.path));
      const fileContents = contextFiles.map(file => `// FILE: ${file.path}\n\n${file.content}`);

      if (contextFiles.length === 0) {
        throw new Error("Please select at least one file for context before asking the AI.");
      }

      const analysisInput = {
        repositoryName: selectedRepo.name,
        fileContents,
        userQuestion: `
Based on the provided file context, analyze the user's request: "${input}".

If the request is a specific, actionable code modification for a SINGLE file within the context, respond with ONLY a JSON object string with the following structure:
{ "filePath": "path/to/the/file.ext", "changeDescription": "A concise description of the change to be made, for another AI to execute." }
Example: { "filePath": "src/components/ui/button.tsx", "changeDescription": "Add a transition-colors and active:scale-95 effect to the button." }

If the request is a general question, an analysis request, or involves multiple files, respond with a conversational, helpful answer in plain text. DO NOT use a JSON formatted response.
      `,
      };
      
      const analysisResponse = await analyzeCode(analysisInput);
      const aiResponseText = analysisResponse.analysisResult;
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponseText);
      } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: aiResponseText }]);
        setIsLoading(false);
        return;
      }

      if (parsedResponse.filePath && parsedResponse.changeDescription) {
        const { filePath, changeDescription } = parsedResponse;
        const originalFile = selectedRepo.files.find(f => f.path === filePath);

        if (!originalFile) {
          throw new Error(`File '${filePath}' not found in the current context.`);
        }

        const applyResponse = await applyCodeChanges({
          fileName: filePath,
          originalCode: originalFile.content,
          suggestedChanges: changeDescription,
        });

        const modifiedCode = applyResponse.updatedCode;
        
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'ai',
          content: "I've prepared the following changes for `" + filePath + "` based on your request.",
          codeChange: { filePath, originalCode: originalFile.content, modifiedCode },
        };
        setMessages(prev => [...prev, aiMessage]);
        addTask({
          id: Date.now().toString(),
          repositoryId: selectedRepo.id,
          prompt: input,
          status: 'completed',
          createdAt: new Date().toISOString(),
          originalCode: originalFile.content,
          modifiedCode: modifiedCode,
        });
      } else {
         setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: aiResponseText }]);
      }

    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: "destructive", title: "AI Error", description: errorMessage });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: `I encountered an error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleApplyChange = (filePath: string, newContent: string) => {
    if (!selectedRepoId) return;
    updateFileContent(selectedRepoId, filePath, newContent);
    toast({
      title: "Change Applied!",
      description: `${filePath} has been updated in this session.`,
    });
  };
  
  const toggleFolder = (path: string) => {
    setOpenFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleFileSelect = (path: string, isChecked: boolean) => {
    setSelectedFilePaths(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(path);
      } else {
        newSet.delete(path);
      }
      return newSet;
    });
  };

  const handleFolderSelect = (node: FileTreeNode, isChecked: boolean) => {
    const filesToChange = getFilesInNode(node);
    setSelectedFilePaths(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        filesToChange.forEach(file => newSet.add(file));
      } else {
        filesToChange.forEach(file => newSet.delete(file));
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!selectedRepo) return;
    const allFilePaths = selectedRepo.files.map(f => f.path);
    setSelectedFilePaths(new Set(allFilePaths));
  };

  const handleClearSelection = () => {
    setSelectedFilePaths(new Set());
  };

  const RecursiveFileTree = useCallback(({ tree, level = 0 }: { tree: FileTree, level?: number }) => {
    const sortedNodes = Object.values(tree).sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
  
    return (
      <div className={level > 0 ? "pl-4" : ""}>
        {sortedNodes.map(node => {
          if (node.type === 'folder') {
            const allChildFiles = getFilesInNode(node);
            const selectedChildFiles = allChildFiles.filter(path => selectedFilePaths.has(path));
            const isChecked = selectedChildFiles.length > 0 && selectedChildFiles.length === allChildFiles.length;
            const isIndeterminate = selectedChildFiles.length > 0 && selectedChildFiles.length < allChildFiles.length;
            const checkboxState = isChecked ? true : isIndeterminate ? 'indeterminate' : false;
  
            return (
              <Collapsible key={node.path} open={openFolders.has(node.path)} onOpenChange={() => toggleFolder(node.path)}>
                <div className="flex items-center space-x-2 text-sm p-1 rounded-md hover:bg-accent/50">
                  <Checkbox
                    id={`folder-${node.path}`}
                    checked={checkboxState}
                    onCheckedChange={(checked) => handleFolderSelect(node, !!checked)}
                    aria-label={`Select folder ${node.name}`}
                  />
                  <CollapsibleTrigger className="flex items-center space-x-2 flex-grow text-left">
                    {openFolders.has(node.path) ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                    <span className="truncate">{node.name}</span>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  {node.children && <RecursiveFileTree tree={node.children} level={level + 1} />}
                </CollapsibleContent>
              </Collapsible>
            );
          } else { // file
            return (
              <div key={node.path} className="flex items-center space-x-2 text-sm p-1 rounded-md hover:bg-accent/50">
                <Checkbox
                  id={`file-${node.path}`}
                  checked={selectedFilePaths.has(node.path)}
                  onCheckedChange={(checked) => handleFileSelect(node.path, !!checked)}
                  aria-label={`Select file ${node.name}`}
                />
                <label htmlFor={`file-${node.path}`} className="flex items-center space-x-2 flex-grow cursor-pointer">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{node.name}</span>
                </label>
              </div>
            );
          }
        })}
      </div>
    );
  }, [openFolders, selectedFilePaths]);


  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="grid h-full grid-cols-1 md:grid-cols-[350px_1fr] gap-6">
        {/* Left Panel */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Codebase Context</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Select a repository to start debugging.</p>
              <Popover open={repoOpen} onOpenChange={setRepoOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={repoOpen} className="w-full justify-between">
                    {selectedRepo ? selectedRepo.name : "Select a repository..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search repository..." />
                    <CommandEmpty>No repository found.</CommandEmpty>
                    <CommandGroup>
                      {repositories.map((repo) => (
                        <CommandItem
                          key={repo.id}
                          value={repo.name}
                          onSelect={() => {
                            setSelectedRepoId(repo.id);
                            setRepoOpen(false);
                            setMessages([]);
                            setSelectedFilePaths(new Set());
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedRepoId === repo.id ? "opacity-100" : "opacity-0"}`} />
                          {repo.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
          <Card className="flex-grow flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">File Explorer</CardTitle>
               <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input placeholder="Search files..." value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} className="pl-8"/>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={handleSelectAll} disabled={!selectedRepo}>Select All</Button>
                <Button size="sm" variant="outline" onClick={handleClearSelection} disabled={selectedFilePaths.size === 0}>Clear Selection</Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1 pr-2">
                  {selectedRepo ? <RecursiveFileTree tree={fileTree} /> : <p className="text-sm text-muted-foreground text-center py-8">Select a repository to see files.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className="flex flex-col h-full bg-card border rounded-lg">
          <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground pt-16">
                  <Bot className="mx-auto h-12 w-12 mb-4 text-primary/50" />
                  <h3 className="text-lg font-semibold">AI Debugger</h3>
                  <p className="text-sm">Select files and ask me to refactor, debug, or explain code.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'ai' && <div className="p-2 rounded-full bg-primary/10 text-primary"><Bot className="w-5 h-5" /></div>}
                    <div className={`max-w-2xl rounded-lg p-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.codeChange && (
                        <CodeChangeCard
                          filePath={message.codeChange.filePath}
                          originalCode={message.codeChange.originalCode}
                          modifiedCode={message.codeChange.modifiedCode}
                          onApply={() => handleApplyChange(message.codeChange!.filePath, message.codeChange!.modifiedCode)}
                        />
                      )}
                    </div>
                    {message.role === 'user' && <div className="p-2 rounded-full bg-secondary"><User className="w-5 h-5" /></div>}
                  </div>
                ))
              )}
               {isLoading && (
                 <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary"><Bot className="w-5 h-5" /></div>
                    <div className="max-w-xl rounded-lg p-3 bg-secondary">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-0"></div>
                            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-200"></div>
                            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse delay-400"></div>
                        </div>
                    </div>
                </div>
               )}
            </div>
          </ScrollArea>
          <div className="border-t p-4 bg-background/50 rounded-b-lg">
            <div className="relative">
              <Input
                placeholder={selectedRepo ? "Ask to refactor, debug, or explain code..." : "Please select a repository first."}
                className="pr-12"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={isLoading || !selectedRepo}
              />
              <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleSend} disabled={isLoading || !input.trim() || !selectedRepo}>
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
