import { describe, expect, it } from 'vitest'
import { matchesMustMention } from './assertions'

describe('matchesMustMention', () => {
  it('passes when a single result string contains all substrings', () => {
    const results = ['Age listed as 89 is inconsistent with a birth year of abt. 1780']
    expect(matchesMustMention(results, { mustMention: ['89', '1780'] })).toBe(true)
  })

  it('is case-insensitive', () => {
    const results = ['EDITH IS RECORDED AS DECEASED PRIOR TO 1854']
    expect(matchesMustMention(results, { mustMention: ['deceased', '1854'] })).toBe(true)
  })

  it('fails when substrings are split across different result strings', () => {
    const results = ['Age listed as 89 seems too old', 'Birth year is abt. 1780']
    expect(matchesMustMention(results, { mustMention: ['89', '1780'] })).toBe(false)
  })

  it('fails when no result string contains any of the substrings', () => {
    const results = ['Everything about this record looks fine']
    expect(matchesMustMention(results, { mustMention: ['89', '1780'] })).toBe(false)
  })

  it('fails on empty results with a non-empty mustMention', () => {
    expect(matchesMustMention([], { mustMention: ['89'] })).toBe(false)
  })

  it('is vacuously true for an empty mustMention array', () => {
    expect(matchesMustMention(['anything'], { mustMention: [] })).toBe(true)
    expect(matchesMustMention([], { mustMention: [] })).toBe(true)
  })
})
