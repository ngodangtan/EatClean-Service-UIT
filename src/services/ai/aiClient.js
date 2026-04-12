const LM_STUDIO_TIMEOUT = 30000; // 30 seconds
const MAX_RESPONSE_SIZE = 50 * 1024; // 50KB guard

const SYSTEM_MESSAGE = 'You are a JSON-only meal content generator. Output only valid JSON. Never include numeric nutrition values such as calories, protein, carbs, fat, or macros.';

/**
 * Call LM Studio chat completions API.
 * Returns raw text content from the AI response.
 */
export async function callLMStudio(prompt) {
  const lmStudioUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1/chat/completions';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LM_STUDIO_TIMEOUT);

  try {
    const response = await fetch(lmStudioUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.LM_STUDIO_MODEL || 'local-model',
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`LM Studio error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    if (Buffer.byteLength(content, 'utf8') > MAX_RESPONSE_SIZE) {
      throw new Error(`AI response exceeds size limit (${Buffer.byteLength(content, 'utf8')} bytes > ${MAX_RESPONSE_SIZE})`);
    }

    return content;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`LM Studio request timed out after ${LM_STUDIO_TIMEOUT}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract a balanced JSON object from text using brace counting.
 * Returns the substring from the first '{' to its matching '}'.
 */
function extractBalancedJSON(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null; // unbalanced
}

/**
 * Strip markdown fences and extract JSON from AI text response.
 */
export function parseAIResponse(aiResponse) {
  let jsonText = aiResponse.trim();

  // Remove markdown code block markers if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  jsonText = jsonText.trim();

  // Extract balanced JSON object if surrounded by extra text
  if (!jsonText.startsWith('{')) {
    const extracted = extractBalancedJSON(jsonText);
    if (!extracted) {
      throw new Error('No JSON found in response');
    }
    jsonText = extracted;
  }

  return JSON.parse(jsonText);
}
