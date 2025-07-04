'use server';

import {NextRequest, NextResponse} from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { ollamaUrl, path, method, body } = await req.json();

    if (!ollamaUrl || !path || !method) {
      return NextResponse.json({ error: 'Missing required parameters: ollamaUrl, path, method' }, { status: 400 });
    }

    const finalUrl = `${ollamaUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    
    const response = await fetch(finalUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      ...(body && method !== 'GET' && method !== 'HEAD' && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        return new Response(errorText, { status: response.status, statusText: response.statusText });
    }

    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('application/x-ndjson') || contentType.includes('application/jsonstream'))) {
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    }

    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });

  } catch (error) {
    console.error('Ollama proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to connect to Ollama server through proxy', details: errorMessage }, { status: 500 });
  }
}
