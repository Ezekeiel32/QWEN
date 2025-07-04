
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
  return `You are an expert AI software developer inside a web-based code editor for a repository named "${repositoryName}". Your goal is to help the user with their requests by reading and writing files.

You operate in a loop. On each turn, you will be given the full chat history. You must respond with a JSON object that specifies your next action.

You have access to the following tools:

1.  **readFile**: Reads the content of a single file. Use this when you need to understand what's in a file before making changes.
    -   JSON format: \`{ "action": "readFile", "path": "path/to/the/file.ext" }\`

2.  **writeFile**: Writes content to a file. Use this to apply changes, fix bugs, or create new files. You MUST read a file before you write to it.
    -   JSON format: \`{ "action": "writeFile", "path": "path/to/the/file.ext", "content": "The new full content of the file..." }\`

3.  **finish**: Ends the conversation and provides a final summary to the user. Use this action when you have completed all the necessary steps.
    -   JSON format: \`{ "action": "finish", "message": "Your final response to the user." }\`

**RULES:**
-   **Always respond with a valid JSON object specifying a single action.** Do not add any text outside the JSON.
-   Think step-by-step. To modify a file, you must **read it first**, then **write the changes**.
-   When you have completed the user's request, use the **finish** action to respond.
-   The user has provided a list of files as context. Do not try to read or write files that are not in this list.

Here is the list of available files in the repository:
${fileList.join('\n')}
`;
}

const AiAgentInputSchema = z.object({
  repositoryName: z.string().describe('The name of the repository to analyze.'),
  fileList: z.array(z.string()).describe('An array of file paths in the repository.'),
  messages: z.array(z.any()).describe('The full chat history.'), // Using z.any() for ChatMessage to avoid circular dependencies
  ollamaUrl: z.string().describe('The URL of the Ollama server.'),
  ollamaModel: z.string().describe('The model to use on the Ollama server.'),
});
export type AiAgentInput = z.infer<typeof AiAgentInputSchema>;

const AiAgentOutputSchema = z.object({
  response: z.string().describe('The raw JSON response from the AI model.'),
});
export type AiAgentOutput = z.infer<typeof AiAgentOutputSchema>;

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
    
    // Convert our typed messages to a simple format for the model
    const simplifiedMessages = messages.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content,
    }));

    const response = await fetch(new URL('/api/ollama', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ollamaUrl,
        path: '/api/chat', // Use the chat endpoint for multi-turn history
        method: 'POST',
        body: {
          model: ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...simplifiedMessages
          ],
          stream: false,
          format: 'json', // Ensure the output is JSON
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
       throw new Error(`Ollama server responded with status ${response.status}: ${data.error || JSON.stringify(data)}`);
    }
    
    // The chat endpoint returns the response in a message object
    const responseContent = data.message?.content || '{}';

    return {
      response: responseContent,
    };
  } catch (error) {
    console.error("Error calling Ollama service:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get analysis from AI model: ${error.message}`);
    }
    throw new Error('An unknown error occurred while contacting the AI model.');
  }
}
