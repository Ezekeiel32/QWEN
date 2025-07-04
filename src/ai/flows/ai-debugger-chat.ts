'use server';

/**
 * @fileOverview AI Debugger Chat flow for analyzing code in the current repository.
 *
 * - analyzeCode - A function that handles the code analysis process.
 * - AnalyzeCodeInput - The input type for the analyzeCode function.
 * - AnalyzeCodeOutput - The return type for the analyzeCode function.
 */

import {z} from 'zod';

const AnalyzeCodeInputSchema = z.object({
  repositoryName: z.string().describe('The name of the repository to analyze.'),
  fileContents: z.array(z.string()).describe('An array of file contents from the repository.'),
  userQuestion: z.string().describe('The user question about the code.'),
  ollamaUrl: z.string().describe('The URL of the Ollama server.'),
  ollamaModel: z.string().describe('The model to use on the Ollama server.'),
});
export type AnalyzeCodeInput = z.infer<typeof AnalyzeCodeInputSchema>;

const AnalyzeCodeOutputSchema = z.object({
  analysisResult: z.string().describe('The AI-powered analysis result of the code.'),
});
export type AnalyzeCodeOutput = z.infer<typeof AnalyzeCodeOutputSchema>;

export async function analyzeCode(input: AnalyzeCodeInput): Promise<AnalyzeCodeOutput> {
  const { repositoryName, fileContents, userQuestion, ollamaUrl, ollamaModel } = input;

  const prompt = `You are an AI code analysis assistant for a repository named "${repositoryName}".
You have been given the content of several files as context. Your primary task is to analyze a user's request and determine the best course of action.

USER REQUEST: "${userQuestion}"

Based on the user's request and the file contents provided, please choose one of the following two response formats:

1.  If the user's request is a specific, actionable code modification for a SINGLE file provided in the context, you MUST respond with ONLY a JSON object string with the following structure, and nothing else. Do not add any explanatory text before or after the JSON.
    Example: { "filePath": "src/components/ui/button.tsx", "changeDescription": "Add a transition-colors and active:scale-95 effect to the button." }
    
    Structure:
    { 
      "filePath": "path/to/the/file.ext", 
      "changeDescription": "A concise, first-person instruction for another AI to execute the change. For example: 'Change the button color to blue.'" 
    }

2.  If the request is a general question, an analysis request, asks for an explanation, or involves multiple files, respond with a conversational, helpful answer in plain text. DO NOT use JSON format for this type of response.

Here are the contents of the files for context:
---
${fileContents.join('\n\n---\n')}
---`;

  try {
    if (!ollamaUrl) {
        throw new Error("Ollama URL is not configured. Please set it in the Settings page.");
    }
    if (!ollamaModel) {
        throw new Error("Ollama Model is not configured. Please set it in the Settings page.");
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ollama`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ollamaUrl,
        path: 'api/generate',
        method: 'POST',
        body: {
          model: ollamaModel,
          prompt,
          stream: false,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama server responded with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    
    return {
      analysisResult: data.response,
    };
  } catch (error) {
    console.error("Error calling Ollama service:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get analysis from AI model: ${error.message}`);
    }
    throw new Error('An unknown error occurred while contacting the AI model.');
  }
}
