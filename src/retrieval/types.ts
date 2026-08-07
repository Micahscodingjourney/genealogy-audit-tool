export interface CorpusPerson {
  name: string
  role: string
  occupation?: string
}

export interface CorpusRecord {
  id: string
  source: string
  recordType: 'labor_contract' | 'census' | 'farm_book' | 'vital' | 'church' | 'directory'
  people: CorpusPerson[]
  location: { county?: string; state?: string }
  yearStart: number
  yearEnd: number
  text: string
}
