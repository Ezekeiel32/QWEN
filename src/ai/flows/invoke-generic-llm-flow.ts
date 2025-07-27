
'use server';
/**
 * @fileOverview A generic flow to invoke a large language model with a custom prompt.
 *
 * - invokeGenericLlm - A function that handles the generic LLM invocation.
 * - InvokeGenericLlmInput - The input type for the invokeGenericLlm function.
 * - InvokeGenericLlmOutput - The return type for the invokeGenericLlm function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit'; // Genkit's Zod is typically z from 'zod' or genkit/zod

const InvokeGenericLlmInputSchema = z.object({
  prompt: z.string().min(1).describe('The prompt to send to the language model.'),
  outputSchema: z.string().optional().describe('An optional JSON schema (as a string) to guide the LLM output format. If provided, the LLM will attempt to structure its response accordingly.'),
  // modelName: z.string().optional().describe('Optional model name to use for this specific invocation, e.g., "googleai/gemini-1.5-flash-latest". Defaults to the global Genkit config if not provided.')
});
export type InvokeGenericLlmInput = z.infer<typeof InvokeGenericLlmInputSchema>;

const InvokeGenericLlmOutputSchema = z.object({
  response: z.any().describe('The response from the language model. This could be a string or a JSON object if outputSchema was provided and successfully applied.'),
  error: z.string().optional().describe('Any error message if the invocation failed or output parsing failed.'),
});
export type InvokeGenericLlmOutput = z.infer<typeof InvokeGenericLlmOutputSchema>;

export async function invokeGenericLlm(input: InvokeGenericLlmInput): Promise<InvokeGenericLlmOutput> {
  return invokeGenericLlmFlow(input);
}

const genericPrompt = ai.definePrompt({
  name: 'invokeGenericLlmPrompt',
  // The model will be picked from the global `ai` object configuration or override if input.modelName is used.
  input: { schema: InvokeGenericLlmInputSchema },
  // Output schema will be dynamically handled if input.outputSchema is present
  // For a truly generic flow, we might not specify a fixed output schema here
  // or we handle it more dynamically within the flow logic.
  // For now, we'll let the flow handle parsing based on the input.
  prompt: `
System: You are a helpful AI assistant. Follow the user's prompt.
{{#if outputSchema}}
The user has provided an output JSON schema. Please structure your response strictly according to this schema.
Do NOT add any explanatory text before or after the JSON output if a schema is provided.
Output JSON Schema:
\`\`\`json
{{{outputSchema}}}
\`\`\`
{{/if}}

User Prompt:
{{{prompt}}}
`,
});

const invokeGenericLlmFlow = ai.defineFlow(
  {
    name: 'invokeGenericLlmFlow',
    inputSchema: InvokeGenericLlmInputSchema,
    outputSchema: InvokeGenericLlmOutputSchema,
  },
  async (input) => {
    try {
      const { output: llmOutput } = await genericPrompt(input);

      if (input.outputSchema && llmOutput && typeof llmOutput === 'string') {
        // If an output schema was provided, attempt to parse the LLM's string output as JSON
        try {
          const parsedResponse = JSON.parse(llmOutput as string); // Assuming LLM produces a string that is valid JSON
          return { response: parsedResponse };
        } catch (parseError: any) {
          console.error("Failed to parse LLM output as JSON:", parseError);
          // Return the raw string output along with a parsing error message
          return {
            response: llmOutput, // Return raw string if parsing fails
            error: `LLM output was expected to be JSON but parsing failed: ${parseError.message}. Raw output provided.`,
          };
        }
      } else if (llmOutput) {
        // If no output schema, or LLM output is already structured (e.g. tool use, or native JSON mode)
        return { response: llmOutput };
      }
      // Fallback if llmOutput is null/undefined but no error was thrown by genericPrompt
      return { response: null, error: "LLM returned no output." };

    } catch (error: any) {
      console.error("Error in invokeGenericLlmFlow:", error);
      return { response: null, error: error.message || "An unexpected error occurred during LLM invocation." };
    }
  }
);
    
