"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, ListChecks, FileCode } from "lucide-react";
import Link from "next/link";
import { useAppContext } from "@/contexts/AppContext";
import { useMemo } from "react";

export default function DashboardPage() {
  const { repositories, tasks } = useAppContext();

  const totalFiles = useMemo(() => {
    return repositories.reduce((acc, repo) => acc + (repo.files?.length || 0), 0);
  }, [repositories]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Welcome to QwenCode Weaver</h1>
        <p className="text-muted-foreground">Your personal AI coding agent, ready to build.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repositories Imported</CardTitle>
            <Github className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repositories.length}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/repositories" className="underline hover:text-primary">Import a repository</Link> to get started.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Analyzed</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              Files are available after import.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Tasks Completed</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.filter(t => t.status === 'completed').length}</div>
            <p className="text-xs text-muted-foreground">
              Track AI-powered code modifications.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">1</div>
                <div>
                    <h3 className="font-semibold">Configure Your AI Server</h3>
                    <p className="text-muted-foreground">Go to the <Link href="/settings" className="underline text-primary">Settings</Link> page to connect to your local Ollama server. You'll need an ngrok URL for global access.</p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">2</div>
                <div>
                    <h3 className="font-semibold">Import a Repository</h3>
                    <p className="text-muted-foreground">Navigate to the <Link href="/repositories" className="underline text-primary">Repositories</Link> page and import a public GitHub repository to start working with its code.</p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">3</div>
                <div>
                    <h3 className="font-semibold">Start Debugging with AI</h3>
                    <p className="text-muted-foreground">Use the <Link href="/debugger" className="underline text-primary">Debugger</Link> to have a conversation with your AI about the codebase, analyze files, and apply changes.</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
