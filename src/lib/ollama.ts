interface ConnectionResult {
    status: 'success' | 'error';
    message: string;
    models?: string[];
}

export async function testOllamaConnection(url: string): Promise<ConnectionResult> {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        return {
            status: 'error',
            message: 'Invalid URL format. It must start with http:// or https://',
        };
    }

    try {
        const response = await fetch('/api/ollama', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ollamaUrl: url,
                path: '/api/tags',
                method: 'GET'
            })
        });

        const data = await response.json();

        if (response.ok) {
            const models = data.models.map((m: any) => m.name);
            return {
                status: 'success',
                message: 'Successfully connected to Ollama server.',
                models: models,
            };
        } else {
            // Use the detailed error message from our proxy if available
            let message = data.error || `Server responded with status ${response.status}.`;
            if(data.details) {
                // Check for common ngrok error messages in the details
                if (data.details.includes('ERR_NGROK_')) {
                    message = "Connection blocked by ngrok. Please visit your ngrok URL in a new browser tab and click 'Visit Site' to authorize access, then try again."
                } else if (response.status === 404) {
                    message = `Server responded with 404 Not Found. Please ensure your Ollama URL is correct and the server is running.`
                } else {
                    message += ` Details: ${data.details.substring(0, 100)}...`
                }
            }
            return {
                status: 'error',
                message: message,
            };
        }
    } catch (error) {
        console.error('Connection test error:', error);
        let message = `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
        if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
          message = "A network error occurred contacting the application's backend proxy. Please check the network connection and server status. Error: Failed to fetch"
        }
        return {
            status: 'error',
            message: message,
        };
    }
}
