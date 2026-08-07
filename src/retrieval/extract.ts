import { extractJson } from '../audit/prompt'

export interface ExtractedEntities {
  people: { name: string; occupation?: string }[]
  locations: { county?: string; state?: string }[]
  yearStart?: number
  yearEnd?: number
}

const EXTRACTION_SYSTEM_PROMPT = `You extract structured entities from a historical genealogical record for use in a retrieval system.

Return ONLY a JSON object with exactly these fields:

{
  "people": [{ "name": "...", "occupation": "..." }],
  "locations": [{ "county": "...", "state": "..." }],
  "yearStart": 0,
  "yearEnd": 0
}

Rules:
- people: every named individual mentioned in the record, with occupation if stated (omit the field if not stated).
- locations: every county/state combination mentioned. Omit fields that aren't stated.
- yearStart / yearEnd: the earliest and latest years explicitly or approximately (e.g. "abt. 1780") referenced in the record. Omit both if no years are present.
- Do not invent people, places, or years that are not in the text.
Return ONLY valid JSON — no markdown, no code fences, no preamble.`

export async function extractEntities(recordText: string): Promise<ExtractedEntities> {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: recordText.trim() }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ??
        `Entity extraction failed: ${response.status}`,
    )
  }

  const data = (await response.json()) as { content: { type: string; text: string }[] }
  const rawText = data.content.find((b) => b.type === 'text')?.text ?? ''
  return JSON.parse(extractJson(rawText)) as ExtractedEntities
}
