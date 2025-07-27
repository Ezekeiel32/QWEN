// Multi-provider open/free LLM fallback utility for Quantum Weaver
// Tries Groq, OpenRouter, TogetherAI, HuggingFace, Replicate, Mistral, Perplexity, Ollama, LM Studio, and localhost endpoints in order
// Only uses open/free models and endpoints
// Add your API keys and local endpoints as needed

import fetch from 'node-fetch';

export async function callAnyOpenLlm(prompt: string): Promise<string> {
  // 1. Groq (Mixtral, Llama-3, Gemma, free for now)
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });
    if (groqRes.ok) {
      const data = await groqRes.json() as any;
      return data.choices[0].message.content;
    }
  } catch (e) { /* continue */ }

  // 2. OpenRouter (free models only)
  try {
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mixtral-8x7b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });
    if (openRouterRes.ok) {
      const data = await openRouterRes.json() as any;
      return data.choices[0].message.content;
    }
  } catch (e) { /* continue */ }

  // 3. TogetherAI (free models only)
  try {
    const togetherRes = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });
    if (togetherRes.ok) {
      const data = await togetherRes.json() as any;
      return data.choices[0].message.content;
    }
  } catch (e) { /* continue */ }

  // 4. HuggingFace Inference API (open models, free tier)
  try {
    const hfRes = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });
    if (hfRes.ok) {
      const data = await hfRes.json() as any;
      if (data && data[0] && data[0].generated_text) return data[0].generated_text;
    }
  } catch (e) { /* continue */ }

  // 5. Replicate (open models, free credits)
  try {
    const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: process.env.REPLICATE_MODEL_VERSION || 'YOUR_MODEL_VERSION',
        input: { prompt },
      }),
    });
    if (replicateRes.ok) {
      const data = await replicateRes.json() as any;
      if (data && data.output) return data.output;
    }
  } catch (e) { /* continue */ }

  // 6. Mistral API (open models, free tier)
  try {
    const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-medium',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });
    if (mistralRes.ok) {
      const data = await mistralRes.json() as any;
      return data.choices[0].message.content;
    }
  } catch (e) { /* continue */ }

  // 7. Perplexity Labs (free endpoints)
  try {
    const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-7b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });
    if (perplexityRes.ok) {
      const data = await perplexityRes.json() as any;
      return data.choices[0].message.content;
    }
  } catch (e) { /* continue */ }

  // 8. Ollama (local, if running)
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'llama2', prompt }),
    });
    if (ollamaRes.ok) {
      const data = await ollamaRes.json() as any;
      if (data && data.response) return data.response;
    }
  } catch (e) { /* continue */ }

  // 9. LM Studio (local, if running)
  try {
    const lmstudioRes = await fetch('http://localhost:1234/v1/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_tokens: 1024 }),
    });
    if (lmstudioRes.ok) {
      const data = await lmstudioRes.json() as any;
      if (data && data.choices && data.choices[0]) return data.choices[0].text;
    }
  } catch (e) { /* continue */ }

  // 10. Your own localhost endpoint (if set up)
  try {
    const localRes = await fetch('http://localhost:5000/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (localRes.ok) {
      const data = await localRes.json() as any;
      if (data && data.response) return data.response;
    }
  } catch (e) { /* continue */ }

  throw new Error('All open/free LLM APIs failed.');
} 