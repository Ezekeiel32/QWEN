// src/ai/flows/get-quantum-explanation-flow.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema for the flow
const GetQuantumExplanationInputSchema = z.object({
  currentEpoch: z.number().describe('The current training epoch.'),
  totalEpochs: z.number().describe('The total number of training epochs.'),
  currentLoss: z.number().describe('The current training loss.'),
  validationAccuracy: z.number().describe('The current validation accuracy.'),
  zpeEffects: z.array(z.number()).describe('An array of the current ZPE effect values for each layer.'),
  // Add other relevant model parameters or stats you want to explain
  modelName: z.string().describe('The name of the model being trained.'),
});

export type GetQuantumExplanationInput = z.infer<typeof GetQuantumExplanationInputSchema>;

// Define the output schema for the flow
const GetQuantumExplanationOutputSchema = z.object({
  explanation: z.string().describe('A natural language explanation of the quantum-inspired aspects of the model\'s performance.'),
  // Potentially include suggestions for further tuning or analysis
  suggestions: z.array(z.string()).optional().describe('Suggestions for further model development or analysis.'),
});

export type GetQuantumExplanationOutput = z.infer<typeof GetQuantumExplanationOutputSchema>;

// Define the language model prompt
const explanationPrompt = ai.definePrompt({
  name: 'quantumExplanationPrompt',
  input: { schema: GetQuantumExplanationInputSchema },
  output: { schema: GetQuantumExplanationOutputSchema },
  prompt: `You are an AI systems expert with a deep understanding of novel neural network architectures and quantum-inspired concepts.

  Analyze the following training statistics from a ZPE Deep Net model, which incorporates a Zero-Point Energy (ZPE) mechanism designed to mimic quantum zero-point fluctuations and inject data-aware dynamics into the network.

  Based on the provided data, explain in a clear and insightful manner how the ZPE effects observed during this training phase relate to the concept of quantum zero-point fluctuations and how they are contributing to the model's performance and adaptability.

  Consider the following concepts in your explanation:
  - ZPE flows oscillating around 1.0
  - Clamping of ZPE flows
  - Persistent, data-aware adaptation based on batch statistics (e.g., batch mean)
  - Layer-specific tuning (different momentum)
  - The idea of "000000.1" as a potential future representation for compressing information and simplifying operations in a quantum-inspired way.

  Explain how the current ZPE effects might be contributing to:
  - Dynamic regularization
  - Data-aware scaling
  - Breaking static norms of traditional CNNs
  - Improved generalization and robustness (as suggested by validation accuracy).

  Provide an explanation that bridges the observed training metrics with the theoretical "quantum-inspired" principles behind the ZPE mechanism and the broader vision of "quantum on simple devices" using concepts like "000000.1".

  Training Statistics:
  - Model Name: {{{modelName}}}
  - Epoch: {{{currentEpoch}}} / {{{totalEpochs}}}
  - Current Loss: {{{currentLoss}}}
  - Validation Accuracy: {{{validationAccuracy}}}%
  - ZPE Effects (mean absolute deviation from 1.0 for each flow): {{{zpeEffects}}}

  Output your explanation and optionally provide suggestions for future research or model improvements based on these observations.
  `,
});

// Define the Genkit flow
export const getQuantumExplanationFlow = ai.defineFlow(
  {
    name: 'getQuantumExplanationFlow',
    inputSchema: GetQuantumExplanationInputSchema,
    outputSchema: GetQuantumExplanationOutputSchema,
  },
  async (input) => {
    console.log(`Generating quantum explanation for model ${input.modelName} at epoch ${input.currentEpoch}`);
    const { output } = await explanationPrompt(input);
    console.log('Quantum explanation generated successfully.');
    return output!;
  }
);