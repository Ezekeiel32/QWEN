
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
  return `You are an expert AI software developer. You are QwenCode Weaver's AI agent, inside a web-based code editor for a repository named "${repositoryName}". Your goal is to help the user with their requests by reading and writing files.\

You operate in a loop. On each turn, you will be given the full chat history. You must respond with a JSON object that specifies your next action.\

You have access to the following tools:\

1.  **readFile**: Reads the content of a single file. Use this when you need to understand what's in a file before making changes or to get the content for a natural language edit.\
    -   JSON format: \`{"action": "readFile", "path": "path/to/the/file.ext"}\`

2.  **writeFile**: Writes content to a file. Use this to apply changes, fix bugs, or create new files. This action overwrites the entire file content. You MUST read a file before you write to it using either readFile or naturalLanguageWriteFile.\
    -   JSON format: \`{"action": "writeFile", "path": "path/to/the/file.ext", "content": "The new full content of the file..."}\`

3.  **naturalLanguageWriteFile**: Reads the content of a file and applies a natural language instruction to modify its content using the AI model. Use this when the user provides instructions like "change the variable name" or "add a comment here". You should provide the file path and the natural language \`prompt\` for the modification. Optionally, you can include \`selectedContent\` if the user has selected a specific part of the file to modify. After this action completes, the modified content will be written back to the file.\
    -   JSON format: \`{"action": "naturalLanguageWriteFile", "path": "path/to/the/file.ext", "prompt": "Your natural language instruction for the modification.", "selectedContent": "Optional selected code content"}\`

4.  **finish**: Ends the conversation and provides a final summary to the user. Use this action when you have completed all the necessary steps.\
    -   JSON format: \`{"action": "finish", "message": "Your final response to the user."}\`

**RULES:**
-   When modifying a file based on a natural language instruction, use the \`naturalLanguageWriteFile\` action.\
-   The \`writeFile\` action should only be used when you have the exact, complete content to write to the file, typically after using \`naturalLanguageWriteFile\` or if the user explicitly provided the full content.\
-   **Always respond with a valid JSON object specifying a single action.** Do not add any text outside the JSON.\
-   Think step-by-step. To modify a file, you must **read it first**, then **write the changes**.\
-   When you have completed the user's request, use the **finish** action to respond.\
-   The user has provided a list of files as context. **Only use file paths from this list.** Do not make up file names or paths.\
-   If an action results in an error (e.g., "File not found"), **DO NOT repeat the failed action.** Acknowledge the error, review the file list, and choose a different file or use the 'finish' action to ask the user for clarification.\

Here is the list of available files in the repository:\
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

    // The AI agent always responds with an action, which might be in the last message
    const lastAiMessage = messages.findLast(msg => msg.role === 'ai');
    let potentialAction: any = null;
    if (lastAiMessage) {
        try {
            // Models might wrap JSON in backticks or other characters
            const jsonMatch = lastAiMessage.content.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                potentialAction = JSON.parse(jsonMatch[1]);
            } else {
                potentialAction = JSON.parse(lastAiMessage.content);
            }
        } catch (e) {
            console.warn("Could not parse last AI message as JSON action:", e);
            // If it's not a valid JSON action, it's probably just a conversational response.
            // We'll proceed to generate a new action.
        }
    }

    let nextAgentAction: any;

    if (potentialAction && potentialAction.action) {
        nextAgentAction = potentialAction; // Use the action parsed from the last AI message
    } else {
        // If no valid action was found in the last AI message, send a new request
        // to the model to generate the next action based on the conversation history.
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
                    // Setting stop sequences can help prevent the model from outputting extra text after the JSON
                    stop: ["\nuser:", "\nassistant:"]
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
           throw new Error(`Ollama server responded with status ${response.status}: ${data.error || JSON.stringify(data)}`);
        }
        
        // The generate endpoint with format: 'json' returns the response in the 'response' field
        const rawResponseContent = data.response || '{}';
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
    }

    // Now execute the action based on nextAgentAction
    if (nextAgentAction.action === 'readFile') {
        const normalizedPath = nextAgentAction.path.startsWith('./') ? nextAgentAction.path.substring(2) : nextAgentAction.path;
        const file = fileList.find(f => f === normalizedPath);
        if (!file) {
            return { response: JSON.stringify({ action: "finish", message: `Error: File \`${normalizedPath}\` not found in the repository.` }) };
        }
        // In a real application, you'd fetch the file content here.
        // For this mock, we assume the content is available if the path exists.
        // The prompt provides the file list, the actual content is handled by the UI.
        return { response: JSON.stringify(nextAgentAction) }; // Return the readFile action for the UI to process
    } else if (nextAgentAction.action === 'writeFile') {
        // This action needs to be handled by the UI (AppLayout.tsx or DebuggerPage.tsx)
        // The AI generates the action, and the client-side code executes the file write.
        return { response: JSON.stringify(nextAgentAction) };
    } else if (nextAgentAction.action === 'naturalLanguageWriteFile') {
        const { path, prompt, selectedContent } = nextAgentAction;
        // Fix: 'path' is already a string, no need for path.path
        const normalizedPath = path.startsWith('./') ? path.substring(2) : path;
        
        const fileToModify = fileList.find(f => f === normalizedPath);
        if (!fileToModify) {
             return { response: JSON.stringify({ action: "finish", message: `Error: Cannot perform naturalLanguageWriteFile: File \`${normalizedPath}\` not found.` }) };
        }

        // We need the *actual content* of the file to send to /api/generate for modification.
        // This currently isn't directly available here in runAiAgent from `fileList` which is just paths.
        // This logic needs to be executed client-side after a readFile, or we need a way to read files from here.
        // For the purpose of fixing the build errors and demonstrating the tool structure,
        // I will assume the content would be fetched if this were client-side.
        // However, since this is a server action, we need actual file content.

        // Simulating file content fetching for a server action.
        // In a full application, `updateFileContent` would likely be a client-side context function
        // and file content would be part of the `messages` or `input` from the client after a `readFile` action.
        // Since this is a server action, we'd need a server-side way to get file content.
        
        // For demonstration and error fixing, we will prompt the model to generate the modification
        // as if it had the content.
        const fileContentPrompt = selectedContent ? 
            `Given this selected code snippet from ${normalizedPath}:\n\`\`\`\n${selectedContent}\n\`\`\`\n\nApply the following instruction to it and return ONLY the modified code:\n${prompt}` :
            `Given the content of file ${normalizedPath}:\n\`\`\`\n(Assume file content is here - in a real scenario, this would be actual content)\n\`\`\`\n\nApply the following instruction to it and return ONLY the modified code:\n${prompt}`;
        
        // Return the action for the UI to handle, as file content is typically client-side managed
        return { response: JSON.stringify(nextAgentAction) }; 

    } else if (nextAgentAction.action === 'finish') {
        return { response: JSON.stringify(nextAgentAction) };
    } else {
        return { response: JSON.stringify({ action: "finish", message: "The AI returned an unknown action. Please try again or ask for clarification." }) };
    }
  } catch (error) {
    console.error("Error calling Ollama service:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get analysis from AI model: ${error.message}`);
    }
    throw new Error('An unknown error occurred while contacting the AI model.');
  }
}
