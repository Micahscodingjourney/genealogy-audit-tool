import { describe, expect, it } from 'vitest'
import { scoreRecord, WEIGHTS } from './scoring'
import type { ExtractedEntities } from './extract'
import type { CorpusRecord } from './types'

function makeRecord(overrides: Partial<CorpusRecord> = {}): CorpusRecord {
  return {
    id: 'test-001',
    source: 'Test Source',
    recordType: 'census',
    people: [{ name: 'Joseph Fossett', role: 'head', occupation: 'blacksmith' }],
    location: { county: 'Albemarle', state: 'VA' },
    yearStart: 1810,
    yearEnd: 1826,
    text: 'Test record text.',
    ...overrides,
  }
}

function makeEntities(overrides: Partial<ExtractedEntities> = {}): ExtractedEntities {
  return {
    people: [{ name: 'Joseph Fossett', occupation: 'blacksmith' }],
    locations: [{ county: 'Albemarle', state: 'VA' }],
    yearStart: 1810,
    yearEnd: 1826,
    ...overrides,
  }
}

describe('WEIGHTS', () => {
  it('sums to 1', () => {
    expect(WEIGHTS.geo + WEIGHTS.time + WEIGHTS.occupation).toBeCloseTo(1)
  })
})

describe('scoreRecord — geo dimension', () => {
  it('scores 1.0 for a same-county match (case-insensitive)', () => {
    const entities = makeEntities({ locations: [{ county: 'albemarle', state: 'va' }] })
    const record = makeRecord({ location: { county: 'Albemarle', state: 'VA' } })
    expect(scoreRecord(entities, record).geo).toBe(1.0)
  })

  it('scores 0.6 for same state, different county', () => {
    const entities = makeEntities({ locations: [{ county: 'Fluvanna', state: 'VA' }] })
    const record = makeRecord({ location: { county: 'Albemarle', state: 'VA' } })
    expect(scoreRecord(entities, record).geo).toBe(0.6)
  })

  it('scores 0.0 for a different state entirely', () => {
    const entities = makeEntities({ locations: [{ county: 'Hamilton', state: 'OH' }] })
    const record = makeRecord({ location: { county: 'Albemarle', state: 'VA' } })
    expect(scoreRecord(entities, record).geo).toBe(0.0)
  })

  it('scores 0.3 when location info is missing on either side', () => {
    const entities = makeEntities({ locations: [] })
    const record = makeRecord()
    expect(scoreRecord(entities, record).geo).toBe(0.3)
  })
})

describe('scoreRecord — time dimension', () => {
  it('scores 1.0 for identical ranges', () => {
    const entities = makeEntities({ yearStart: 1810, yearEnd: 1826 })
    const record = makeRecord({ yearStart: 1810, yearEnd: 1826 })
    expect(scoreRecord(entities, record).time).toBe(1.0)
  })

  it('scores a fractional value for partial overlap', () => {
    // entities span 1800-1830 (30y); record spans 1810-1826 (16y, the shorter range)
    // overlap = 1810-1826 = 16y -> 16/16 = 1.0 for full containment
    const entities = makeEntities({ yearStart: 1800, yearEnd: 1830 })
    const record = makeRecord({ yearStart: 1810, yearEnd: 1826 })
    expect(scoreRecord(entities, record).time).toBeCloseTo(1.0)
  })

  it('scores partial overlap correctly when ranges only partially intersect', () => {
    // entities span 1820-1840 (20y); record spans 1810-1826 (16y, shorter)
    // overlap = 1820-1826 = 6y -> 6/16 = 0.375
    const entities = makeEntities({ yearStart: 1820, yearEnd: 1840 })
    const record = makeRecord({ yearStart: 1810, yearEnd: 1826 })
    expect(scoreRecord(entities, record).time).toBeCloseTo(6 / 16, 2)
  })

  it('scores 0 when ranges do not overlap at all', () => {
    const entities = makeEntities({ yearStart: 1900, yearEnd: 1910 })
    const record = makeRecord({ yearStart: 1810, yearEnd: 1826 })
    expect(scoreRecord(entities, record).time).toBe(0)
  })

  it('scores 0.3 when years are missing on either side', () => {
    const entities = makeEntities({ yearStart: undefined, yearEnd: undefined })
    const record = makeRecord()
    expect(scoreRecord(entities, record).time).toBe(0.3)
  })
})

describe('scoreRecord — occupation dimension', () => {
  it('scores 1.0 when any occupation matches (case-insensitive, trimmed)', () => {
    const entities = makeEntities({ people: [{ name: 'Joseph Fossett', occupation: ' Blacksmith ' }] })
    const record = makeRecord({ people: [{ name: 'Joseph Fossett', role: 'head', occupation: 'blacksmith' }] })
    expect(scoreRecord(entities, record).occupation).toBe(1.0)
  })

  it('scores 0.3 when neither side has occupation data', () => {
    const entities = makeEntities({ people: [{ name: 'Unknown' }] })
    const record = makeRecord({ people: [{ name: 'Unknown', role: 'head' }] })
    expect(scoreRecord(entities, record).occupation).toBe(0.3)
  })

  it('scores 0.0 when occupations are present but none match', () => {
    const entities = makeEntities({ people: [{ name: 'Joseph Fossett', occupation: 'cook' }] })
    const record = makeRecord({ people: [{ name: 'Joseph Fossett', role: 'head', occupation: 'blacksmith' }] })
    expect(scoreRecord(entities, record).occupation).toBe(0.0)
  })
})

describe('scoreRecord — total', () => {
  it('is the weighted sum of the three dimensions', () => {
    const entities = makeEntities()
    const record = makeRecord()
    const score = scoreRecord(entities, record)
    const expectedTotal =
      WEIGHTS.geo * score.geo + WEIGHTS.time * score.time + WEIGHTS.occupation * score.occupation
    expect(score.total).toBeCloseTo(expectedTotal, 5)
  })
})
