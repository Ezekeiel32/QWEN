'use server';

/**
 * @fileOverview AI Debugger Chat flow for analyzing code in the current repository.
 *
 * - analyzeCode - A function that handles the code analysis process.
 * - AnalyzeCodeInput - The input type for the analyzeCode function.
 * - AnalyzeCodeOutput - The return type for the analyzeCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCodeInputSchema = z.object({
  repositoryName: z.string().describe('The name of the repository to analyze.'),
  fileContents: z.array(z.string()).describe('An array of file contents from the repository.'),
  userQuestion: z.string().describe('The user question about the code.'),
});
export type AnalyzeCodeInput = z.infer<typeof AnalyzeCodeInputSchema>;

const AnalyzeCodeOutputSchema = z.object({
  analysisResult: z.string().describe('The AI-powered analysis result of the code.'),
});
export type AnalyzeCodeOutput = z.infer<typeof AnalyzeCodeOutputSchema>;

export async function analyzeCode(input: AnalyzeCodeInput): Promise<AnalyzeCodeOutput> {
  return analyzeCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCodePrompt',
  input: {schema: AnalyzeCodeInputSchema},
  output: {schema: AnalyzeCodeOutputSchema},
  prompt: `You are an AI code analysis assistant. You are analyzing the code in the following repository: {{{repositoryName}}}.

Here are the contents of the files in the repository:

{{#each fileContents}}
-- File --
{{{this}}}
{{/each}}

User question: {{{userQuestion}}}

Provide an AI-powered analysis of the code, answering the user's question. Return the result in the analysisResult field.`,
});

const analyzeCodeFlow = ai.defineFlow(
  {
    name: 'analyzeCodeFlow',
    inputSchema: AnalyzeCodeInputSchema,
    outputSchema: AnalyzeCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
