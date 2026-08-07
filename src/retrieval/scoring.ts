import type { ExtractedEntities } from './extract'
import type { CorpusRecord, CorpusPerson } from './types'

export interface ScoreBreakdown {
  geo: number // 0..1
  time: number // 0..1
  occupation: number // 0..1
  total: number // weighted sum
}

export const WEIGHTS = { geo: 0.4, time: 0.35, occupation: 0.25 }

/**
 * Scores how relevant a single corpus record is to the entities extracted
 * from the user's pasted record, across three weighted dimensions.
 *
 * geo (weight 0.4):
 *   - same county (case-insensitive, trimmed, "County"/"Parish" suffix and
 *     full state name vs. postal abbreviation ignored)  -> 1.0
 *   - same state, different or unknown county          -> 0.6
 *   - different state                                    -> 0.0
 *   - either side has no location info at all            -> 0.3 (uncertainty, not zero)
 *   If the extracted entities include multiple locations, use the best
 *   (highest-scoring) match against the corpus record's single location.
 *
 * time (weight 0.35):
 *   - Treat [entities.yearStart, entities.yearEnd] and
 *     [record.yearStart, record.yearEnd] as two ranges.
 *   - score = (overlap of the two ranges) / (length of the SHORTER of the
 *     two ranges), clamped to [0, 1].
 *     e.g. entities span 1800-1830 (30y), record spans 1810-1826 (16y,
 *     the shorter range) -> overlap is 1810-1826 = 16y -> 16/16 = 1.0
 *   - If either side's years are wholly outside the other's range, overlap
 *     is 0.
 *   - If yearStart/yearEnd is missing on either side (entities or record),
 *     score is 0.3 (uncertainty, not zero).
 *
 * occupation (weight 0.25):
 *   - Compare entities.people[].occupation against
 *     record.people[].occupation, lowercase + trimmed, exact string match.
 *   - Any match on any pair of people -> 1.0
 *   - No occupation values present on either side -> 0.3
 *   - Occupation values present on both sides but none match -> 0.0
 *
 * total = WEIGHTS.geo * geo + WEIGHTS.time * time + WEIGHTS.occupation * occupation
 *
 */
export function scoreRecord(
  entities: ExtractedEntities,
  record: CorpusRecord,
): ScoreBreakdown {
  const geo = scoreGeo(entities.locations, record.location)
  const time = scoreTime(entities.yearStart, entities.yearEnd, record.yearStart, record.yearEnd)
  const occupation = scoreOccupation(entities.people, record.people)
  const total = WEIGHTS.geo * geo + WEIGHTS.time * time + WEIGHTS.occupation * occupation
  return { geo, time, occupation, total }
}

function isEmptyLocation(loc: { county?: string; state?: string }): boolean {
  return !loc.county?.trim() && !loc.state?.trim()
}

// Entity extraction is an LLM call, not a fixed schema — it may return
// "Albemarle County" where the corpus has "Albemarle", or "Virginia" where
// the corpus has "VA". Normalize both sides before comparing so genuine
// matches don't silently score as mismatches.
const STATE_ABBREVIATIONS: Record<string, string> = {
  virginia: 'va', ohio: 'oh', 'west virginia': 'wv', maryland: 'md',
  pennsylvania: 'pa', kentucky: 'ky', tennessee: 'tn', 'north carolina': 'nc',
  'south carolina': 'sc', georgia: 'ga', alabama: 'al', mississippi: 'ms',
  louisiana: 'la', texas: 'tx', arkansas: 'ar', missouri: 'mo',
  illinois: 'il', indiana: 'in', michigan: 'mi', wisconsin: 'wi',
  florida: 'fl', 'new york': 'ny', 'new jersey': 'nj', delaware: 'de',
}

function normalizeCounty(county?: string): string | undefined {
  const c = county?.trim().toLowerCase()
  if (!c) return undefined
  return c.replace(/\s+(county|parish)$/, '').trim()
}

function normalizeState(state?: string): string | undefined {
  const s = state?.trim().toLowerCase()
  if (!s) return undefined
  return STATE_ABBREVIATIONS[s] ?? s
}

function scoreGeoPair(
  loc: { county?: string; state?: string },
  record: { county?: string; state?: string },
): number {
  if (isEmptyLocation(loc) || isEmptyLocation(record)) return 0.3

  const county = normalizeCounty(loc.county)
  const recordCounty = normalizeCounty(record.county)
  if (county && recordCounty && county === recordCounty) return 1.0

  const state = normalizeState(loc.state)
  const recordState = normalizeState(record.state)
  if (state && recordState && state === recordState) return 0.6

  return 0.0
}

function scoreGeo(
  locations: { county?: string; state?: string }[],
  recordLocation: { county?: string; state?: string },
): number {
  if (locations.length === 0) return 0.3
  return Math.max(...locations.map((loc) => scoreGeoPair(loc, recordLocation)))
}

function scoreTime(
  entityStart: number | undefined,
  entityEnd: number | undefined,
  recordStart: number,
  recordEnd: number,
): number {
  if (entityStart === undefined || entityEnd === undefined) return 0.3

  const overlapStart = Math.max(entityStart, recordStart)
  const overlapEnd = Math.min(entityEnd, recordEnd)
  if (overlapEnd < overlapStart) return 0

  const overlapLength = overlapEnd - overlapStart
  const shorterLength = Math.min(entityEnd - entityStart, recordEnd - recordStart)

  // Ranges intersect but the shorter range is a single point (start === end) —
  // dividing by zero would be wrong; the point falling in range means full overlap.
  if (shorterLength === 0) return 1.0

  return Math.min(1, Math.max(0, overlapLength / shorterLength))
}

function scoreOccupation(
  entityPeople: { name: string; occupation?: string }[],
  recordPeople: CorpusPerson[],
): number {
  const entityOccupations = entityPeople
    .map((p) => p.occupation?.trim().toLowerCase())
    .filter((o): o is string => Boolean(o))
  const recordOccupations = recordPeople
    .map((p) => p.occupation?.trim().toLowerCase())
    .filter((o): o is string => Boolean(o))

  if (entityOccupations.length === 0 && recordOccupations.length === 0) return 0.3
  if (entityOccupations.some((o) => recordOccupations.includes(o))) return 1.0
  return 0.0
}

/**
 * Scores every record in the corpus against the extracted entities, sorts
 * descending by total score, drops anything below the noise floor (0.2),
 * and returns the top K.
 */
export function rankCorpus(
  entities: ExtractedEntities,
  corpus: CorpusRecord[],
  topK = 4,
): { record: CorpusRecord; score: ScoreBreakdown }[] {
  return corpus
    .map((record) => ({ record, score: scoreRecord(entities, record) }))
    .filter((r) => r.score.total >= 0.2)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, topK)
}
