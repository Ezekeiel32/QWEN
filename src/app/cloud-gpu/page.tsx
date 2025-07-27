"use client";
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Server, KeyRound, Link2, Save } from 'lucide-react';

const formSchema = z.object({
  provider: z.string().min(1, "Provider name is required."),
  apiKey: z.string().min(10, "API Key seems too short."),
  apiEndpoint: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export default function CloudGpuPage() {
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: "",
      apiKey: "",
      apiEndpoint: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    // In a real application, you would securely store/use this data
    // For this demo, we'll just show a toast message
    console.log("Cloud GPU Configuration:", data);
    toast({
      title: "Configuration Saved (Simulated)",
      description: `Provider: ${data.provider}. API Key and Endpoint recorded.`,
    });
    // reset(); // Optionally reset form after submission
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Server className="h-7 w-7 text-primary" />
            Cloud GPU Integration
          </CardTitle>
          <CardDescription>
            Connect to third-party cloud GPU providers like Vast.ai to leverage external compute resources.
            This section is for configuring API access. Actual job dispatching logic is backend-dependent.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Configuration</CardTitle>
          <CardDescription>Enter API credentials for your chosen cloud GPU provider.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="provider" className="flex items-center gap-2"><Link2 className="h-4 w-4"/>Provider Name</Label>
              <Controller
                name="provider"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="provider" placeholder="e.g., Vast.ai, RunPod, Lambda Labs" />
                )}
              />
              {errors.provider && <p className="text-xs text-destructive">{errors.provider.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center gap-2"><KeyRound className="h-4 w-4"/>API Key</Label>
              <Controller
                name="apiKey"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="apiKey" type="password" placeholder="Enter your provider API key" />
                )}
              />
              {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiEndpoint" className="flex items-center gap-2"><Server className="h-4 w-4"/>API Endpoint (Optional)</Label>
              <Controller
                name="apiEndpoint"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="apiEndpoint" placeholder="e.g., https://api.vast.ai/" />
                )}
              />
              {errors.apiEndpoint && <p className="text-xs text-destructive">{errors.apiEndpoint.message}</p>}
              <p className="text-xs text-muted-foreground">Leave blank if not applicable or uses a default.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting ? 'Saving...' : <><Save className="mr-2 h-4 w-4" />Save Configuration</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Card className="mt-6 bg-accent/30 border-accent">
        <CardHeader>
            <CardTitle className="text-lg">Important Note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-accent-foreground/80 space-y-2">
            <p><strong>This is a UI demonstration only.</strong> API keys and configurations entered here are not currently stored or used to interact with cloud providers.</p>
            <p>A full integration would require secure backend handling of these credentials and specific API implementations for each provider to manage instances and dispatch training jobs.</p>
            <p>Consider using environment variables or a secure vault for API key management in a production environment.</p>
        </CardContent>
      </Card>
    </div>
  );
}
