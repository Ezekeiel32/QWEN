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
        const finalUrl = `${url.replace(/\/$/, '')}/api/tags`;
        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
        });

        if (response.ok) {
            const data = await response.json();
            const models = data.models.map((m: any) => m.name);
            return {
                status: 'success',
                message: 'Successfully connected to Ollama server.',
                models: models,
            };
        } else {
            const errorText = await response.text();
            let message = `Server responded with status ${response.status}. Message: ${errorText || response.statusText}.`;
             if (response.status === 404) {
                 message = `Server responded with 404 Not Found. Please ensure your Ollama URL is correct and the server is running.`
             } else if (errorText.includes('ngrok-skip-browser-warning') || errorText.includes('ERR_NGROK_')) {
                message = "Connection blocked by ngrok. Please visit your ngrok URL in a new browser tab and click 'Visit Site' to authorize access, then try again."
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
          message = "A network error occurred. This is often a CORS issue. For global access, ensure your server is configured to handle CORS requests correctly (e.g., via OLLAMA_ORIGINS='*' or an Nginx proxy). Error: Failed to fetch"
        }
        return {
            status: 'error',
            message: message,
        };
    }
}
