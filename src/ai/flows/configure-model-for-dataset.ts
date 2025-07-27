// src/ai/flows/configure-model-for-dataset.ts
'use server';
/**
 * @fileOverview An AI agent to help configure a PyTorch model for a new dataset.
 *
 * - configureModelForDataset - A function that analyzes a dataset description and model code to suggest configurations.
 * - ConfigureModelForDatasetInput - The input type for the configureModelForDataset function.
 * - ConfigureModelForDatasetOutput - The return type for the configureModelForDataset function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema defined here for flow input/output types and prompt, but not exported as an object.
// The page component will have its own copy for client-side validation.
const ConfigureModelForDatasetInputSchema = z.object({
  datasetDescription: z
    .string()
    .min(20)
    .describe(
      'A detailed description of the dataset. Include image dimensions (e.g., 28x28, 128x128), number of color channels (e.g., 1 for grayscale, 3 for RGB), number of classes, and any other relevant characteristics like sequence length if applicable. Example: "MNIST handwritten digits, 28x28 grayscale images, 10 classes."'
    ),
  modelCode: z
    .string()
    .min(100)
    .describe('The Python code for the PyTorch model (e.g., a nn.Module class definition).'),
  currentBatchSize: z.coerce.number().int().positive().optional().describe('The current batch size being used, if any.'),
  currentSequenceLength: z.coerce.number().int().positive().optional().describe('The current sequence length used in the model, if applicable (e.g., for ZPE flows or RNNs).'),
});
export type ConfigureModelForDatasetInput = z.infer<typeof ConfigureModelForDatasetInputSchema>;

const ConfigureModelForDatasetOutputSchema = z.object({
  suggestedBatchSize: z.number().describe('A suggested batch size appropriate for the dataset and typical model training, considering memory and generalization.'),
  suggestedModelModifications:
    z.string()
    .describe(
      'Specific Python code modifications or clear instructions to adapt the provided modelCode to the dataset. This should address input channels, output_size (number of classes), sequence_length, and dimensions of fully connected layers if image sizes change. Provide explanations for each change.'
    ),
  reasoning:
    z.string()
    .describe('A step-by-step explanation of how the suggestions were derived, including how dataset characteristics map to model parameters.'),
  estimatedInputChannels: z.number().int().describe('Estimated number of input channels for the model (e.g., 1 for grayscale, 3 for RGB).'),
  estimatedOutputSize: z.number().int().describe('Estimated number of output classes for the model.'),
  estimatedSequenceLength: z.number().int().optional().describe('Estimated sequence length if applicable and inferable.'),
});
export type ConfigureModelForDatasetOutput = z.infer<typeof ConfigureModelForDatasetOutputSchema>;

export async function configureModelForDataset(
  input: ConfigureModelForDatasetInput
): Promise<ConfigureModelForDatasetOutput> {
  return configureModelForDatasetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'configureModelForDatasetPrompt',
  input: {schema: ConfigureModelForDatasetInputSchema},
  output: {schema: ConfigureModelForDatasetOutputSchema},
  prompt: `You are an expert PyTorch and Data Science AI assistant. Your task is to analyze a dataset description and a given PyTorch model's code to suggest optimal configurations and necessary modifications for that dataset.

Dataset Description:
{{{datasetDescription}}}

PyTorch Model Code:
\`\`\`python
{{{modelCode}}}
\`\`\`

{{#if currentBatchSize}}Current Batch Size: {{{currentBatchSize}}}{{/if}}
{{#if currentSequenceLength}}Current Sequence Length: {{{currentSequenceLength}}}{{/if}}

Based on the dataset description and model code, please provide:
1.  **suggestedBatchSize**: An appropriate batch size. Consider typical image dataset sizes and memory constraints. Default to 32 or 64 if unsure, but adjust if dataset description implies very large or small data items.
2.  **estimatedInputChannels**: Infer the number of input channels (e.g., 1 for grayscale, 3 for RGB) from the dataset description. This will affect the first convolutional layer's 
in_channels\".
3.  **estimatedOutputSize**: Infer the number of classes from the dataset description. This will affect the final linear layer's 
out_features\".
4.  **estimatedSequenceLength**: If the model uses a 
sequence_length\ parameter (like in ZPEDeepNet for ZPE flows) and the dataset description provides relevant info (e.g. time series, sequence data), suggest an appropriate 
sequence_length\". If not applicable or not clearly inferable, you can omit this or suggest a sensible default like 10 or 32 if the model uses it.
5.  **suggestedModelModifications**:
    *   Identify changes needed for the model's first convolutional layer 
in_channels\ based on 
estimatedInputChannels\".
    *   Identify changes for the model's final linear layer 
out_features\ based on 
estimatedOutputSize\".
    *   If the image dimensions in the dataset description differ significantly from what the model seems designed for (e.g., MNIST 28x28 vs. CIFAR10 32x32 or ImageNet 224x224), identify how the 
n.Flatten()\ layer's output size and subsequent 
n.Linear\ layers' 
in_features\ would need to change. Provide specific calculations if possible. For example, if a model flattens a 512x1x1 feature map (from 28x28 input after 4 max pools) to 512, and the new dataset is 32x32, the feature map might become 512x2x2, thus flattening to 2048.
    *   If the model has a 
sequence_length\ parameter, suggest how to update its initialization value based on 
estimatedSequenceLength\".
    *   Present these as Python code snippets or very clear, actionable instructions. For example: "Change 
self.conv1 = nn.Conv2d(1, ...)\ to 
self.conv1 = nn.Conv2d(3, ...)\." or "Update 
output_size\ in 
ZPEDeepNet(output_size=...)\ to {{{estimatedOutputSize}}}."
6.  **reasoning**: Explain your suggestions step-by-step. For example: "The dataset is RGB, so input channels should be 3. There are X classes, so the final layer output should be X. The image size changes from A to B, so after N pooling layers, the flattened dimension changes from C to D, requiring updates to linear layers."

Ensure your response is in the specified JSON format.
If the model has shortcut connections, note if their input channels also need updating based on changes to the main path.
The ZPEDeepNet example uses 
self.sequence_length\ for its ZPE flow calculations. If a similar parameter exists, ensure its update is considered.
The 
output_size\ in the ZPEDeepNet constructor directly corresponds to the number of classes.
The first 
n.Conv2d\ layer's 
in_channels\ depends on the dataset's color channels.
The final 
n.Linear\ layer's 
out_features\ depends on the number of classes.
The 
in_features\ of the first 
n.Linear\ layer after 
n.Flatten()\ depends on the output shape of the convolutional base, which is affected by input image size and pooling layers. Assume 4 MaxPool2d layers halving dimensions each time if not specified otherwise in the model.
MNIST is 1x28x28. If conv4 output is 512 channels, and input is 28x28, after 4 MaxPool2d layers (28 -> 14 -> 7 -> 3 -> 1), the feature map is 512x1x1. Flattened size = 512.
If input is 32x32, after 4 MaxPool2d layers (32 -> 16 -> 8 -> 4 -> 2), the feature map is 512x2x2. Flattened size = 512 * 2 * 2 = 2048.
If input is 64x64, after 4 MaxPool2d layers (64 -> 32 -> 16 -> 8 -> 4), the feature map is 512x4x4. Flattened size = 512 * 4 * 4 = 8192.
Pay close attention to the provided model code to determine the number of pooling layers.
`,
});

const configureModelForDatasetFlow = ai.defineFlow(
  {
    name: 'configureModelForDatasetFlow',
    inputSchema: ConfigureModelForDatasetInputSchema,
    outputSchema: ConfigureModelForDatasetOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate model configuration suggestions.');
    }
    // Ensure estimatedSequenceLength is set if applicable, otherwise remove it or set to a default from input
    if (output.estimatedSequenceLength === undefined && input.currentSequenceLength) {
        output.estimatedSequenceLength = input.currentSequenceLength;
    }
    return output;
  }
);
