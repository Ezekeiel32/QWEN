"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, HelpCircle, Loader2, Server, Key, Github } from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { testOllamaConnection } from '@/lib/ollama';

export default function SettingsPage() {
  const { settings, setSettings, isLoaded } = useSettings();
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [ollamaModel, setOllamaModel] = useState('');
  const [githubPat, setGithubPat] = useState('');
  const { toast } = useToast();
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    if (isLoaded) {
      setOllamaUrl(settings.ollamaUrl);
      setOllamaModel(settings.ollamaModel);
      setGithubPat(settings.githubPat);
    }
  }, [isLoaded, settings]);

  const handleSave = () => {
    setSettings({ ollamaUrl, ollamaModel, githubPat });
    toast({
      title: "Settings Saved",
      description: "Your configuration has been updated.",
      action: <CheckCircle className="text-green-500" />,
    });
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection to Ollama server...');
    setAvailableModels([]);

    const result = await testOllamaConnection(ollamaUrl);
    
    setTestStatus(result.status);
    setTestMessage(result.message);
    if(result.models) {
        setAvailableModels(result.models);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Model Configuration</CardTitle>
          <CardDescription>Connect to your local Qwen model via Ollama.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ollama-url">Ollama Server URL</Label>
            <div className="flex gap-2">
                <Input
                id="ollama-url"
                placeholder="http://127.0.0.1:11434 or your ngrok URL"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                />
                <Button onClick={handleTestConnection} disabled={testStatus === 'testing'} variant="outline">
                    {testStatus === 'testing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                    Test Connection
                </Button>
            </div>
            {testStatus !== 'idle' && (
                <Alert variant={testStatus === 'error' ? 'destructive' : testStatus === 'success' ? 'default' : 'default'} className={testStatus === 'success' ? 'bg-green-500/10 border-green-500/50' : ''}>
                    {testStatus === 'success' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>{testStatus === 'success' ? 'Connection Successful' : testStatus === 'error' ? 'Connection Failed' : 'Testing...'}</AlertTitle>
                    <AlertDescription>
                        {testMessage}
                        {availableModels.length > 0 && (
                            <div className="mt-2">
                                <p className="font-semibold">Available Models:</p>
                                <ul className="list-disc list-inside text-xs">
                                    {availableModels.map(model => <li key={model}>{model}</li>)}
                                </ul>
                            </div>
                        )}
                    </AlertDescription>
                </Alert>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ollama-model">Model Name</Label>
            <Input
              id="ollama-model"
              placeholder="e.g., qwen2:7b-custom"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
            />
             <p className="text-xs text-muted-foreground flex items-center gap-1"><HelpCircle className="w-3 h-3"/>The exact model name from your Ollama server.</p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave}>Save Settings</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration</CardTitle>
          <CardDescription>Provide a Personal Access Token (PAT) to import private repositories and avoid rate limits.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="github-pat">GitHub Personal Access Token</Label>
             <div className="flex gap-2">
                <Key className="h-10 w-10 text-muted-foreground p-2 bg-muted rounded-md" />
                <Input
                id="github-pat"
                type="password"
                placeholder="Enter your GitHub PAT"
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
                />
            </div>
             <p className="text-xs text-muted-foreground flex items-center gap-1"><HelpCircle className="w-3 h-3"/>Your token is stored locally and never sent to our servers.</p>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Global Access with ngrok</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
            <p>To access your coding agent from any device, you need to expose your local Ollama server to the internet using ngrok.</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
                <li><span className="font-semibold">Stop Ollama Service:</span> If Ollama is running as a background service (on Linux/macOS), stop it first: <code className="bg-muted px-1 py-0.5 rounded">sudo systemctl stop ollama</code></li>
                <li><span className="font-semibold">Start Ollama with CORS:</span> In your terminal, run: <code className="bg-muted px-1 py-0.5 rounded">OLLAMA_ORIGINS='*' ollama serve</code></li>
                <li><span className="font-semibold">Start ngrok:</span> In a new terminal, run: <code className="bg-muted px-1 py-0.5 rounded">ngrok http 11434</code></li>
                <li><span className="font-semibold">Copy & Paste:</span> Copy the HTTPS URL from ngrok (e.g., https://....ngrok-free.app) and paste it into the "Ollama Server URL" field above.</li>
                <li><span className="font-semibold">Authorize in Browser:</span> Open the ngrok URL in a new browser tab. You might see a warning page. Click "Visit Site" to authorize it. Then, test the connection here again.</li>
            </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}
