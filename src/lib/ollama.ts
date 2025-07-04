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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const trimmedUrl = url.trim();
        const finalUrl = trimmedUrl.endsWith('/') ? `${trimmedUrl}api/tags` : `${trimmedUrl}/api/tags`;

        const response = await fetch(finalUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        clearTimeout(timeoutId);

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
            
            if(errorText.includes('ngrok-skip-browser-warning') || errorText.includes('ERR_NGROK_')) {
                message = "Connection blocked by ngrok. Please visit your ngrok URL in a new browser tab and click 'Visit Site' to authorize access, then try again."
            }
            return {
                status: 'error',
                message: message,
            };
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
            return {
                status: 'error',
                message: 'Connection timed out after 10 seconds. Check if the server URL is correct, reachable, and not blocked by a firewall.',
            };
        }
        return {
            status: 'error',
            message: `A network error occurred. This is often a CORS issue. For global access, ensure your server is configured to handle CORS requests correctly (e.g., via OLLAMA_ORIGINS='*' or an Nginx proxy). Error: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
