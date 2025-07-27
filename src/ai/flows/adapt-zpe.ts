// src/ai/flows/adapt-zpe.ts
'use server';
/**
 * @fileOverview Adapts zero-point energy from a custom PyTorch component to enhance model performance.
 *
 * - adaptZeroPointEnergy - A function that handles the ZPE adaptation process.
 * - AdaptZeroPointEnergyInput - The input type for the adaptZeroPointEnergy function.
 * - AdaptZeroPointEnergyOutput - The return type for the adaptZeroPointEnergy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptZeroPointEnergyInputSchema = z.object({
  modelCode: z
    .string()
    .describe("The custom PyTorch component code, such as the ZPEDeepNet class, including the perturb_zpe_flow method."),
  layerData: z.record(z.string(), z.number()).describe('A map of layer names to numerical ZPE-related data, like mean activation.'),
  cycleLength: z.number().default(32).describe("The cycle length (sequence length) for ZPE adaptation.")
});
export type AdaptZeroPointEnergyInput = z.infer<typeof AdaptZeroPointEnergyInputSchema>;

const AdaptZeroPointEnergyOutputSchema = z.object({
  adaptedZpeFlows: z.record(z.string(), z.number()).describe('A map of layer names to adapted ZPE flow values'),
  analysis: z.string().describe('Summary of the adaptation process')
});
export type AdaptZeroPointEnergyOutput = z.infer<typeof AdaptZeroPointEnergyOutputSchema>;

export async function adaptZeroPointEnergy(input: AdaptZeroPointEnergyInput): Promise<AdaptZeroPointEnergyOutput> {
  return adaptZeroPointEnergyFlow(input);
}


const prompt = ai.definePrompt({
  name: 'adaptZeroPointEnergyPrompt',
  input: {schema: AdaptZeroPointEnergyInputSchema},
  output: {schema: AdaptZeroPointEnergyOutputSchema},
  prompt: `You are an expert AI researcher, adept at analyzing PyTorch code and adapting parameters for optimal neural network performance.

  Given the following PyTorch component code, written in Colab for ZPE Deep Net that contains a method to perturb the zpe_flow values based on layer data, and the layer data, adapt the zpe_flow values to improve model performance. Explain the steps you took to adapte ZPE flows and what benefits those steps should give.

  Make sure that zpe_flow parameter values are clamped between 0.8 and 1.2. Make sure the output key names matches with the layer name from the input.\n
  PyTorch component code: {{{modelCode}}}
  Layer Data: {{{layerData}}}

  Output adapted zpe_flow values.
  `,
});

const adaptZeroPointEnergyFlow = ai.defineFlow(
  {
    name: 'adaptZeroPointEnergyFlow',
    inputSchema: AdaptZeroPointEnergyInputSchema,
    outputSchema: AdaptZeroPointEnergyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

