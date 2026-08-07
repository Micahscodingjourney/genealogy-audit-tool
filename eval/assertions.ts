export interface EvalExpectedItem {
  mustMention: string[]
}

export interface EvalCase {
  name: string
  record: string
  context: string
  expected: {
    missingNames: EvalExpectedItem[]
    dateGaps: EvalExpectedItem[]
    lineageGaps: EvalExpectedItem[]
    incompleteOrContradictory: EvalExpectedItem[]
  }
}

/**
 * Checks whether at least one string in `results` (the LLM's findings for
 * one audit category, e.g. AuditResult.dateGaps) contains ALL of the
 * substrings listed in `item.mustMention`, case-insensitively.
 *
 * This is a fuzzy containment check, not an exact match — the LLM's exact
 * phrasing will vary between runs, but the substrings we anchor on (names,
 * years, quoted phrases pulled directly from the source record) should
 * reliably appear if the model actually caught the issue.
 *
 * Example:
 *   results = ["Age listed as 89 is inconsistent with a birth year of abt. 1780"]
 *   item.mustMention = ["89", "1780"]
 *   -> true, because a single result string contains both substrings.
 *
 *   results = ["Age listed as 89 seems too old", "Birth year is abt. 1780"]
 *   item.mustMention = ["89", "1780"]
 *   -> false, because no SINGLE string contains both — they're split across
 *      two separate findings.
 *
 * An empty mustMention array is vacuously true for any results (including
 * empty results) since there is nothing to require.
 *
 * TODO(Micah): implement this function's body per the JSDoc above.
 */
export function matchesMustMention(results: string[], item: EvalExpectedItem): boolean {
  void results
  void item
  throw new Error('matchesMustMention() not implemented yet — see JSDoc above and eval/assertions.test.ts')
}
