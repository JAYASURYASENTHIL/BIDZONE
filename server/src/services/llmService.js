/**
 * Production-ready Multi-Provider LLM Service
 *
 * Priority Chain:
 * 1. Google Gemini (gemini-3.1-flash-lite / gemini-flash-latest via GEMINI_API_KEY)
 * 2. OpenAI GPT-4o-mini / GPT-3.5 (via OPENAI_API_KEY)
 * 3. Groq Llama 3.3 (via GROQ_API_KEY)
 * 4. Free Zero-Key Public Fallback (Pollinations AI)
 */

export async function callLLM({ systemPrompt, userMessage }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // 1. Google Gemini
  if (geminiKey) {
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nStudent Query: ${userMessage}` }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600,
          },
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (err) {
        console.warn(`Gemini model ${model} error:`, err.message);
      }
    }
  }

  // 2. OpenAI
  if (openaiKey) {
    try {
      const endpoint = 'https://api.openai.com/v1/chat/completions';
      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 600,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (err) {
      console.warn('OpenAI error, trying next provider:', err.message);
    }
  }

  // 3. Groq (Llama 3.3)
  if (groqKey) {
    try {
      const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      const payload = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 600,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (err) {
      console.warn('Groq error, trying next provider:', err.message);
    }
  }

  // 4. Free Zero-Key Public LLM Endpoint (Pollinations AI)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const payload = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      model: 'openai',
      seed: 42,
    };

    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 5) {
        return text.trim();
      }
    }
  } catch (err) {
    console.warn('Public LLM error or timeout:', err.message);
  }

  return null;
}
