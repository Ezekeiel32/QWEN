'use server';

/**
 * @fileOverview An AI agent for applying code changes suggested by the AI Debugger Chat.
 *
 * - applyCodeChanges - A function that handles the application of code changes to a file.
 * - ApplyCodeChangesInput - The input type for the applyCodeChanges function.
 * - ApplyCodeChangesOutput - The return type for the applyCodeChanges function.
 */

import {z} from 'zod';

const ApplyCodeChangesInputSchema = z.object({
  fileName: z.string().describe('The name of the file to apply the changes to.'),
  originalCode: z.string().describe('The original code of the file.'),
  suggestedChanges: z.string().describe('The code changes suggested by the AI.'),
  ollamaUrl: z.string().describe('The URL of the Ollama server.'),
  ollamaModel: z.string().describe('The model to use on the Ollama server.'),
});
export type ApplyCodeChangesInput = z.infer<typeof ApplyCodeChangesInputSchema>;

const ApplyCodeChangesOutputSchema = z.object({
  updatedCode: z.string().describe('The code with the applied changes.'),
});
export type ApplyCodeChangesOutput = z.infer<typeof ApplyCodeChangesOutputSchema>;

export async function applyCodeChanges(input: ApplyCodeChangesInput): Promise<ApplyCodeChangesOutput> {
    const { fileName, originalCode, suggestedChanges, ollamaUrl, ollamaModel } = input;
    
    const prompt = `You are a code modification expert. Your task is to apply suggested changes to a given code file and return ONLY the complete, updated code for the file. Do not add any explanations, comments, or markdown formatting like \`\`\` around the code.

File to modify: ${fileName}

Suggested Changes:
${suggestedChanges}

Original Code:
---
${originalCode}
---

Now, provide the full and complete code with the changes applied.`;

    try {
        if (!ollamaUrl) {
            throw new Error("Ollama URL is not configured. Please set it in the Settings page.");
        }
        if (!ollamaModel) {
            throw new Error("Ollama Model is not configured. Please set it in the Settings page.");
        }
        const finalUrl = ollamaUrl.endsWith('/') ? `${ollamaUrl}api/generate` : `${ollamaUrl}/api/generate`;

        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: ollamaModel,
                prompt: prompt,
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Ollama server responded with status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        
        let updatedCode = data.response.trim();
        
        if (updatedCode.startsWith('```') && updatedCode.endsWith('```')) {
            updatedCode = updatedCode.substring(updatedCode.indexOf('\n') + 1, updatedCode.lastIndexOf('\n')).trim();
        }

        return {
            updatedCode: updatedCode,
        };

    } catch (error) {
        console.error("Error calling Ollama service for code changes:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to apply code changes with AI model: ${error.message}`);
        }
        throw new Error('An unknown error occurred while applying code changes.');
    }
}
