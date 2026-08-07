import type { ExtractedEntities } from './extract'
import type { CorpusRecord } from './types'

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
 *   - same county (case-insensitive, trimmed)        -> 1.0
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
 * TODO(Micah): implement this function's body per the spec above.
 */
export function scoreRecord(
  entities: ExtractedEntities,
  record: CorpusRecord,
): ScoreBreakdown {
  void entities
  void record
  throw new Error('scoreRecord() not implemented yet — see JSDoc above and src/retrieval/scoring.test.ts')
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
