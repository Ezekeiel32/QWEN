'use server';
/**
 * @fileOverview An AI agent to analyze ZPE quantum neural network performance data.
 *
 * - getInitialZpeAnalysis - A function that analyzes summary data and provides insights.
 * - GetInitialZpeAnalysisInput - The input type for the function.
 * - GetInitialZpeAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { TrainingParameters } from '@/types/training'; // For suggested_parameters type hint

const GetInitialZpeAnalysisInputSchema = z.object({
  totalConfigs: z.number().describe("Total number of model configurations available."),
  bestAccuracy: z.number().describe("The highest accuracy achieved among all configurations (0 if no configs)."),
  averageAccuracy: z.number().describe("The average accuracy across all configurations (0 if no configs)."),
  worstAccuracy: z.number().optional().describe("The lowest accuracy achieved among all configurations (0 if no configs)."), // Added from Perf page
  quantumConfigs: z.number().describe("Number of configurations that utilize quantum noise."),
  recentMetricsCount: z.number().describe("Number of recent performance metrics recorded (e.g., from the last 10 training runs)."),
  topQuantumEffects: z.array(z.number()).optional().describe("Array of top quantum effect values observed.") // Added from Perf page
});
export type GetInitialZpeAnalysisInput = z.infer<typeof GetInitialZpeAnalysisInputSchema>;

// Define the Zod schema for TrainingParameters locally for the flow if not easily importable
// This should mirror the structure in @/types/training.ts
const TrainingParametersSchemaInternalPartial = z.object({
  totalEpochs: z.number().int().min(1).max(200).optional(),
  batchSize: z.number().int().min(8).max(256).optional(),
  learningRate: z.number().min(0.00001).max(0.1).optional(),
  weightDecay: z.number().min(0).max(0.1).optional(),
  momentumParams: z.array(z.number().min(0).max(1)).length(6).optional().describe("Array of 6 momentum values (0.0-1.0) for each layer."),
  strengthParams: z.array(z.number().min(0).max(1)).length(6).optional().describe("Array of 6 strength values (0.0-1.0) for each layer."),
  noiseParams: z.array(z.number().min(0).max(1)).length(6).optional().describe("Array of 6 noise values (0.0-1.0) for each layer."),
  couplingParams: z.array(z.number().min(0).max(1)).length(6).optional().describe("Array of 6 coupling values (0.0-1.0) for each layer."),
  quantumCircuitSize: z.number().int().min(4).max(64).optional(),
  labelSmoothing: z.number().min(0).max(0.5).optional(),
  quantumMode: z.boolean().optional(),
  modelName: z.string().min(3).optional(),
  baseConfigId: z.string().nullable().optional(),
});


const GetInitialZpeAnalysisOutputSchema = z.object({
  performance_assessment: z.string().describe("Overall assessment of the ZPE network's performance based on provided summary data. Mention key stats like best/average accuracy."),
  quantum_insights: z.string().describe("Insights specific to quantum effects, ZPE interactions, or quantum noise if applicable, considering the number of quantum configs."),
  optimization_recommendations: z.array(
    z.object({
      title: z.string().describe("A concise title for the optimization suggestion (e.g., 'Explore Higher ZPE Strength')."),
      description: z.string().describe("A detailed description of the suggested optimization and its rationale."),
      priority: z.enum(["High", "Medium", "Low"]).describe("Priority level of the suggestion (High, Medium, or Low)."),
      expected_impact: z.string().describe("What is the expected impact if this suggestion is implemented (e.g., 'Potential +0.5% accuracy', 'Improved stability')."),
      suggested_parameters: TrainingParametersSchemaInternalPartial.nullable().optional().describe(
        "Specific parameter changes to try, if applicable. E.g., { learningRate: 0.0005 }. " +
        "If suggesting ZPE array parameters (momentumParams, strengthParams, noiseParams, couplingParams), provide the full array of 6 values. " +
        "If no specific parameters, this can be null or an empty object."
      )
    })
  ).min(1).max(3).describe("Provide 1 to 3 actionable recommendations to improve model performance or explore new configurations."),
  attention_areas: z.array(z.string()).min(1).max(3).describe("Provide 1 to 3 areas or specific metrics that require closer attention or might indicate issues (e.g., 'Low average accuracy despite high best accuracy', 'Few quantum configurations explored').")
});
export type GetInitialZpeAnalysisOutput = z.infer<typeof GetInitialZpeAnalysisOutputSchema>;

// Wrapper function to be called by the application
export async function getInitialZpeAnalysis(input: GetInitialZpeAnalysisInput): Promise<GetInitialZpeAnalysisOutput> {
  return getInitialZpeAnalysisGenkitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getInitialZpeAnalysisPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: GetInitialZpeAnalysisInputSchema },
  output: { schema: GetInitialZpeAnalysisOutputSchema },
  prompt: `You are an expert AI research assistant specializing in Zero-Point Energy (ZPE) enhanced Quantum Neural Networks.
Analyze the following summary of model configurations and performance metrics.
Provide a performance assessment, insights into quantum effects, 1 to 3 actionable optimization recommendations, and 1 to 3 areas requiring attention.
Ensure your output is structured according to the provided JSON schema.

Performance Summary:
- Total Model Configurations: {{{totalConfigs}}}
- Best Accuracy Achieved: {{bestAccuracy}}%
- Average Accuracy: {{averageAccuracy}}%
{{#if worstAccuracy}}- Worst Accuracy: {{worstAccuracy}}%{{/if}}
- Configurations Using Quantum Noise: {{{quantumConfigs}}}
- Recent Training Metrics Available: {{{recentMetricsCount}}}
{{#if topQuantumEffects.length}}- Top Quantum Effects observed: {{topQuantumEffects}}{{/if}}


For 'optimization_recommendations':
- If you suggest changes to array-based ZPE parameters like 'momentumParams', 'strengthParams', 'noiseParams', or 'couplingParams', you MUST provide the full array of 6 floating-point values (each between 0.0 and 1.0).
- For scalar parameters like 'learningRate', 'totalEpochs', 'batchSize', etc., provide them as simple key-value pairs within 'suggested_parameters'.
- 'suggested_parameters' can be null or an empty object if no specific parameter changes are advised for a recommendation.
- Ensure modelName is suggested if appropriate for a new experiment derived from these general suggestions.

Based on this data, generate your analysis.
If there are no configurations (totalConfigs is 0), your assessment should reflect that and suggest starting some training runs.
Recommendations should be general if no specific data trends are available.
`,
});

const getInitialZpeAnalysisGenkitFlow = ai.defineFlow(
  {
    name: 'getInitialZpeAnalysisFlow', // This is the internal Genkit flow name
    inputSchema: GetInitialZpeAnalysisInputSchema,
    outputSchema: GetInitialZpeAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate ZPE analysis.');
    }
    return output;
  }
);
