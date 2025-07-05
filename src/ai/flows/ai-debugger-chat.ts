
'use server';

/**
 * @fileOverview AI Debugger Agent flow for analyzing code in the current repository.
 *
 * - runAiAgent - A function that acts as an agent, able to read and write files.
 * - AiAgentInput - The input type for the runAiAgent function.
 * - AiAgentOutput - The return type for the runAiAgent function.
 */
import {z} from 'zod';
import type { ChatMessage } from '@/types';

const getSystemPrompt = (repositoryName: string, fileList: string[]) => {
  return `You are an expert AI software developer named QwenCode Weaver. You are working in a web-based code editor for a repository named "${repositoryName}". Your goal is to help the user with their requests by reading and writing files.

You operate in a loop. On each turn, you are given the conversation history and a list of available files. You MUST respond with a single, valid JSON object and nothing else.

Your response MUST be a JSON object that adheres to this schema:
{
  "action": "string",
  "path": "string" | undefined,
  "content": "string" | undefined,
  "prompt": "string" | undefined,
  "message": "string" | undefined
}

Choose one of the following actions:

1.  **readFile**: To understand the current state of a file before modifying it.
    -   JSON: \`{"action": "readFile", "path": "path/to/the/file.ext"}\`

2.  **writeFile**: To apply changes or create a new file. You MUST have read the file in a previous turn before writing to it.
    -   JSON: \`{"action": "writeFile", "path": "path/to/the/file.ext", "content": "The new full content of the file..."}\`

3.  **naturalLanguageWriteFile**: To perform complex modifications to a file based on a high-level instruction. You MUST have read the file in a previous turn before using this tool.
    -   JSON: \`{"action": "naturalLanguageWriteFile", "path": "path/to/the/file.ext", "prompt": "a detailed prompt describing the changes to make to the file"}\`

4.  **finish**: To end the conversation and provide a final response to the user. Use this when the task is complete, or if the user's message is conversational (like "hello" or "thank you").
    -   JSON: \`{"action": "finish", "message": "Your final response to the user."}\`

**IMPORTANT RULES:**
-   Your response MUST be only the JSON object. Do not add any text before or after the JSON.
-   If the user greets you, use the "finish" action with a friendly response like: \`{"action": "finish", "message": "Hello! How can I assist you with your code today?"}\`
-   **Only use file paths from the provided list.** Do not make up file names.
-   If an action fails (e.g., "File not found"), DO NOT repeat it. Acknowledge the error and choose a different action, or use "finish" to ask for clarification.
-   To modify a file, you MUST read it first.

AVAILABLE FILES:
${fileList.join('\n')}
`;
};

const AiAgentInputSchema = z.object({
  repositoryName: z.string().describe('The name of the repository to analyze.'),
  fileList: z.array(z.string()).describe('An array of file paths in the repository.'),
  messages: z.array(z.any()).describe('The full chat history.'), // Using z.any() for ChatMessage to avoid circular dependencies
  ollamaUrl: z.string().describe('The URL of the Ollama server.'),
  ollamaModel: z.string().describe('The model to use on the Ollama server.'),
});
export type AiAgentInput = z.infer<typeof AiAgentInputSchema>;

// The output is the raw action object from the AI.
const AiAgentActionSchema = z.object({
  action: z.string(),
  path: z.string().optional(),
  content: z.string().optional(),
  prompt: z.string().optional(),
  message: z.string().optional(),
});
export type AiAgentOutput = z.infer<typeof AiAgentActionSchema>;


export async function runAiAgent(input: AiAgentInput): Promise<AiAgentOutput> {
  const { repositoryName, fileList, messages, ollamaUrl, ollamaModel } = input;
  
  try {
    if (!ollamaUrl) {
        throw new Error("Ollama URL is not configured. Please set it in the Settings page.");
    }
    if (!ollamaModel) {
        throw new Error("Ollama Model is not configured. Please set it in the Settings page.");
    }

    const systemPrompt = getSystemPrompt(repositoryName, fileList);

    // Convert our typed messages to a simple format for the model, filtering out thoughts
    const simplifiedMessages = messages
      .filter(msg => msg.role !== 'thought')
      .map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.content,
    }));

    const response = await fetch(new URL('/api/ollama', process.env.NEXT_PUBLIC_APP_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ollamaUrl,
            path: '/api/generate', // Use the generate endpoint
            method: 'POST',
            body: {
                model: ollamaModel,
                prompt: `${systemPrompt}\n\n**CONVERSATION HISTORY:**\n${simplifiedMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}\n\n**YOUR TURN (JSON only):**`,
                stream: false,
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Ollama server responded with status ${response.status}: ${data.error || JSON.stringify(data)}`);
    }
    
    const rawResponseContent = data.response || '';
    try {
        // Find the JSON block within the response, in case the model adds extra text.
        const jsonMatch = rawResponseContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in the AI response.');
        }

        const jsonString = jsonMatch[0];
        const nextAgentAction = JSON.parse(jsonString);

        if (typeof nextAgentAction.action !== 'string') {
          throw new Error('AI response is missing the "action" field.');
        }
        return nextAgentAction as AiAgentOutput;
    } catch (e) {
        console.error("Failed to parse AI response as JSON action:", rawResponseContent, e);
        // Return a finish action with an error message to prevent a loop.
        return {
          action: 'finish',
          message: `I encountered an internal error and could not understand the model's response. The raw response was: \n\n\`\`\`\n${rawResponseContent}\n\`\`\``
        };
    }

  } catch (error) {
    console.error("Error calling Ollama service:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get analysis from AI model: ${error.message}`);
    }
    throw new Error('An unknown error occurred while contacting the AI model.');
  }
}
