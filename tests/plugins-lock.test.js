import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { checkLock, updateLock } from '../scripts/plugins-lock.js'

const lockUrl = new URL('../plugins.lock', import.meta.url)
const deskUrl = new URL('../desk.json', import.meta.url)

// Capability declarations for the pinned versions. OpenScreen is pending upstream.
const capabilitiesByRelease = new Map([
  ['ffmpeg@0.1.0', ['video.probe', 'video.trim', 'video.scale', 'video.strip-audio', 'video.concat', 'video.captions', 'video.gif']],
  ['openscreen@0.1.0', ['video.record-window']],
  ['effectcraft@0.1.0', ['video.edit', 'video.render']],
  ['impeccable@0.1.0', ['design.polish-review', 'design.slop-check', 'design.critique']],
  ['remotion@0.1.0', ['video.render-composition']],
])

function lockedCapabilities() {
  const lock = JSON.parse(readFileSync(lockUrl, 'utf8'))
  checkLock(lock)
  return new Set(lock.plugins.flatMap(({ id, version }) => {
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

test('locked plugins cover every seat capability', () => {
  const { seats } = JSON.parse(readFileSync(deskUrl, 'utf8'))
  assertSeatCoverage(seats)
})

const pin = { id: 'ffmpeg', version: '0.1.0', sha256: null }
const fixtureLock = { format: 1, plugins: [pin] }

test('development accepts pending digests and release requires complete digests', () => {
  checkLock(fixtureLock)
  assert.throws(() => checkLock(fixtureLock, { release: true }), /Pending plugin digests: ffmpeg@0\.1\.0/)
  checkLock({ format: 1, plugins: [{ ...pin, sha256: 'a'.repeat(64) }] }, { release: true })
})

test('lock validation rejects duplicate IDs, ranges, and malformed digests', () => {
  assert.throws(() => checkLock({ ...fixtureLock, plugins: [pin, { ...pin, version: '0.2.0' }] }), /Duplicate plugin ID/)
  assert.throws(() => checkLock({ ...fixtureLock, plugins: [{ ...pin, version: '^0.1.0' }] }), /exact version/)
  for (const sha256 of [undefined, '', 'a'.repeat(63), 'A'.repeat(64)]) {
    assert.throws(() => checkLock({ ...fixtureLock, plugins: [{ ...pin, sha256 }] }), /Invalid SHA-256/)
  }
})

test('update hashes the plugin.zip bytes from each exact release', async () => {
  const archiveUrl = 'https://example.test/plugin.zip'
  const requests = []
  const fetchRelease = async (url) => {
    requests.push(url)
    return url === archiveUrl ? new Response('abc') : Response.json({
      assets: [
        { name: 'checksum.md', browser_download_url: 'https://example.test/checksum.md' },
        { name: 'plugin.zip', browser_download_url: archiveUrl },
      ],
    })
  }
  const lock = { ...fixtureLock, plugins: [pin, { ...pin, id: 'effectcraft' }] }
  const updated = await updateLock(lock, fetchRelease)
  const base = 'https://api.github.com/repos/PerkOS-xyz/PerkOS-Runtime-Plugins/releases/tags/'
  assert.deepEqual(requests, [base + 'ffmpeg%400.1.0', archiveUrl, base + 'effectcraft%400.1.0', archiveUrl])
  assert.deepEqual(updated.plugins, lock.plugins.map((entry) => ({
    ...entry, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  })))
  checkLock(updated, { release: true })
})

test('update identifies a missing release or plugin.zip', async () => {
  await assert.rejects(updateLock(fixtureLock, async () => new Response(null, { status: 404 })),
    /GitHub release ffmpeg@0\.1\.0 does not exist yet/)
  await assert.rejects(updateLock(fixtureLock, async () => Response.json({ assets: [] })),
    /GitHub release ffmpeg@0\.1\.0 has no plugin\.zip asset/)
})
