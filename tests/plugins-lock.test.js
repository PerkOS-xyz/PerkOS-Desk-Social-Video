import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const lockUrl = new URL('../plugins.lock', import.meta.url)
const deskUrl = new URL('../desk.json', import.meta.url)

// Proposed capability assignments pending upstream releases.
const capabilitiesByRelease = new Map([
  ['ffmpeg@0.1.0', ['video.edit']],
  ['openscreen@0.1.0', ['video.record-window']],
  ['effectcraft@0.1.0', []],
  ['impeccable@0.1.0', ['design.polish-review', 'design.slop-check']],
  ['remotion@0.1.0', ['video.render']],
])

function lockedCapabilities() {
  const lock = JSON.parse(readFileSync(lockUrl, 'utf8'))
  assert.equal(lock.source, 'https://github.com/PerkOS-xyz/PerkOS-Runtime-Plugins')
  const pins = Object.entries(lock.plugins)
  assert.ok(pins.length > 0, 'plugins.lock must pin at least one plugin')
  return new Set(pins.flatMap(([id, version]) => {
    const release = `${id}@${version}`
    const capabilities = capabilitiesByRelease.get(release)
    assert.ok(capabilities, `Missing capability entry for ${release}`)
    return capabilities
  }))
}

function assertSeatCoverage(seats) {
  assert.ok(Array.isArray(seats) && seats.length > 0, 'desk.json must list seats')
  const provided = lockedCapabilities()
  const missing = seats.flatMap(({ id, uses }) => {
    assert.ok(Array.isArray(uses), `Seat ${id} must list its capabilities in uses`)
    return uses.filter((capability) => !provided.has(capability))
      .map((capability) => `${id}: ${capability}`)
  })
  assert.deepEqual(missing, [], 'Seat capabilities missing from locked plugins')
}

test('plugin lock pins releases with known capability entries', () => {
  lockedCapabilities()
})

test('coverage accepts provided capabilities and reports a missing capability by seat', () => {
  const recorder = { id: 'recorder', uses: ['video.record-window'] }
  const editor = { id: 'editor', uses: ['video.edit', 'video.render'] }

  assertSeatCoverage([recorder, editor])
  assert.throws(
    () => assertSeatCoverage([recorder, { ...editor, uses: [...editor.uses, 'fixture.missing'] }]),
    { actual: ['editor: fixture.missing'], expected: [] }
  )
})

test('locked plugins cover every seat capability', {
  skip: !existsSync(deskUrl) && 'desk.json is absent',
}, () => {
  const { seats } = JSON.parse(readFileSync(deskUrl, 'utf8'))
  assertSeatCoverage(seats)
})
