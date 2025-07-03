'use server';

/**
 * @fileOverview An AI agent for applying code changes suggested by the AI Debugger Chat.
 *
 * - applyCodeChanges - A function that handles the application of code changes to a file.
 * - ApplyCodeChangesInput - The input type for the applyCodeChanges function.
 * - ApplyCodeChangesOutput - The return type for the applyCodeChanges function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ApplyCodeChangesInputSchema = z.object({
  fileName: z.string().describe('The name of the file to apply the changes to.'),
  originalCode: z.string().describe('The original code of the file.'),
  suggestedChanges: z.string().describe('The code changes suggested by the AI.'),
});
export type ApplyCodeChangesInput = z.infer<typeof ApplyCodeChangesInputSchema>;

const ApplyCodeChangesOutputSchema = z.object({
  updatedCode: z.string().describe('The code with the applied changes.'),
});
export type ApplyCodeChangesOutput = z.infer<typeof ApplyCodeChangesOutputSchema>;

export async function applyCodeChanges(input: ApplyCodeChangesInput): Promise<ApplyCodeChangesOutput> {
  return applyCodeChangesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'applyCodeChangesPrompt',
  input: {schema: ApplyCodeChangesInputSchema},
  output: {schema: ApplyCodeChangesOutputSchema},
  prompt: `You are a code modification expert.

You are given the original code and changes for it. You will apply these changes to the original code and return the updated version.

Original Code:
{{originalCode}}

Suggested Changes:
{{suggestedChanges}}`,
});

const applyCodeChangesFlow = ai.defineFlow(
  {
    name: 'applyCodeChangesFlow',
    inputSchema: ApplyCodeChangesInputSchema,
    outputSchema: ApplyCodeChangesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      updatedCode: output!.updatedCode,
    };
  }
);
