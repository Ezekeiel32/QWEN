import { NextResponse } from 'next/server';

interface ConnectionResult {
    status: 'success' | 'error';
    message: string;
    models?: string[];
}

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            return NextResponse.json({
                status: 'error',
                message: 'Invalid URL format. It must start with http:// or https://',
            } as ConnectionResult, { status: 400 });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

        try {
            // This request is made from the Next.js server, so CORS is not an issue.
            const finalUrl = url.endsWith('/') ? `${url}api/tags` : `${url}/api/tags`;
            
            const response = await fetch(finalUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    // This header helps bypass the ngrok browser warning page
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                const models = data.models.map((m: any) => m.name);
                return NextResponse.json({
                    status: 'success',
                    message: 'Successfully connected to Ollama server.',
                    models: models,
                } as ConnectionResult);
            } else {
                 const errorText = await response.text();
                // Return a 200 OK status but with an error payload for the client to parse
                return NextResponse.json({
                    status: 'error',
                    message: `Server responded with status ${response.status}. Message: ${errorText || response.statusText}.`,
                } as ConnectionResult);
            }
        } catch (error) {
            clearTimeout(timeoutId);
             if (error instanceof DOMException && error.name === 'AbortError') {
                 return NextResponse.json({
                    status: 'error',
                    message: 'Connection timed out after 10 seconds. Check if the server URL is correct, reachable, and not blocked by a firewall.',
                } as ConnectionResult);
            }
            return NextResponse.json({
                status: 'error',
                message: `An unknown error occurred on the server: ${error instanceof Error ? error.message : String(error)}`,
            } as ConnectionResult);
        }
    } catch (e) {
        return NextResponse.json({ status: 'error', message: 'Invalid request body.' } as ConnectionResult, { status: 400 });
    }
}
