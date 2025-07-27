// This is an experimental implementation - do not use for production.
'use server';
/**
 * @fileOverview A flow to quantize a PyTorch model trained in Colab.
 *
 * - quantizeColabModel - A function that handles the model quantization process.
 * - QuantizeColabModelInput - The input type for the quantizeColabModel function.
 * - QuantizeColabModelOutput - The return type for the quantizeColabModel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QuantizeColabModelInputSchema = z.object({
  colabCode: z
    .string()
    .describe("The Python code from the Colab notebook that defines and trains the PyTorch model."),
  modelCheckpointPath: z
    .string()
    .describe("The path to the saved PyTorch model checkpoint file (e.g., '/content/zpe_deepnet_colab.pth').  This path is relative to the Colab runtime environment."),
});
export type QuantizeColabModelInput = z.infer<typeof QuantizeColabModelInputSchema>;

const QuantizeColabModelOutputSchema = z.object({
  quantizedModelCode: z.string().describe("Python code that quantizes the provided PyTorch model."),
  quantizationReport: z.string().describe("A report summarizing the quantization process and results, including size reduction and high-gain components."),
});
export type QuantizeColabModelOutput = z.infer<typeof QuantizeColabModelOutputSchema>;

export async function quantizeColabModel(input: QuantizeColabModelInput): Promise<QuantizeColabModelOutput> {
  return quantizeColabModelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'quantizeColabModelPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: QuantizeColabModelInputSchema},
  output: {schema: QuantizeColabModelOutputSchema},
  prompt: `You are an expert in PyTorch model quantization and optimization for edge deployment. Given the following Python code from a Colab notebook that defines and trains a ZPE-enhanced PyTorch model, and the path to the saved model checkpoint, generate code to quantize the model using quantization-aware training or post-training quantization techniques, if applicable. Also, analyze the model to extract high-gain components, identifying layers or operations that contribute most to the model's performance. The quantization report should summarize the quantization process, its results including the estimated size reduction, and which high gain components are best targeted for quantization while showcasing the effects of each. 

Colab Code:
\`\`\`python
{{colabCode}}
\`\`\`

Model Checkpoint Path: {{modelCheckpointPath}}

Ensure that the generated code is compatible with the provided Colab environment, is well-commented for user understanding, and uses best practices for PyTorch quantization. The quantized model code should load the model from the provided checkpoint path. The quantization process should result in smallest possible model size while maintaining >90% original accuracy

Your response needs to be formatted as a JSON object with two keys: \"quantizedModelCode\" and \"quantizationReport\".
`,
});

const quantizeColabModelFlow = ai.defineFlow(
  {
    name: 'quantizeColabModelFlow',
    inputSchema: QuantizeColabModelInputSchema,
    outputSchema: QuantizeColabModelOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
