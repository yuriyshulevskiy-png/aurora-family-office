/**
 * Chunk Processor — обробляє великі документи частинами (map-reduce).
 * 1. Розбиває текст на чанки
 * 2. Витягує ключову інвестиційну інформацію з кожного чанка (map)
 * 3. Об'єднує все в один стислий документ (reduce)
 */

const CHUNK_SIZE = 50000; // ~12K tokens per chunk — safe for rate limit
const PAUSE_BETWEEN_CHUNKS = 5000; // 5s pause to respect rate limits

const EXTRACT_PROMPT = `Ти — фінансовий аналітик. З наданого фрагменту документа витягни ТІЛЬКИ інвестиційно-релевантну інформацію.

Ігноруй: юридичні застереження, зміст, нумерацію сторінок, рекламу, біографії авторів.
Зберігай: тези про активи, прогнози, ціни, рівні, ризики, макросигнали, рекомендації аналітиків.

Відповідай СТИСЛИМ текстом українською (максимум 2000 символів). Якщо фрагмент не містить інвестиційної інформації — відповідай "ПОРОЖНЬО".`;

/**
 * Split text into chunks respecting paragraph boundaries
 */
function splitIntoChunks(text, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at paragraph boundary
    if (end < text.length) {
      const lastParagraph = text.lastIndexOf('\n\n', end);
      if (lastParagraph > start + chunkSize * 0.5) {
        end = lastParagraph + 2;
      }
    }

    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}

/**
 * Extract key info from one chunk
 */
async function extractFromChunk(chunk, chunkIndex, totalChunks, apiKey) {
  const model = import.meta.env.VITE_CLAUDE_MODEL_FAST || 'claude-sonnet-4-20250514';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: EXTRACT_PROMPT,
      messages: [{
        role: 'user',
        content: `Фрагмент ${chunkIndex + 1} з ${totalChunks}:\n\n${chunk}`,
      }],
    }),
  });

  if (response.status === 429) {
    // Rate limit — wait and retry
    await new Promise((r) => setTimeout(r, 60000));
    return extractFromChunk(chunk, chunkIndex, totalChunks, apiKey);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API помилка: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

/**
 * Process a large document: split → extract → combine
 * Returns condensed text ready for full analysis
 */
export async function processLargeDocument(fullText, onProgress) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('API ключ не встановлено');

  // If text is small enough, return as-is
  if (fullText.length <= CHUNK_SIZE) {
    return fullText;
  }

  const chunks = splitIntoChunks(fullText);
  onProgress?.(`Документ розбито на ${chunks.length} частин. Обробляю...`);

  const extractions = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(`Обробляю частину ${i + 1} з ${chunks.length}...`);

    const extracted = await extractFromChunk(chunks[i], i, chunks.length, apiKey);

    if (extracted && !extracted.includes('ПОРОЖНЬО')) {
      extractions.push(extracted);
    }

    // Pause between chunks to respect rate limits
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_CHUNKS));
    }
  }

  const condensed = extractions.join('\n\n---\n\n');

  onProgress?.(`Стиснено: ${fullText.length.toLocaleString()} → ${condensed.length.toLocaleString()} символів (${Math.round((1 - condensed.length / fullText.length) * 100)}% стиснення)`);

  return condensed;
}
