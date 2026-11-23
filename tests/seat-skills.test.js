import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const deskUrl = new URL('../desk.json', import.meta.url)

test('each desk seat has a Markdown skill file', (t) => {
  let source
  try {
    source = readFileSync(deskUrl, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      t.skip('desk.json has not been added yet')
      return
    }
    throw error
  }

  const { seats } = JSON.parse(source)
  assert.ok(Array.isArray(seats) && seats.length > 0, 'desk.json must list seats')
  for (const seat of seats) {
    const id = typeof seat === 'string' ? seat : seat?.id
    assert.ok(typeof id === 'string' && /^[a-z0-9-]+$/.test(id), 'Expected a valid seat ID')
    const skillUrl = new URL(`../skills/${id}.md`, import.meta.url)
    assert.ok(statSync(skillUrl, { throwIfNoEntry: false })?.isFile(), `Missing skills/${id}.md`)
  }
})
