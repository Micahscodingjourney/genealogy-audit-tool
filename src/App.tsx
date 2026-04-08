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

// Real historical record: Fossett family of Monticello (Thomas Jefferson's plantation)
// Based on documented records from Monticello, the Freedmen's Bureau, and 1870 census.
const SAMPLE_RECORD = `Fossett Family — Albemarle County, Virginia (compiled from multiple sources)

Joseph Fossett, b. abt. 1780, enslaved blacksmith at Monticello. Listed in Jefferson's 1826 will as one of five individuals to be freed. Wife: Edith Hern Fossett, b. abt. 1787, also enslaved at Monticello as a cook — trained in France under Jefferson's chef. Edith not freed under the will; fate following 1826 estate sale unclear from surviving records.

Children documented in Monticello Farm Book (partial):
  – Peter Fossett, b. 1815, sold at the 1827 estate auction to John R. Jones; later self-purchased freedom, date unknown.
  – Patsy Fossett, b. abt. 1812, sold 1827, no further record located.
  – Several additional children referenced in the Farm Book only as "Edith's children," no names given, birth years estimated 1808–1824.

1870 Federal Census, Cincinnati, Ohio: Joseph Fossett [head], mulatto, age 89 [sic — inconsistent with c.1780 birth], listed with a woman named "E. Fossett," age 60, relation not stated. Note: Edith Hern Fossett is recorded as deceased by multiple genealogical sources prior to 1854.

Peter Fossett appears in Cincinnati city directories 1850s–1870s as a caterer. Marriage record: Peter m. [given name not recorded] Vance, Cincinnati, abt. 1840. Children of Peter: at least four, names and birth years unconfirmed.

No death records located for Joseph or Edith Fossett in Virginia or Ohio. Burial site unknown.`

interface Category {
  key: keyof Omit<AuditResult, 'summary'>
  label: string
  description: string
  borderColor: string
  bgColor: string
  badgeColor: string
  textColor: string
  dotColor: string
}

const categories: Category[] = [
  {
    key: 'missingNames',
    label: 'Missing or Ambiguous Names',
    description: 'Unnamed individuals or unresolvable identities',
    borderColor: 'border-gold-400',
    bgColor: 'bg-gold-50',
    badgeColor: 'bg-gold-100 text-gold-700',
    textColor: 'text-gold-800',
    dotColor: 'bg-gold-400',
  },
  {
    key: 'dateGaps',
    label: 'Date Gaps & Uncertainties',
    description: 'Missing, approximate, or conflicting dates',
    borderColor: 'border-olive-400',
    bgColor: 'bg-olive-50',
    badgeColor: 'bg-olive-100 text-olive-700',
    textColor: 'text-olive-800',
    dotColor: 'bg-olive-400',
  },
  {
    key: 'lineageGaps',
    label: 'Lineage Gaps',
    description: 'Breaks or unverified links in the family line',
    borderColor: 'border-olive-300',
    bgColor: 'bg-olive-50/60',
    badgeColor: 'bg-olive-100 text-olive-600',
    textColor: 'text-olive-700',
    dotColor: 'bg-olive-300',
  },
  {
    key: 'incompleteOrContradictory',
    label: 'Incomplete or Contradictory Records',
    description: 'Facts that conflict or cannot be reconciled',
    borderColor: 'border-gold-600',
    bgColor: 'bg-gold-50/70',
    badgeColor: 'bg-gold-200 text-gold-800',
    textColor: 'text-gold-900',
    dotColor: 'bg-gold-500',
  },
]

const steps = [
  {
    number: '1',
    heading: 'Paste your record',
    body: 'Census entries, church registers, family Bible transcriptions, vital records, plantation records, or any narrative family history text.',
  },
  {
    number: '2',
    heading: 'Click Audit Record',
    body: 'Claude reads the full text and flags gaps, ambiguities, and inconsistencies across four structured categories.',
  },
  {
    number: '3',
    heading: 'Review the findings',
    body: 'Each finding is a specific, cited observation. Cross-reference against primary sources before drawing conclusions.',
  },
]

const dos = [
  'Historical census or vital records',
  'Transcribed church or estate documents',
  'Published family history excerpts',
  'Freedmen\'s Bureau or plantation records',
  'Compiled genealogical narratives',
]

const donts = [
  'Living individuals\' personal data',
  'Documents with Social Security numbers',
  'Medical or financial records',
  'Private correspondence not your own',
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

      const data = (await response.json()) as {
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

  const totalFindings = result
    ? categories.reduce((sum, c) => sum + result[c.key].length, 0)
    : 0

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-olive-700 via-gold-500 to-olive-400" />

      {/* Header */}
      <header className="bg-white border-b border-olive-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-7">
          <div className="flex items-center gap-3 mb-1">
            <LeafIcon />
            <span className="text-xs font-semibold tracking-widest uppercase text-olive-500">
              Research Tool
            </span>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-olive-900 tracking-tight">
            Genealogy Record Auditor
          </h1>
          <p className="mt-1.5 text-sm text-olive-500 max-w-xl leading-relaxed">
            AI-assisted analysis of historical genealogical documents — surfaces gaps,
            ambiguities, and inconsistencies for further research.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-8">

        {/* ── Input row: steps left, textarea right ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

          {/* Left: How-to panel */}
          <div className="space-y-5">

            {/* Steps */}
            <div className="bg-white rounded-2xl border border-olive-100 shadow-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-olive-400 mb-4">
                How it works
              </p>
              <ol className="space-y-4">
                {steps.map((s) => (
                  <li key={s.number} className="flex gap-3">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-olive-100 text-olive-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      {s.number}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-olive-800">{s.heading}</p>
                      <p className="text-xs text-olive-500 mt-0.5 leading-relaxed">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Do's */}
            <div className="bg-white rounded-2xl border border-olive-100 shadow-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-olive-400 mb-3">
                Works well with
              </p>
              <ul className="space-y-2">
                {dos.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-xs text-olive-700">
                    <span className="mt-0.5 text-olive-400">✓</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Don'ts */}
            <div className="bg-white rounded-2xl border border-gold-200 shadow-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gold-600 mb-3">
                Avoid pasting
              </p>
              <ul className="space-y-2">
                {donts.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-xs text-olive-600">
                    <span className="mt-0.5 text-gold-500">✕</span>
                    {d}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-olive-400 border-t border-gold-100 pt-3 leading-relaxed">
                This tool is for historical records only. Do not submit data about living people.
              </p>
            </div>

            {/* Sample record button */}
            <button
              onClick={() => setInputText(SAMPLE_RECORD)}
              className="w-full rounded-xl border border-olive-200 bg-olive-50 hover:bg-olive-100 text-olive-700 text-xs font-semibold px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
            >
              <ScrollIcon />
              Load a real historical record
            </button>
          </div>

          {/* Right: Textarea + button */}
          <div className="bg-white rounded-2xl shadow-card border border-olive-100 overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <label
                htmlFor="record-input"
                className="block text-xs font-semibold uppercase tracking-widest text-olive-400 mb-3"
              >
                Historical Record
              </label>
              <textarea
                id="record-input"
                rows={14}
                className="w-full rounded-xl border border-olive-200 bg-parchment px-4 py-3.5 text-sm text-olive-900 placeholder-olive-300 resize-y focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition scrollbar-thin leading-relaxed"
                placeholder={`Paste a census record, family Bible entry, vital record, or any historical genealogical text here…\n\nOr click "Load a real historical record" on the left to try a documented example.`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="px-6 py-4 flex items-center justify-between border-t border-olive-50 bg-olive-50/40">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAudit}
                  disabled={isLoading || !inputText.trim() || !apiKey}
                  className="inline-flex items-center gap-2 rounded-lg bg-olive-700 hover:bg-olive-600 active:bg-olive-800 text-white text-sm font-semibold px-5 py-2.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      Auditing…
                    </>
                  ) : (
                    <>
                      <AuditIcon />
                      Audit Record
                    </>
                  )}
                </button>
                {result && (
                  <button
                    onClick={() => { setResult(null); setError(null) }}
                    className="text-sm text-olive-400 hover:text-olive-700 underline underline-offset-2 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {inputText.trim() && (
                <span className="text-xs text-olive-400">
                  {inputText.trim().split(/\s+/).length} words
                </span>
              )}
            </div>

            {!apiKey && (
              <div className="px-6 py-3 bg-gold-50 border-t border-gold-100 text-xs text-gold-800">
                No API key detected — add{' '}
                <code className="bg-gold-100 px-1 py-0.5 rounded font-mono">VITE_ANTHROPIC_API_KEY</code>{' '}
                to your <code className="bg-gold-100 px-1 py-0.5 rounded font-mono">.env</code> and restart.
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex gap-3 items-start">
            <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
            <div>
              <p className="font-semibold mb-0.5">Analysis failed</p>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <section className="space-y-5">

            {/* Summary bar */}
            <div className="bg-white rounded-2xl shadow-card border border-olive-100 px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-olive-400">
                  Summary
                </p>
                <span className="text-xs font-semibold rounded-full bg-olive-100 text-olive-700 px-3 py-1">
                  {totalFindings} finding{totalFindings !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-olive-800 leading-relaxed">{result.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const count = result[c.key].length
                  if (count === 0) return null
                  return (
                    <span
                      key={c.key}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.badgeColor}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dotColor}`} />
                      {c.label.split(' ')[0]} · {count}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Category cards */}
            {totalFindings === 0 ? (
              <div className="bg-white rounded-2xl shadow-card border border-olive-100 px-6 py-8 text-center">
                <p className="text-olive-400 text-sm">No significant issues detected in this record.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const items = result[cat.key]
                  if (items.length === 0) return null
                  return (
                    <div
                      key={cat.key}
                      className={`bg-white rounded-2xl shadow-card border border-olive-100 border-l-4 ${cat.borderColor} overflow-hidden`}
                    >
                      <div className={`px-5 py-4 ${cat.bgColor} border-b border-olive-100/60`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className={`text-sm font-semibold ${cat.textColor}`}>{cat.label}</h2>
                            <p className="text-xs text-olive-400 mt-0.5">{cat.description}</p>
                          </div>
                          <span className={`shrink-0 text-xs font-bold rounded-full px-2 py-0.5 ${cat.badgeColor}`}>
                            {items.length}
                          </span>
                        </div>
                      </div>
                      <ul className="divide-y divide-olive-50">
                        {items.map((item, i) => (
                          <li key={i} className="px-5 py-3 flex gap-3 items-start">
                            <span className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${cat.dotColor}`} />
                            <span className="text-sm text-olive-700 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-olive-100 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-olive-400">Powered by Claude</span>
          <span className="text-xs text-olive-300">
            Analysis is advisory — verify all findings against primary sources
          </span>
        </div>
      </footer>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg className="h-4 w-4 text-olive-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5c0 0-7-3.5-7-10A7 7 0 0119 8.5c0 6.5-7 10-7 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5V22" />
    </svg>
  )
}

function AuditIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function ScrollIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
