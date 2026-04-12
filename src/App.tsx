import { useState } from 'react'

interface ResearchStep {
  action: string
  resource: string
  priority: 'high' | 'medium' | 'low'
}

interface AuditResult {
  missingNames: string[]
  dateGaps: string[]
  lineageGaps: string[]
  incompleteOrContradictory: string[]
  summary: string
  researchSteps: ResearchStep[]
}

const SYSTEM_PROMPT = `You are an expert genealogical record analyst with deep knowledge of historical records, census documents, vital records, and family histories — including African American genealogy, Freedmen's Bureau records, and plantation records.

The user will provide two things:
1. RESEARCHER CONTEXT — who they are, their known relatives, what they are trying to find, and any names or locations they already know. Use this to make the research roadmap highly personal and specific to their situation.
2. HISTORICAL RECORD — the primary source text to analyze.

If researcher context is provided, the researchSteps must:
- Reference the researcher's own name and known relatives by name where relevant
- Suggest searches that start from their known living relatives and work backward
- Prioritize record types most likely to bridge the gap between the known living family and the historical record
- Name specific counties, states, or cities from the context when suggesting where to search

Analyze the historical record and return ONLY a JSON object with exactly these fields:

{
  "missingNames": [...],
  "dateGaps": [...],
  "lineageGaps": [...],
  "incompleteOrContradictory": [...],
  "summary": "...",
  "researchSteps": [
    { "action": "...", "resource": "...", "priority": "high" | "medium" | "low" }
  ]
}

Field definitions:
- missingNames: Individuals unnamed, referred to only by relationship ("wife," "son"), or whose identity cannot be confirmed.
- dateGaps: Missing, approximate (circa, abt., ~), inconsistent, or biologically implausible dates.
- lineageGaps: Missing generational links, unverified parent-child relationships, or breaks in the documented lineage.
- incompleteOrContradictory: Facts that conflict with other facts, incomplete entries, or internal contradictions.
- summary: 1–2 sentence overall assessment of the record's completeness and reliability.
- researchSteps: Up to 6 specific, actionable next steps. Each step:
    - action: exactly what to do — name the record type, time period, location, and relevant personal names
    - resource: best place to find it (FamilySearch.org, Ancestry.com, NARA, Freedmen's Bureau Records on FamilySearch, Monticello Getting Word Project, state vital records office, etc.)
    - priority: "high" if it directly resolves a named person or date; "medium" for corroborating evidence; "low" for contextual background
Return ONLY valid JSON — no markdown, no code fences, no preamble.`

const SAMPLE_RECORD = `Fossett Family — Albemarle County, Virginia (compiled from multiple sources)

Joseph Fossett, b. abt. 1780, enslaved blacksmith at Monticello. Listed in Jefferson's 1826 will as one of five individuals to be freed. Wife: Edith Hern Fossett, b. abt. 1787, also enslaved at Monticello as a cook — trained in France under Jefferson's chef. Edith not freed under the will; fate following 1826 estate sale unclear from surviving records.

Children documented in Monticello Farm Book (partial):
  – Peter Fossett, b. 1815, sold at the 1827 estate auction to John R. Jones; later self-purchased freedom, date unknown.
  – Patsy Fossett, b. abt. 1812, sold 1827, no further record located.
  – Several additional children referenced in the Farm Book only as "Edith's children," no names given, birth years estimated 1808–1824.

1870 Federal Census, Cincinnati, Ohio: Joseph Fossett [head], mulatto, age 89 [sic — inconsistent with c.1780 birth], listed with a woman named "E. Fossett," age 60, relation not stated. Note: Edith Hern Fossett is recorded as deceased by multiple genealogical sources prior to 1854.

Peter Fossett appears in Cincinnati city directories 1850s–1870s as a caterer. Marriage record: Peter m. [given name not recorded] Vance, Cincinnati, abt. 1840. Children of Peter: at least four, names and birth years unconfirmed.

No death records located for Joseph or Edith Fossett in Virginia or Ohio. Burial site unknown.`

const SAMPLE_CONTEXT = `My name is Micah Fossett. My father is Damirez Fossett. I believe we are descendants of the Fossett family of Monticello, Albemarle County, Virginia — specifically Joseph and Edith Hern Fossett, who were enslaved there in the early 1800s. I am trying to trace the line from Damirez back through the generations to confirm this connection and fill in the missing links between our family today and the historical record.`

interface Category {
  key: keyof Omit<AuditResult, 'summary' | 'researchSteps'>
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
    borderColor: 'border-navy-400',
    bgColor: 'bg-navy-50',
    badgeColor: 'bg-navy-100 text-navy-700',
    textColor: 'text-navy-800',
    dotColor: 'bg-navy-400',
  },
  {
    key: 'lineageGaps',
    label: 'Lineage Gaps',
    description: 'Breaks or unverified links in the family line',
    borderColor: 'border-navy-300',
    bgColor: 'bg-navy-50/60',
    badgeColor: 'bg-navy-100 text-navy-600',
    textColor: 'text-navy-700',
    dotColor: 'bg-navy-300',
  },
  {
    key: 'incompleteOrContradictory',
    label: 'Incomplete or Contradictory Records',
    description: 'Facts that conflict or cannot be reconciled',
    borderColor: 'border-gold-500',
    bgColor: 'bg-gold-50/70',
    badgeColor: 'bg-gold-200 text-gold-800',
    textColor: 'text-gold-900',
    dotColor: 'bg-gold-500',
  },
]

const steps = [
  {
    number: 'I',
    heading: 'Describe your connection',
    body: 'In the gold field, write who you are, your known relatives, and what you\'re trying to find. The more specific, the more targeted the roadmap.',
  },
  {
    number: 'II',
    heading: 'Paste the historical record',
    body: 'Add the primary source text — census entry, church register, family narrative, plantation record, etc.',
  },
  {
    number: 'III',
    heading: 'Get a personal roadmap',
    body: 'Claude audits the record and generates next steps specific to your name, family, and the gaps in the document.',
  },
]

const dos = [
  'Historical census or vital records',
  'Transcribed church or estate documents',
  'Freedmen\'s Bureau or plantation records',
  'Published family history excerpts',
  'Compiled genealogical narratives',
]

const donts = [
  'Living individuals\' private data',
  'Documents with Social Security numbers',
  'Medical or financial records',
  'Private correspondence not your own',
]

const priorityStyles = {
  high:   { badge: 'bg-navy-700 text-white',    label: 'High' },
  medium: { badge: 'bg-gold-100 text-gold-800', label: 'Medium' },
  low:    { badge: 'bg-navy-100 text-navy-600', label: 'Low' },
}

function extractJson(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? match[0] : raw
}

function buildUserMessage(context: string, record: string): string {
  if (context.trim()) {
    return `[RESEARCHER CONTEXT]\n${context.trim()}\n\n[HISTORICAL RECORD TO ANALYZE]\n${record.trim()}`
  }
  return record.trim()
}

export default function App() {
  const [researcherContext, setResearcherContext] = useState('')
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAudit() {
    if (!inputText.trim()) return
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserMessage(researcherContext, inputText) }],
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

      {/* ── Multi-line classical top band ── */}
      <div className="h-1 bg-gold-500" />
      <div className="h-px bg-gold-300" />
      <div className="h-0.5 bg-navy-800" />

      {/* ── Header ── */}
      <header className="bg-white border-b border-navy-100 relative overflow-hidden">
        {/* Faint arch watermark behind content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.025]">
          <ArchWatermark />
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8 relative">
          {/* Ornamental top rule */}
          <OrnamentalRule className="mb-6" />

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ColumnCapital />
                <span className="font-cinzel text-xs tracking-[0.25em] uppercase text-gold-600">
                  Research Instrument
                </span>
                <ColumnCapital />
              </div>
              <h1 className="font-cinzel text-4xl font-semibold text-navy-900 tracking-wide leading-tight">
                Genealogy Record Auditor
              </h1>
              <p className="mt-3 text-sm text-navy-500 max-w-lg leading-relaxed">
                AI-assisted analysis of historical genealogical documents — surfaces gaps,
                ambiguities, and inconsistencies, then charts a personalized path forward.
              </p>
            </div>
          </div>

          {/* Ornamental bottom rule */}
          <OrnamentalRule className="mt-6" />
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 space-y-10">

        {/* ── Input grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[288px_1fr] gap-6 items-start">

          {/* Left guide panel — column accents */}
          <div className="column-left column-right px-4 space-y-4">

            <div className="bg-white rounded-xl border border-navy-100 shadow-card cornice p-5">
              <p className="font-cinzel text-xs tracking-widest uppercase text-gold-600 mb-4">
                How it works
              </p>
              <ol className="space-y-5">
                {steps.map((s) => (
                  <li key={s.number} className="flex gap-3">
                    <span className="font-cinzel shrink-0 h-7 w-7 rounded-full border-2 border-gold-400 text-gold-600 text-xs font-bold flex items-center justify-center mt-0.5">
                      {s.number}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy-800">{s.heading}</p>
                      <p className="text-xs text-navy-500 mt-0.5 leading-relaxed">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-white rounded-xl border border-navy-100 shadow-card cornice p-5">
              <p className="font-cinzel text-xs tracking-widest uppercase text-gold-600 mb-3">
                Works well with
              </p>
              <ul className="space-y-2">
                {dos.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-xs text-navy-700">
                    <span className="mt-0.5 text-gold-500 font-bold">✦</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-gold-200 shadow-card cornice p-5">
              <p className="font-cinzel text-xs tracking-widest uppercase text-gold-600 mb-3">
                Avoid pasting
              </p>
              <ul className="space-y-2">
                {donts.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-xs text-navy-600">
                    <span className="mt-0.5 text-navy-300 font-bold">✕</span>
                    {d}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-navy-400 border-t border-gold-100 pt-3 leading-relaxed">
                For historical records only. Do not submit data about living people.
              </p>
            </div>

            <button
              onClick={() => { setInputText(SAMPLE_RECORD); setResearcherContext(SAMPLE_CONTEXT) }}
              className="w-full rounded-xl border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 text-xs font-semibold px-4 py-3 transition-colors flex items-center justify-center gap-2 cornice"
            >
              <ScrollIcon />
              Load a real historical record
            </button>
          </div>

          {/* Right: inputs */}
          <div className="space-y-4">

            {/* Researcher context — gold cornice */}
            <div className="bg-white rounded-xl shadow-card border border-gold-300 cornice overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-gold-50 via-white to-gold-50 border-b border-gold-200 flex items-start gap-3">
                <PersonIcon />
                <div>
                  <p className="font-cinzel text-sm font-semibold text-gold-900 tracking-wide">
                    Your Connection to this Record
                  </p>
                  <p className="text-xs text-gold-700 mt-1 leading-relaxed">
                    Tell us who you are and what you already know — your name, known relatives, and what you're
                    trying to find. The roadmap will be tailored specifically to your family.
                  </p>
                </div>
              </div>
              <div className="px-5 py-4">
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-gold-200 bg-gold-50/30 px-4 py-3 text-sm text-navy-900 placeholder-gold-400 resize-none focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition leading-relaxed"
                  placeholder={`Example: "My name is Micah Fossett. My father is Damirez Fossett. I believe we descend from Joseph and Edith Fossett of Monticello, Albemarle County, Virginia. I am trying to trace the line from Damirez back through the generations and find what connects us to this historical record."`}
                  value={researcherContext}
                  onChange={(e) => setResearcherContext(e.target.value)}
                  disabled={isLoading}
                />
                <p className={`mt-2 text-xs flex items-center gap-1.5 ${researcherContext.trim() ? 'text-gold-700' : 'text-gold-500'}`}>
                  <span>{researcherContext.trim() ? '✦' : '◇'}</span>
                  {researcherContext.trim()
                    ? 'Context provided — roadmap will be tailored to your family.'
                    : 'Optional but recommended — without this the roadmap will be generic.'}
                </p>
              </div>
            </div>

            {/* Historical record */}
            <div className="bg-white rounded-xl shadow-card border border-navy-100 cornice overflow-hidden">
              <div className="px-6 pt-5 pb-2">
                <label htmlFor="record-input" className="block font-cinzel text-xs tracking-widest uppercase text-navy-500 mb-1">
                  Historical Record
                </label>
                <p className="text-xs text-navy-400 mb-3">
                  Paste the primary source text — census entry, church register, family narrative, plantation record, etc.
                </p>
                <textarea
                  id="record-input"
                  rows={12}
                  className="w-full rounded-lg border border-navy-200 bg-canvas px-4 py-3.5 text-sm text-navy-900 placeholder-navy-300 resize-y focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition scrollbar-thin leading-relaxed"
                  placeholder={`Paste a census record, family Bible entry, vital record, or any historical genealogical text here…\n\nOr click "Load a real historical record" on the left to try a documented example.`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="px-6 py-4 flex items-center justify-between border-t border-navy-50 bg-navy-50/40">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAudit}
                    disabled={isLoading || !inputText.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-800 hover:bg-navy-700 active:bg-navy-900 text-white text-sm font-semibold px-6 py-2.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 border border-navy-700"
                  >
                    {isLoading ? <><Spinner />Auditing…</> : <><AuditIcon />Audit Record</>}
                  </button>
                  {result && (
                    <button
                      onClick={() => { setResult(null); setError(null) }}
                      className="text-sm text-navy-400 hover:text-navy-700 underline underline-offset-2 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {inputText.trim() && (
                  <span className="text-xs text-navy-400 font-cinzel tracking-wider">
                    {inputText.trim().split(/\s+/).length} words
                  </span>
                )}
              </div>
            </div>
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
          <section className="space-y-6">

            {/* Section ornamental divider */}
            <OrnamentalRule />

            {/* Summary */}
            <div className="bg-white rounded-xl shadow-card border border-navy-100 cornice px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-cinzel text-xs tracking-widest uppercase text-gold-600">
                  Summary
                </p>
                <span className="font-cinzel text-xs font-semibold rounded-full bg-navy-100 text-navy-700 px-3 py-1 tracking-wider">
                  {totalFindings} finding{totalFindings !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-navy-800 leading-relaxed">{result.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const count = result[c.key].length
                  if (count === 0) return null
                  return (
                    <span key={c.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.badgeColor}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dotColor}`} />
                      {c.label.split(' ')[0]} · {count}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Category cards */}
            {totalFindings === 0 ? (
              <div className="bg-white rounded-xl shadow-card border border-navy-100 cornice px-6 py-8 text-center">
                <p className="text-navy-400 text-sm">No significant issues detected in this record.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => {
                  const items = result[cat.key]
                  if (items.length === 0) return null
                  return (
                    <div key={cat.key} className={`bg-white rounded-xl shadow-card border border-navy-100 border-l-4 ${cat.borderColor} overflow-hidden`}>
                      <div className={`px-5 py-4 ${cat.bgColor} border-b border-navy-100/60`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className={`font-cinzel text-xs tracking-wider uppercase ${cat.textColor}`}>{cat.label}</h2>
                            <p className="text-xs text-navy-400 mt-1">{cat.description}</p>
                          </div>
                          <span className={`shrink-0 font-cinzel text-xs font-bold rounded-full px-2 py-0.5 ${cat.badgeColor}`}>
                            {items.length}
                          </span>
                        </div>
                      </div>
                      <ul className="divide-y divide-navy-50">
                        {items.map((item, i) => (
                          <li key={i} className="px-5 py-3.5 flex gap-3 items-start">
                            <span className={`mt-2 shrink-0 h-1.5 w-1.5 rounded-full ${cat.dotColor}`} />
                            <span className="text-sm text-navy-700 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Research Roadmap */}
            {result.researchSteps?.length > 0 && (
              <div className="bg-white rounded-xl shadow-card border border-navy-100 overflow-hidden">
                {/* Arch-bottom header */}
                <div className="bg-navy-800 px-6 pt-6 pb-10 arch-bottom relative">
                  <div className="flex items-center gap-3 relative z-10">
                    <CompassIcon />
                    <div>
                      <h2 className="font-cinzel text-base font-semibold text-white tracking-wide">
                        Research Roadmap
                      </h2>
                      <p className="text-xs text-navy-300 mt-0.5">
                        {researcherContext.trim()
                          ? 'Personalized next steps based on your family context'
                          : 'Prioritized next steps to resolve the gaps found above'}
                      </p>
                    </div>
                  </div>
                  {/* Flanking ornamental lines */}
                  <div className="absolute bottom-5 left-6 right-6 flex items-center gap-3 opacity-30 z-10">
                    <div className="flex-1 h-px bg-gold-400" />
                    <span className="text-gold-400 text-xs">✦</span>
                    <div className="flex-1 h-px bg-gold-400" />
                  </div>
                </div>

                <ol className="divide-y divide-navy-50 pt-4">
                  {result.researchSteps.map((step, i) => {
                    const ps = priorityStyles[step.priority] ?? priorityStyles.low
                    return (
                      <li key={i} className="px-6 py-4 flex gap-4 items-start">
                        <span className="font-cinzel shrink-0 h-7 w-7 rounded-full border-2 border-gold-300 text-gold-600 text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-navy-800 leading-relaxed">{step.action}</p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded-md bg-navy-50 border border-navy-200 px-2 py-0.5 text-xs font-medium text-navy-600">
                              <ResourceIcon />
                              {step.resource}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ps.badge}`}>
                              {ps.label} priority
                            </span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <div className="h-0.5 bg-navy-800" />
      <div className="h-px bg-gold-300" />
      <div className="h-1 bg-gold-500" />
      <footer className="bg-white border-t border-navy-100">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <OrnamentalRule className="mb-4" />
          <div className="flex items-center justify-between">
            <span className="font-cinzel text-xs tracking-widest text-navy-400 uppercase">
              Powered by Claude
            </span>
            <span className="text-xs text-navy-300">
              Analysis is advisory — verify all findings against primary sources
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ── Decorative components ── */

function OrnamentalRule({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-300 to-gold-200" />
      <svg width="18" height="18" viewBox="0 0 18 18" className="text-gold-500 shrink-0">
        <polygon points="9,1 17,9 9,17 1,9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="2" fill="currentColor" />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gold-300 to-gold-200" />
    </div>
  )
}

function ArchWatermark() {
  return (
    <svg width="600" height="400" viewBox="0 0 600 400" fill="none">
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${i * 120}, 0)`}>
          <path d={`M10,400 L10,150 Q60,80 110,150 L110,400`} stroke="#1E3E74" strokeWidth="3" fill="none" />
          <path d={`M20,400 L20,160 Q60,100 100,160 L100,400`} stroke="#1E3E74" strokeWidth="1" fill="none" />
          <rect x="5" y="370" width="110" height="15" stroke="#1E3E74" strokeWidth="2" fill="none" />
          <rect x="0" y="385" width="120" height="15" stroke="#1E3E74" strokeWidth="2" fill="none" />
        </g>
      ))}
    </svg>
  )
}

function ColumnCapital() {
  return (
    <svg width="24" height="8" viewBox="0 0 24 8" className="text-gold-400">
      <rect x="0" y="0" width="24" height="2" fill="currentColor" />
      <rect x="3" y="3" width="18" height="1.5" fill="currentColor" opacity="0.6" />
      <rect x="6" y="5.5" width="12" height="2.5" fill="currentColor" opacity="0.4" />
    </svg>
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

function CompassIcon() {
  return (
    <svg className="h-6 w-6 text-gold-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}

function ResourceIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 015.656 0l4-4a4 4 0 01-5.656-5.656l-1.102 1.101" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg className="h-5 w-5 text-gold-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
