// src/ai/flows/extract-high-gain-components.ts
'use server';
/**
 * @fileOverview An AI agent for extracting high gain components for targeted quantum application.
 *
 * - extractHighGainComponents - A function that handles the extraction process.
 * - ExtractHighGainComponentsInput - The input type for the extractHighGainComponents function.
 * - ExtractHighGainComponentsOutput - The return type for the extractHighGainComponents function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractHighGainComponentsInputSchema = z.object({
  modelArchitectureDescription: z
    .string()
    .describe("The description of the model architecture to analyze, including layer types, connections, and parameters."),
  performanceMetrics: z.string().describe('Performance metrics of the model during training and validation, such as accuracy, loss, and ZPE effects per layer.'),
  quantumApplicationTarget: z
    .string()
    .describe("The specific quantum application that the extracted components will be used for, including objectives and constraints."),
});
export type ExtractHighGainComponentsInput = z.infer<typeof ExtractHighGainComponentsInputSchema>;

const ExtractHighGainComponentsOutputSchema = z.object({
  highGainComponents: z
    .array(z.string())
    .describe('List of high-gain components identified, including layer names and reasons for their high gain.'),
  justification: z.string().describe('A detailed justification for selecting the identified components, explaining their relevance to the quantum application target.'),
});
export type ExtractHighGainComponentsOutput = z.infer<typeof ExtractHighGainComponentsOutputSchema>;

export async function extractHighGainComponents(input: ExtractHighGainComponentsInput): Promise<ExtractHighGainComponentsOutput> {
  return extractHighGainComponentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractHighGainComponentsPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: ExtractHighGainComponentsInputSchema},
  output: {schema: ExtractHighGainComponentsOutputSchema},
  prompt: `You are an AI researcher specializing in quantum machine learning. Your task is to analyze a given model architecture and performance metrics to extract high-gain components that are suitable for a specific quantum application.

Model Architecture:
{{modelArchitectureDescription}}

Performance Metrics:
{{performanceMetrics}}

Quantum Application Target:
{{quantumApplicationTarget}}

Based on the provided information, identify the high-gain components and provide a justification for your selection. Be sure to list the reasons for their high gain and relevance to the quantum application target.

Output the highGainComponents as a list and the justification as a string.
`,
});

const extractHighGainComponentsFlow = ai.defineFlow(
  {
    name: 'extractHighGainComponentsFlow',
    inputSchema: ExtractHighGainComponentsInputSchema,
    outputSchema: ExtractHighGainComponentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

