"use client"

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal, Bot, User, FileCode, Check, ChevronsUpDown, Search, X } from "lucide-react";
import { CodeChangeCard } from "@/components/cards/CodeChangeCard";
import type { ChatMessage, CodeFile, Repository } from "@/types";
import { useAppContext } from "@/contexts/AppContext";
import { useSettings } from "@/hooks/use-settings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { analyzeCode } from "@/ai/flows/ai-debugger-chat";
import { applyCodeChanges } from "@/ai/flows/apply-code-changes";
import { useToast } from "@/hooks/use-toast";

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
  
  const filteredFiles = useMemo(() => {
    if (!selectedRepo) return [];
    return selectedRepo.files.filter(file => file.path.toLowerCase().includes(fileSearch.toLowerCase()));
  }, [selectedRepo, fileSearch]);
  
  const toggleFileSelection = (path: string) => {
    setSelectedFilePaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

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

      const analysisInput = {
        repositoryName: selectedRepo.name,
        fileContents,
        userQuestion: input,
      };

      if (contextFiles.length === 0) {
        throw new Error("Please select at least one file for context before asking the AI.");
      }

      // We'll add a specific instruction to the AI to try and return structured data for code changes.
      analysisInput.userQuestion = `
Based on the provided file context, analyze the user's request: "${input}".

If the request is a specific, actionable code modification for a SINGLE file within the context, respond with ONLY a JSON object string with the following structure:
{ "filePath": "path/to/the/file.ext", "changeDescription": "A concise description of the change to be made, for another AI to execute." }
Example: { "filePath": "src/components/ui/button.tsx", "changeDescription": "Add a transition-colors and active:scale-95 effect to the button." }

If the request is a general question, an analysis request, or involves multiple files, respond with a conversational, helpful answer in plain text. DO NOT use JSON.
      `;
      
      const analysisResponse = await analyzeCode(analysisInput);
      const aiResponseText = analysisResponse.analysisResult;
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponseText);
      } catch (e) {
        // Not JSON, so it's a conversational response.
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: aiResponseText }]);
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
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1 pr-4">
                  {selectedRepo ? filteredFiles.map(file => (
                     <div 
                      key={file.path} 
                      onClick={() => toggleFileSelection(file.path)}
                      className={`flex items-center space-x-2 text-sm p-2 rounded-md hover:bg-accent cursor-pointer ${selectedFilePaths.has(file.path) ? 'bg-accent/50' : ''}`}
                    >
                        <FileCode className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{file.path}</span>
                      </div>
                  )) : <p className="text-sm text-muted-foreground text-center py-8">Select a repository to see files.</p>}
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
