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
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    try {
        // Ensure the URL doesn't have a trailing slash before adding the API path
        const finalUrl = url.endsWith('/') ? `${url}api/tags` : `${url}/api/tags`;
        
        const headers = new Headers();
        // This header is a non-standard but often useful hint for services like ngrok
        headers.append('ngrok-skip-browser-warning', 'true');

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: headers,
            signal: controller.signal,
            mode: 'cors', // Explicitly set mode to cors
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
            return {
                status: 'error',
                message: `Server responded with status ${response.status}. Message: ${errorText || response.statusText}.`,
            };
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof TypeError && error.message.includes('fetch')) {
             return {
                status: 'error',
                message: `A network error occurred. This is often a CORS issue. For global access via ngrok, ensure you started Ollama with OLLAMA_ORIGINS='*' and have authorized the ngrok URL in your browser first by visiting it directly.`,
            };
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
             return {
                status: 'error',
                message: 'Connection timed out after 10 seconds. Check if the server URL is correct, reachable, and not blocked by a firewall.',
            };
        }
        return {
            status: 'error',
            message: `An unknown error occurred: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
