
"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal, Bot, User, Check, ChevronsUpDown, Search, Folder, FolderOpen, Cog, FileText } from "lucide-react";
import type { ChatMessage, Repository } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useSettings } from "@/hooks/use-settings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { runAiAgent } from "@/ai/flows/ai-debugger-chat";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CodeFile } from "@/types";

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


export default function DebuggerPage() {
  const { repositories, updateFileContent, addTask, debuggerState, setDebuggerState } = useAppContext();
  const { selectedRepoId, messages } = debuggerState;
  
  const { settings } = useSettings();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [repoOpen, setRepoOpen] = useState(false);

  const openFolders = useMemo(() => new Set(debuggerState.openFolders), [debuggerState.openFolders]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const repoIdFromParams = searchParams.get('repoId');
    if (repoIdFromParams && repoIdFromParams !== selectedRepoId) {
       setDebuggerState({
        selectedRepoId: repoIdFromParams,
        messages: [],
        openFolders: [],
      });
    } else if (!selectedRepoId && repositories.length > 0) {
       setDebuggerState({ selectedRepoId: repositories[0].id });
    }
  }, [searchParams, repositories, selectedRepoId, setDebuggerState]);

  const selectedRepo = useMemo(() => {
    return repositories.find(repo => repo.id === selectedRepoId);
  }, [selectedRepoId, repositories]);
  
  const fileTree = useMemo(() => {
    if (!selectedRepo) return {};
    const files = selectedRepo.files.filter(file => file.path.toLowerCase().includes(fileSearch.toLowerCase()));
    return buildFileTree(files);
  }, [selectedRepo, fileSearch]);
  
  const handleAiMessage = (content: string, currentMessages: ChatMessage[]) => {
    const aiMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'ai',
      content,
    };
    const updatedMessages = [...currentMessages, aiMessage];
    setDebuggerState({ messages: updatedMessages });
    return updatedMessages;
  }

  const handleSend = async () => {
    if (!input.trim() || !selectedRepo) return;
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    let currentMessages: ChatMessage[] = [...messages, userMessage];
    setDebuggerState({ messages: currentMessages });
    const userPrompt = input;
    setInput("");

    const MAX_TURNS = 10;
    let turn = 0;

    try {
      while (turn < MAX_TURNS) {
        turn++;

        const agentInput = {
          repositoryName: selectedRepo.name,
          fileList: selectedRepo.files.map(f => f.path),
          messages: currentMessages,
          ollamaUrl: settings.ollamaUrl,
          ollamaModel: settings.ollamaModel,
        };

        const agentResponse = await runAiAgent(agentInput);
        let action;
        try {
          // The response might have markdown ```json ... ``` wrapper
          const jsonResponse = agentResponse.response.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
          action = JSON.parse(jsonResponse);
        } catch (e) {
          const errorMessage = "The AI returned an invalid response. Please try again.";
          currentMessages = handleAiMessage(errorMessage, currentMessages);
          break;
        }

        if (action.action === 'readFile') {
          const file = selectedRepo.files.find(f => f.path === action.path);
          const messageContent = file
            ? `I have read the file \`${action.path}\` for you. Here is the content:\n\n\`\`\`\n${file.content}\n\`\`\``
            : `Error: File \`${action.path}\` not found.`;
          
          const systemMessage: ChatMessage = { id: Date.now().toString(), role: 'system', content: messageContent };
          currentMessages = [...currentMessages, systemMessage];
          setDebuggerState({ messages: currentMessages });
          continue; // Continue loop to let AI process the new info
        
        } else if (action.action === 'writeFile') {
          const originalFile = selectedRepo.files.find(f => f.path === action.path);
          if (!originalFile) {
            const systemMessage: ChatMessage = { id: Date.now().toString(), role: 'system', content: `Error: Could not write to file \`${action.path}\` because it was not found.` };
            currentMessages = [...currentMessages, systemMessage];
            setDebuggerState({ messages: currentMessages });
            continue;
          }

          updateFileContent(selectedRepo.id, action.path, action.content);
          toast({
            title: "File Updated by AI",
            description: `${action.path} has been modified.`,
          });
          addTask({
            id: Date.now().toString(),
            repositoryId: selectedRepo.id,
            prompt: userPrompt,
            status: 'completed',
            createdAt: new Date().toISOString(),
            originalCode: originalFile.content,
            modifiedCode: action.content,
          });

          const systemMessage: ChatMessage = { id: Date.now().toString(), role: 'system', content: `Success: The file \`${action.path}\` has been updated.` };
          currentMessages = [...currentMessages, systemMessage];
          setDebuggerState({ messages: currentMessages });
          continue;

        } else if (action.action === 'finish') {
          currentMessages = handleAiMessage(action.message, currentMessages);
          break; // End of loop
        
        } else {
          currentMessages = handleAiMessage("The AI returned an unknown action. Please try again.", currentMessages);
          break;
        }
      }

      if (turn >= MAX_TURNS) {
        handleAiMessage("The AI took too many steps to complete the request. Please try again with a more specific prompt.", currentMessages);
      }

    } catch (error) {
      console.error("AI Agent Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: "destructive", title: "AI Error", description: errorMessage });
      handleAiMessage(`I encountered an error: ${errorMessage}`, currentMessages);
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

  const toggleFolder = (path: string) => {
    const newSet = new Set(debuggerState.openFolders);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setDebuggerState({ openFolders: Array.from(newSet) });
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
            return (
              <Collapsible key={node.path} open={openFolders.has(node.path)} onOpenChange={() => toggleFolder(node.path)}>
                <CollapsibleTrigger className="flex items-center space-x-2 text-sm p-1 rounded-md hover:bg-accent/50 w-full">
                  {openFolders.has(node.path) ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                  <span className="truncate">{node.name}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {node.children && <RecursiveFileTree tree={node.children} level={level + 1} />}
                </CollapsibleContent>
              </Collapsible>
            );
          } else { // file
            return (
              <div key={node.path} className="flex items-center space-x-2 text-sm p-1 rounded-md">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{node.name}</span>
              </div>
            );
          }
        })}
      </div>
    );
  }, [openFolders, toggleFolder]);


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
              <p className="text-sm text-muted-foreground mb-4">Select a repository to start the agent.</p>
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
                            if (repo.id !== selectedRepoId) {
                                setDebuggerState({
                                  selectedRepoId: repo.id,
                                  messages: [],
                                  openFolders: [],
                                });
                            }
                            setRepoOpen(false);
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
               <p className="text-sm text-muted-foreground">The AI agent has access to all files below.</p>
               <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input placeholder="Search files..." value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} className="pl-8"/>
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
                  <h3 className="text-lg font-semibold">AI Agent</h3>
                  <p className="text-sm">I can read and write files in the repository. Give me a task.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'ai' && <div className="p-2 rounded-full bg-primary/10 text-primary"><Bot className="w-5 h-5" /></div>}
                    {message.role === 'system' && <div className="p-2 rounded-full bg-muted text-muted-foreground"><Cog className="w-5 h-5" /></div>}
                    
                    <div className={`max-w-2xl rounded-lg p-3 ${
                      message.role === 'user' ? 'bg-primary text-primary-foreground' 
                      : message.role === 'system' ? 'bg-muted/60 text-muted-foreground italic' 
                      : 'bg-secondary'}`
                    }>
                      <pre className="text-sm whitespace-pre-wrap font-sans">{message.content}</pre>
                    </div>

                    {message.role === 'user' && <div className="p-2 rounded-full bg-secondary"><User className="w-5 h-5" /></div>}
                  </div>
                ))
              )}
               {isLoading && (
                 <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary"><Bot className="w-5 h-5 animate-pulse" /></div>
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
                placeholder={selectedRepo ? "Ask the AI to perform a task..." : "Please select a repository first."}
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
