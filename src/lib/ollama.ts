interface ConnectionResult {
    status: 'success' | 'error';
    message: string;
    models?: string[];
}

export async function testOllamaConnection(url: string): Promise<ConnectionResult> {
    if (!url) {
         return { status: 'error', message: 'URL cannot be empty.' };
    }
    try {
        const response = await fetch('/api/ollama/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return {
                status: 'error',
                message: `Failed to test connection. The application's proxy API responded with status ${response.status}: ${errorBody}`
            }
        }

        const result: ConnectionResult = await response.json();
        return result;

    } catch (error) {
        console.error("Error testing Ollama connection via proxy:", error);
        return {
            status: 'error',
            message: `A client-side error occurred while trying to test the connection: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
