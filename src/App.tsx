import { useState } from 'react'

interface AuditResult {
  missingNames: string[]
  dateGaps: string[]
  lineageGaps: string[]
  incompleteOrContradictory: string[]
  summary: string
}

const SYSTEM_PROMPT = `You are an expert genealogical record analyst with deep knowledge of historical records, census documents, vital records, and family histories.

When given a genealogical text snippet, analyze it carefully and return a JSON object with exactly these fields:

{
  "missingNames": [...],
  "dateGaps": [...],
  "lineageGaps": [...],
  "incompleteOrContradictory": [...],
  "summary": "..."
}

Field definitions:
- missingNames: Individuals who are unnamed, referred to only by relationship ("wife," "son"), given an ambiguous identifier, or whose identity cannot be confirmed from the record alone.
- dateGaps: Dates that are missing, approximate (circa, abt., ~), given as ranges, internally inconsistent, or biologically implausible.
- lineageGaps: Missing generational links, unverified parent-child relationships, orphaned individuals with no family context, or breaks in the documented lineage.
- incompleteOrContradictory: Facts that conflict with other facts in the record, entries that seem incomplete, or details that are internally contradictory.
- summary: A 1–2 sentence overall assessment of the record's completeness and reliability.

Each array entry should be a concise, specific finding (1–2 sentences max). If a category has no issues, return an empty array.
Return ONLY valid JSON — no markdown, no code fences, no preamble.`

const PLACEHOLDER = `Example: "William H. Tanner, b. abt. 1847 in Virginia, appears in the 1880 census with wife [name illegible] and three children: Mary (12), James (9), and an infant not yet named. His father is listed elsewhere as John Tanner (1810–?), but no marriage record connects them. William's own marriage date is unknown. A death record from 1901 lists a 'W. Tanner' of similar age in the same county, though the cause and full name differ slightly."`

const categories: {
  key: keyof Omit<AuditResult, 'summary'>
  label: string
  accent: string
  icon: string
}[] = [
  {
    key: 'missingNames',
    label: 'Missing or Ambiguous Names',
    accent: 'border-amber-400 bg-amber-50',
    icon: '👤',
  },
  {
    key: 'dateGaps',
    label: 'Date Gaps & Uncertainties',
    accent: 'border-sky-400 bg-sky-50',
    icon: '📅',
  },
  {
    key: 'lineageGaps',
    label: 'Lineage Gaps',
    accent: 'border-violet-400 bg-violet-50',
    icon: '🌿',
  },
  {
    key: 'incompleteOrContradictory',
    label: 'Incomplete or Contradictory Records',
    accent: 'border-rose-400 bg-rose-50',
    icon: '⚠️',
  },
]

function extractJson(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? match[0] : raw
}

export default function App() {
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

  async function handleAudit() {
    if (!inputText.trim()) return

    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey ?? '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: inputText.trim() }],
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ??
            `Request failed: ${response.status}`,
        )
      }

      const data = await response.json() as {
        content: { type: string; text: string }[]
      }
      const rawText = data.content.find((b) => b.type === 'text')?.text ?? ''
      const parsed: AuditResult = JSON.parse(extractJson(rawText))
      setResult(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const hasFindings =
    result &&
    categories.some((c) => result[c.key].length > 0)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-serif font-semibold text-stone-800 tracking-tight">
            Genealogy Record Auditor
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Paste a historical genealogical text to identify gaps, ambiguities, and inconsistencies.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Input section */}
        <section className="space-y-3">
          <label
            htmlFor="record-input"
            className="block text-sm font-medium text-stone-700"
          >
            Historical Record
          </label>
          <textarea
            id="record-input"
            rows={10}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-400 shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition"
            placeholder={PLACEHOLDER}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex items-center gap-4">
            <button
              onClick={handleAudit}
              disabled={isLoading || !inputText.trim() || !apiKey}
              className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-stone-700 active:bg-stone-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  Auditing…
                </>
              ) : (
                'Audit Record'
              )}
            </button>
            {result && (
              <button
                onClick={() => { setResult(null); setError(null) }}
                className="text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
              >
                Clear results
              </button>
            )}
          </div>
          {!apiKey && (
            <p className="text-xs text-rose-600">
              No API key found. Add <code className="bg-rose-50 px-1 rounded">VITE_ANTHROPIC_API_KEY</code> to your <code className="bg-rose-50 px-1 rounded">.env</code> file and restart the dev server.
            </p>
          )}
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <section className="space-y-6">
            {/* Summary */}
            <div className="rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
                Summary
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">{result.summary}</p>
            </div>

            {/* Category cards */}
            {!hasFindings ? (
              <div className="rounded-lg border border-stone-200 bg-white px-5 py-4 text-sm text-stone-500 shadow-sm">
                No significant issues detected in this record.
              </div>
            ) : (
              <div className="grid gap-4">
                {categories.map(({ key, label, accent, icon }) => {
                  const items = result[key]
                  if (items.length === 0) return null
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border-l-4 bg-white shadow-sm ${accent}`}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span aria-hidden>{icon}</span>
                          <h2 className="text-sm font-semibold text-stone-700">{label}</h2>
                          <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                            {items.length}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {items.map((item, i) => (
                            <li key={i} className="flex gap-2 text-sm text-stone-600">
                              <span className="mt-0.5 shrink-0 text-stone-300">—</span>
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-stone-200 mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-4 text-xs text-stone-400">
          Powered by Claude · Analysis is advisory — verify all findings against primary sources.
        </div>
      </footer>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
