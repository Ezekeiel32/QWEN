
'use server';

/**
 * @fileOverview AI Debugger Agent flow for analyzing code in the current repository.
 *
 * - runAiAgent - A function that acts as an agent, able to read and write files.
 * - AiAgentInput - The input type for the runAiAgent function.
 * - AiAgentOutput - The return type for the runAiAgent function.
 */
import {z} from 'zod';
import type { ChatMessage, CodeFile } from '@/types'; // Import CodeFile type

const getSystemPrompt = (repositoryName: string, fileList: string[]) => {
  // Correctly escape backticks and newlines within the template literal
  // For markdown code blocks: use ``` followed by a language (e.g., json)
  // For inline code: use ` (escaped as \`)
  return `You are an expert AI software developer. You are QwenCode Weaver's AI agent, inside a web-based code editor for a repository named "${repositoryName}". Your goal is to help the user with their requests by reading and writing files.

You operate in a loop. On each turn, you will be given the full chat history. You MUST respond with a JSON object that specifies your next action. **Do not add any text outside the JSON object.**

**You MUST choose one of the following actions:**

1.  **\`readFile\`**: Reads the content of a single file. Use this when you need to understand what's in a file before making changes.
    -   JSON format: \`{"action": "readFile", "path": "path/to/the/file.ext"}\`

2.  **\`writeFile\`**: Writes content to a file. Use this to apply changes, fix bugs, or create new files. This action overwrites the entire file content. You MUST read a file before you write to it.
    -   JSON format: \`{"action": "writeFile", "path": "path/to/the/file.ext", "content": "The new full content of the file..."}\`

3.  **\`naturalLanguageWriteFile\`**: Modifies an existing file based on a natural language instruction. Use this for complex changes where you need the AI to generate the full code for you. You MUST have read the file's content in a previous turn before using this tool.
    -   JSON format: \`{"action": "naturalLanguageWriteFile", "path": "path/to/the/file.ext", "prompt": "a detailed prompt describing the changes to make to the file"}\`

4.  **\`finish\`**: Ends the conversation and provides a final summary to the user. Use this action when you have completed all the necessary steps, or if the user's message is conversational (e.g., a greeting).
    -   JSON format: \`{"action": "finish", "message": "Your final response to the user."}\`
    -   Example for a greeting: \`{"action": "finish", "message": "Hello! How can I assist you with your code today?"}\`

**RULES:**
-   Your response MUST be a single, valid JSON object and nothing else.
-   If the user's message is a greeting or a general question not related to a file, respond with the "finish" action.
-   To modify a file, you must **read it first**, then use **writeFile** or **naturalLanguageWriteFile**.
-   **Only use file paths from the list below.** Do not make up file names or paths.
-   If an action results in an error (e.g., "File not found"), **DO NOT repeat the failed action.** Acknowledge the error, review the file list, and choose a different file or use the 'finish' action to ask the user for clarification.

Here is the list of available files in the repository:
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

    const response = await fetch(new URL('/api/ollama', process.env.NEXT_PUBLIC_APP_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ollamaUrl,
            path: '/api/generate', // Use the generate endpoint
            method: 'POST',
            body: {
                model: ollamaModel,
                // Combine system prompt and simplified messages into a single prompt string
                prompt: `${systemPrompt}\n\n**CONVERSATION HISTORY:**\n${simplifiedMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}\n\n**YOUR TURN (JSON only):**`,
                stream: false,
                format: 'json', // Ensure the output is JSON
                stop: ["\nuser:", "\nassistant:"]
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Ollama server responded with status ${response.status}: ${data.error || JSON.stringify(data)}`);
    }
    
    const rawResponseContent = data.response || '{}';
    let nextAgentAction;
    try {
        const jsonMatch = rawResponseContent.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            nextAgentAction = JSON.parse(jsonMatch[1]);
        } else {
            nextAgentAction = JSON.parse(rawResponseContent);
        }
    } catch (e) {
        console.error("Failed to parse AI response as JSON action:", rawResponseContent, e);
        throw new Error("The AI returned an invalid action format. Please try again.");
    }

    // Pass the action back to the client to be executed
    return { response: JSON.stringify(nextAgentAction) };

  } catch (error) {
    console.error("Error calling Ollama service:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get analysis from AI model: ${error.message}`);
    }
    throw new Error('An unknown error occurred while contacting the AI model.');
  }
}
