import 'dotenv/config'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SYSTEM_PROMPT, buildUserMessage, extractJson, type AuditResult } from '../src/audit/prompt'
import { matchesMustMention, type EvalCase } from './assertions'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CASES_DIR = join(__dirname, 'cases')
const PASS_THRESHOLD = 0.8

const CATEGORIES = ['missingNames', 'dateGaps', 'lineageGaps', 'incompleteOrContradictory'] as const

function loadCases(): EvalCase[] {
  return readdirSync(CASES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(CASES_DIR, f), 'utf-8')) as EvalCase)
}

async function runAudit(evalCase: EvalCase): Promise<AuditResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — copy .env.example to .env and add your key')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 4096,
      thinking: { type: 'disabled' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(evalCase.context, evalCase.record) }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? `Request failed: ${response.status}`,
    )
  }

  const data = (await response.json()) as { content: { type: string; text: string }[] }
  const rawText = data.content.find((b) => b.type === 'text')?.text ?? ''
  return JSON.parse(extractJson(rawText)) as AuditResult
}

async function main() {
  const args = process.argv.slice(2)
  const caseFlagIndex = args.indexOf('--case')
  const onlyCaseName = caseFlagIndex !== -1 ? args[caseFlagIndex + 1] : undefined

  let cases = loadCases()
  if (onlyCaseName) {
    cases = cases.filter((c) => c.name === onlyCaseName)
    if (cases.length === 0) {
      console.error(`No eval case named "${onlyCaseName}" found in eval/cases/`)
      process.exit(1)
    }
  }

  let totalChecked = 0
  let totalPassed = 0

  for (const evalCase of cases) {
    console.log(`\n=== ${evalCase.name} ===`)

    let result: AuditResult
    try {
      result = await runAudit(evalCase)
    } catch (e) {
      console.error(`  ERROR: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }

    for (const category of CATEGORIES) {
      const expectedItems = evalCase.expected[category]
      if (expectedItems.length === 0) continue

      const actualResults = result[category]
      for (const item of expectedItems) {
        totalChecked++
        const passed = matchesMustMention(actualResults, item)
        if (passed) totalPassed++
        const status = passed ? 'PASS' : 'FAIL'
        console.log(`  [${status}] ${category}: requires [${item.mustMention.join(', ')}]`)
      }
    }
  }

  const passRate = totalChecked === 0 ? 1 : totalPassed / totalChecked
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Overall: ${totalPassed}/${totalChecked} assertions passed (${(passRate * 100).toFixed(1)}%)`)

  if (passRate < PASS_THRESHOLD) {
    console.log(`Below ${PASS_THRESHOLD * 100}% threshold — failing.`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
