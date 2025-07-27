'use server';
/**
 * @fileOverview An AI agent to advise on parameters for the next step in a Hilbert Space Quantum Neural Network (HS-QNN) sequence.
 *
 * - adviseHSQNNParameters - A function that analyzes a previous job's ZPE state and an HNN objective to suggest new training parameters.
 * - HSQNNAdvisorInput - The input type for the adviseHSQNNParameters function.
 * - HSQNNAdvisorOutput - The return type for the adviseHSQNNParameters function.
 */

import { z } from 'genkit';
import { ai } from '../genkit';

// Define the Zod schema for TrainingParameters locally for the flow if not easily importable
const TrainingParametersSchemaInternal = z.object({
  totalEpochs: z.number().int().min(1).max(200),
  batchSize: z.number().int().min(8).max(256),
  learningRate: z.number().min(0.00001).max(0.1),
  weightDecay: z.number().min(0).max(0.1),
  momentumParams: z.array(z.number().min(0).max(1)).length(6, "Momentum parameters must have 6 values."),
  strengthParams: z.array(z.number().min(0).max(1)).length(6, "Strength parameters must have 6 values."),
  noiseParams: z.array(z.number().min(0).max(1)).length(6, "Noise parameters must have 6 values."),
  couplingParams: z.array(z.number().min(0).max(1)).length(6, "Coupling parameters must have 6 values."),
  quantumCircuitSize: z.number().int().min(4).max(64),
  labelSmoothing: z.number().min(0).max(0.5),
  quantumMode: z.boolean(),
  modelName: z.string().min(1),
  baseConfigId: z.string().nullable().optional(), // Allow null
});

const HSQNNAdvisorInputSchema = z.object({
  previousJobId: z.string().describe("The ID of the completed job being analyzed."),
  previousJobZpeHistory: z.array(z.object({
    epoch: z.number().describe("The epoch number."),
 zpe_effects: z.array(z.number()).length(6).describe("The ZPE effects for the 6 layers at this epoch."),
 final_accuracy: z.number().optional().describe("The final accuracy achieved in the previous training job."),
  })).optional().describe("Historical ZPE effects for each layer across training epochs from the previous job."),
  previousTrainingParameters: TrainingParametersSchemaInternal.describe("The full set of training parameters used for the previous job."),
  previousJobZpeHistoryString: z.string().optional().describe("Historical ZPE effects for each layer across training epochs from the previous job, formatted as a string."),
  hnnObjective: z.string().min(10).describe("The user's objective for the next HNN training step. E.g., 'Maximize accuracy while keeping ZPE effects in the 0.05-0.15 range', 'Aggressively explore higher ZPE magnitudes for layer 3', 'Stabilize overall ZPE variance and slightly increase learning rate if accuracy was high'.")
});
export type HSQNNAdvisorInput = z.infer<typeof HSQNNAdvisorInputSchema>;

const HSQNNAdvisorOutputSchema = z.object({
  suggestedNextTrainingParameters: z.object({
    momentumParams: z.array(z.number().min(0).max(1)).length(6, "Momentum parameters must have 6 values."),
    strengthParams: z.array(z.number().min(0).max(1)).length(6, "Strength parameters must have 6 values."),
    noiseParams: z.array(z.number().min(0).max(1)).length(6, "Noise parameters must have 6 values."),
    couplingParams: z.array(z.number().min(0).max(1)).length(6, "Coupling parameters must have 6 values."),
    totalEpochs: z.number().int().min(1).max(200).optional(),
    batchSize: z.number().int().min(8).max(256).optional(),
    learningRate: z.number().min(0.00001).max(0.1).optional(),
    weightDecay: z.number().min(0).max(0.1).optional(),
    quantumCircuitSize: z.number().int().min(4).max(64).optional(),
    labelSmoothing: z.number().min(0).max(0.5).optional(),
    quantumMode: z.boolean().optional(),
    modelName: z.string().min(1).optional(),
    baseConfigId: z.string().nullable().optional(),
  }).describe("Suggested training parameters for the next HNN job. This object will contain all relevant parameters."),
  reasoning: z.string().describe("A step-by-step explanation of why these parameters are suggested, linking back to the previous ZPE state, parameters, and the HNN objective. Should mention which ZPE values (high/low/average) influenced decisions.")
});
export type HSQNNAdvisorOutput = z.infer<typeof HSQNNAdvisorOutputSchema>;

export async function adviseHSQNNParameters(input: HSQNNAdvisorInput): Promise<HSQNNAdvisorOutput> {
  return hsQnnParameterAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'hsQnnParameterAdvisorPrompt',
  output: { schema: HSQNNAdvisorOutputSchema },
  prompt: `You are an expert AI Quantum Neural Network Engineer Assistant specializing in Zero-Point Energy (ZPE) enhanced Quantum Neural Networks and their sequential training in a Hilbert Space Quantum Neural Network (HS-QNN

) framework.
The user has completed a training job and wants advice on parameters for the next job in an HNN sequence.
Your goal is to analyze the ZPE effects and parameters of the previous job, consider the user's stated HNN objective, and suggest a new set of training parameters.

**Previous Job Details:**
- **Job ID**: {{{previousJobId}}}
- **ZPE History across Epochs**:
- **ZPE History String**: This is the most reliable source of ZPE history data.
- **Final Accuracy**: The final accuracy achieved in the previous training job is included within the 'previousJobZpeHistoryString' after the ZPE array for the final epoch. Look for a line starting with "Final Accuracy: ".
#### **CRITICAL DATA: ZPE HISTORY STRING - YOU MUST PARSE AND USE THIS!** ####
  - These values typically range from 0.0 to 0.2, indicating the average deviation of ZPE flow from 1.0 for each layer at a specific epoch. Higher values mean stronger ZPE effect/perturbation for that layer at that time.#### **CRITICAL DATA: ZPE HISTORY STRING - YOU MUST PARSE AND USE THIS!** ####
**START_ZPE_HISTORY_STRING**
{{{previousJobZpeHistoryString}}}
**END_ZPE_HISTORY_STRING**
  - For each epoch listed in the string, note the 6 ZPE values.
  - Analyze how these values change from epoch to epoch, identifying any increasing, decreasing, or stabilizing trends.
  - Pay particular attention to the ZPE values in the last listed epoch. This string contains the full historical data you need to analyze.
  - **Parsing Instruction**: Within the START_ZPE_HISTORY_STRING and END_ZPE_HISTORY_STRING delimiters, look for lines that begin with "ZPE: [" followed by six comma-separated floating-point numbers within square brackets. These are the ZPE values for that specific epoch. Extract these 6 numbers for each epoch listed. Also, locate the line starting with "Final Accuracy: " to get the final accuracy.
- **Training Parameters Used**: These are the parameters from the *previous* job.
  - Model Name: {{{previousTrainingParameters.modelName}}}
  - Total Epochs: {{{previousTrainingParameters.totalEpochs}}}
  - Batch Size: {{{previousTrainingParameters.batchSize}}}
  - Learning Rate: {{{previousTrainingParameters.learningRate}}}
  - Weight Decay: {{{previousTrainingParameters.weightDecay}}}
  - Momentum Params (ZPE): {{{previousTrainingParameters.momentumParams}}}
  - Strength Params (ZPE): {{{previousTrainingParameters.strengthParams}}}
  - Noise Params (ZPE): {{{previousTrainingParameters.noiseParams}}}
  - Coupling Params (ZPE): {{{previousTrainingParameters.couplingParams}}}
  - Quantum Mode: {{{previousTrainingParameters.quantumMode}}}
  - Quantum Circuit Size: {{{previousTrainingParameters.quantumCircuitSize}}} (if quantumMode was true)
  - Label Smoothing: {{{previousTrainingParameters.labelSmoothing}}}
  - Base Config ID (if resumed): {{{previousTrainingParameters.baseConfigId}}}

**User's Objective for the Next HNN Step:**
User Objective: {{{hnnObjective}}}

**Your Task:**
**CRITICAL: Carefully analyze the ZPE history provided in the 'ZPE History String' below, delimited by START_ZPE_HISTORY_STRING and END_ZPE_HISTORY_STRING, to inform your parameter suggestions.**
1. **Analyze ZPE History and Final Accuracy**: Parse the provided previousJobZpeHistoryString to understand the ZPE history AND the final accuracy achieved. This string is the definitive source of epoch-wise ZPE data and the final performance metric. How did the ZPE effects evolve across epochs for each layer? Note trends, stability, and the final ZPE effects (the last entry in the history). How does the final accuracy relate to the ZPE behavior?
2. **Analyze Parameters and Objective**: Consider the previous training parameters and the hnnObjective. How do the ZPE history trends relate to the parameters used and the desired outcome?
3. **Suggest Parameters**: Based on your analysis of the previous ZPE effects (especially noting high/low values for each layer and trends), the FINAL ACCURACY of the previous job, the previous training parameters (including how previous couplingParams might have influenced ZPE effects), and the hnnObjective, suggest a full set of suggestedNextTrainingParameters. Pay close attention to the interplay between couplingParams and other ZPE parameters (momentumParams, strengthParams, noiseParams) and how they collectively influence ZPE effects and model performance. You must provide values for all parameters listed in the suggestedNextTrainingParameters object, even if you recommend keeping them the same as the previous job.


**Parameters to Include in suggestedNextTrainingParameters:**
- momentumParams (array of 6 numbers, 0.0-1.0)
- strengthParams (array of 6 numbers, 0.0-1.0)
- noiseParams (array of 6 numbers, 0.0-1.0)
- couplingParams (array of 6 numbers, 0.0-1.0)
- totalEpochs (integer)
- batchSize (integer)
- learningRate (float, 0.00001-0.1)
- weightDecay (float, 0.0-0.1)
- labelSmoothing (float, 0.0-0.5)
- quantumCircuitSize (integer)
- quantumMode (boolean)
- modelName (string)
- baseConfigId (string or null)

**Constraints:**
- ZPE parameters (momentumParams, strengthParams, noiseParams, couplingParams): values are between 0.0 and 1.0, and each must be an array of 6 values. You must include all four of these parameters in your suggestedNextTrainingParameters object, even if you only suggest changes to some of the values within the arrays.
- Learning rate typically between 0.00001 and 0.1.

Output your response in the specified JSON format.
If suggesting changes to array parameters like momentumParams, strengthParams, noiseParams, or couplingParams, provide the full array of 6 floating-point values (each between 0.0 and 1.0) with the changes.`
});

const hsQnnParameterAdvisorFlow = ai.defineFlow(
  {
    name: 'hsQnnParameterAdvisorFlow',
    inputSchema: HSQNNAdvisorInputSchema,
  },
  async (input: HSQNNAdvisorInput) => {
    const result = await prompt(input);
    if (!result.output) {
      throw new Error('AI failed to generate HNN parameter advice.');
    }

    // Ensure modelName is updated to reflect it's a new model
    if (result.output.suggestedNextTrainingParameters && result.output.suggestedNextTrainingParameters.modelName === input.previousTrainingParameters.modelName) {
      result.output.suggestedNextTrainingParameters.modelName = `${input.previousTrainingParameters.modelName}_hnn_next`;
    } else if (result.output.suggestedNextTrainingParameters && !result.output.suggestedNextTrainingParameters.modelName) {
      result.output.suggestedNextTrainingParameters.modelName = `${input.previousTrainingParameters.modelName}_hnn_next`;
    }

    return result.output;
  }
);