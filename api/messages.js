// Vercel serverless version of server.js.
// Locked down so a public URL can't be used as a free general-purpose proxy
// for your Anthropic API key: the model is fixed, output tokens are capped,
// input size is capped, and each IP gets a small number of requests.

const MODEL = 'claude-sonnet-5'
const MAX_TOKENS_CAP = 4096
const MAX_INPUT_CHARS = 20000 // system prompt + user message combined
const RATE_LIMIT = 10 // requests per IP per window (each audit uses 2)
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

// Best effort: lives only as long as a warm function instance.
// Set a monthly spend limit in the Anthropic Console as the real backstop.
const hits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > RATE_LIMIT
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Server is missing ANTHROPIC_API_KEY' } })
  }

  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) {
    return res.status(429).json({
      error: { message: 'Demo limit reached. Please try again in an hour.' },
    })
  }

  const { system, messages, max_tokens } = req.body ?? {}

  const validMessages =
    Array.isArray(messages) &&
    messages.length === 1 &&
    messages[0]?.role === 'user' &&
    typeof messages[0]?.content === 'string'

  if (!validMessages || typeof system !== 'string') {
    return res.status(400).json({ error: { message: 'Invalid request' } })
  }

  if (system.length + messages[0].content.length > MAX_INPUT_CHARS) {
    return res.status(413).json({
      error: { message: 'Record is too long for the demo. Try a shorter excerpt.' },
    })
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      // Rebuild the body server-side instead of forwarding it as-is.
      body: JSON.stringify({
        model: MODEL,
        max_tokens: Math.min(Number(max_tokens) || 1024, MAX_TOKENS_CAP),
        thinking: { type: 'disabled' },
        system,
        messages: [{ role: 'user', content: messages[0].content }],
      }),
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch {
    return res.status(502).json({ error: { message: 'Failed to reach Anthropic API' } })
  }
}
