'use server';
import { z } from 'genkit';
import { ai } from '../genkit';
import { callAnyOpenLlm } from './multiProviderLlm';

const DatasetAdvisorInputSchema = z.object({
  projectGoal: z.string().min(10).describe("The user's primary goal for their AI project."),
  currentData: z.string().optional().describe("A description of the data the user currently has, if any."),
});
export type DatasetAdvisorInput = z.infer<typeof DatasetAdvisorInputSchema>;

const DatasetAdvisorOutputSchema = z.object({
  recommendedDatasets: z.array(z.object({
    name: z.string().describe("The full name of the recommended dataset."),
    source: z.string().describe("The source of the dataset (e.g., Kaggle, Hugging Face, paperswithcode)."),
    reason: z.string().describe("A brief explanation of why this dataset is suitable for the user's project."),
    url: z.string().describe("A direct URL to view the dataset."),
  })).describe("A list of 2-3 recommended datasets."),
  suggestedApproaches: z.array(z.object({
    technique: z.string().describe("The name of the ML/AI technique or model architecture suggested."),
    description: z.string().describe("A short description of the approach and why it's a good fit."),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe("The estimated difficulty of implementing this approach."),
  })).describe("Suggested machine learning techniques or approaches."),
  keyParameters: z.object({
    learning_rate: z.string().optional(),
    batch_size: z.string().optional(),
    epochs: z.string().optional(),
    optimizer: z.string().optional(),
  }).describe("Key hyperparameters to start with for the suggested approaches."),
  potentialChallenges: z.array(z.object({
    challenge: z.string().describe("A potential challenge the user might face."),
    solution: z.string().describe("A suggested way to mitigate or solve the challenge."),
  })).describe("Potential challenges and how to address them."),
  successMetrics: z.array(z.string()).describe("Key metrics to measure the success of the project (e.g., Accuracy, F1-score, MAE)."),
  reasoning: z.string().describe("A comprehensive explanation of the recommendations, tying together the datasets, approaches, and user's goal."),
});
export type DatasetAdvisorOutput = z.infer<typeof DatasetAdvisorOutputSchema>;

function fixLlmKeys(raw: any): any {
  // Fix suggestedApproaches
  const suggestedApproaches = (raw.suggestedApproaches || raw.suggested_ml_approaches || []).map((item: any) => {
    const technique = item.technique || item.approach || '';
    // Use 'description', 'suitability', or fallback to 'technique' or 'approach'
    const description = item.description || item.suitability || technique || item.approach || '';
    const difficulty = item.difficulty || 'Medium';
    return { technique, description, difficulty };
  });

  // Fix keyParameters: ensure snake_case and string values
  const keyParamsRaw = raw.keyParameters || raw.key_hyperparameters || {};
  const keyParameters: Record<string, string> = {};
  for (const [k, v] of Object.entries(keyParamsRaw)) {
    // Convert camelCase or spaced keys to snake_case
    const snake = k.replace(/([A-Z])/g, '_$1').replace(/\s+/g, '_').toLowerCase();
    keyParameters[snake] = String(v);
  }

  return {
    recommendedDatasets: raw.recommendedDatasets || raw.recommended_datasets || [],
    suggestedApproaches,
    keyParameters,
    potentialChallenges: raw.potentialChallenges || raw.potential_challenges_solutions || [],
    successMetrics: raw.successMetrics || raw.success_metrics || [],
    reasoning: raw.reasoning || raw.overall_reasoning || raw['overallReasoning'] || ''
  };
}

const datasetAdvisorFlow = ai.defineFlow(
  {
    name: 'datasetAdvisorFlow',
    inputSchema: DatasetAdvisorInputSchema,
    outputSchema: DatasetAdvisorOutputSchema,
  },
  async (input) => {
    const prompt = `You are an expert AI config generator. Output ONLY valid, minified JSON matching the following schema and example. 
DO NOT invent, rename, or omit any fields. DO NOT use snake_case. DO NOT add explanations or comments. 
If you cannot fill a field, use an empty string or null.

SCHEMA:
{
  "recommendedDatasets": [
    {
      "name": "string",
      "source": "string",
      "reason": "string",
      "url": "string"
    }
  ],
  "suggestedApproaches": [
    {
      "technique": "string",
      "description": "string",
      "difficulty": "Easy|Medium|Hard"
    }
  ],
  "keyParameters": {
    "learning_rate": "string",
    "batch_size": "string",
    "epochs": "string",
    "optimizer": "string"
  },
  "potentialChallenges": [
    {
      "challenge": "string",
      "solution": "string"
    }
  ],
  "successMetrics": [
    "string"
  ],
  "reasoning": "string"
}

EXAMPLE OUTPUT:
{"recommendedDatasets":[{"name":"MNIST","source":"Kaggle","reason":"Classic digit recognition dataset.","url":"https://kaggle.com/mnist"}],"suggestedApproaches":[{"technique":"CNN","description":"Convolutional Neural Network for image classification.","difficulty":"Easy"}],"keyParameters":{"learning_rate":"0.001","batch_size":"32","epochs":"10","optimizer":"Adam"},"potentialChallenges":[{"challenge":"Overfitting","solution":"Use dropout and data augmentation."}],"successMetrics":["Accuracy"],"reasoning":"This approach is proven for digit recognition."}

Now, based on the following project details, output ONLY valid, minified JSON matching the schema above. If you cannot fill a field, use an empty string or null.

PROJECT DETAILS:
- Project Goal: ${input.projectGoal}
- Current Data Situation: ${input.currentData || 'N/A'}`;

    const llmResponse = await callAnyOpenLlm(prompt);
    let parsed;
    try {
      parsed = JSON.parse(llmResponse);
      parsed = fixLlmKeys(parsed);
    } catch (e) {
      throw new Error('LLM did not return valid JSON. Raw output: ' + llmResponse);
    }
    return parsed;
  }
);

export async function adviseForDataset(input: DatasetAdvisorInput): Promise<DatasetAdvisorOutput> {
  return datasetAdvisorFlow(input);
} 