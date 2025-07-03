"use client"
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Repository } from '@/types';
import { importGithubRepo } from '@/lib/github';
import { useSettings } from '@/hooks/use-settings';

interface ImportRepositoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRepoImported: (repo: Repository) => void;
}

export function ImportRepositoryDialog({ isOpen, onClose, onRepoImported }: ImportRepositoryDialogProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const { toast } = useToast();
  const { settings } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    try {
      const newRepo = await importGithubRepo(url, settings.githubPat, (message) => setProgressMessage(message));
      onRepoImported(newRepo);
      toast({
        title: "Repository Imported!",
        description: `Successfully imported ${newRepo.name}.`,
      });
      onClose();
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
      setProgressMessage('');
      setUrl('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Import GitHub Repository</DialogTitle>
            <DialogDescription>
              Enter the URL of a public or private GitHub repository to import its code.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="url" className="text-right">
                URL
              </Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="col-span-3"
                placeholder="https://github.com/user/repo"
                disabled={isLoading}
              />
            </div>
            {isLoading && (
                <div className="flex items-center text-sm text-muted-foreground col-span-4 justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    <span>{progressMessage || 'Initializing import...'}</span>
                </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={!url || isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Github className="mr-2 h-4 w-4"/>}
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
