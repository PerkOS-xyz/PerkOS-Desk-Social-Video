import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { checkLock, checkSeatCoverage, updateLock, verifyRelease } from '../scripts/plugins-lock.js'

const lockUrl = new URL('../plugins.lock', import.meta.url)
const deskUrl = new URL('../desk.json', import.meta.url)

// Development coverage uses upstream source while release archives are pending.
// https://github.com/PerkOS-xyz/PerkOS-Runtime-Plugins/tree/0ac1610e8d2090c6a1674015bf40addbbb753f52
const capabilitiesByRelease = new Map([
  ['ffmpeg@0.1.0', ['video.probe', 'video.trim', 'video.scale', 'video.strip-audio', 'video.concat', 'video.captions', 'video.gif']],
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

test('plugin lock pins releases with known capability entries', () => {
  lockedCapabilities()
})

test('coverage accepts provided capabilities and reports a missing capability by seat', () => {
  const recorder = { id: 'recorder', uses: [] }
  const editor = { id: 'editor', uses: ['video.trim', 'video.render-composition'] }
  const provided = lockedCapabilities()

  checkSeatCoverage([recorder, editor], provided)
  assert.throws(
    () => checkSeatCoverage([recorder, { ...editor, uses: [...editor.uses, 'fixture.missing'] }], provided),
    /editor: fixture\.missing/
  )
})

test('locked plugins cover every seat capability', () => {
  const { seats } = JSON.parse(readFileSync(deskUrl, 'utf8'))
  checkSeatCoverage(seats, lockedCapabilities())
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

test('release verification checks the digest, manifest identity and actual archive capabilities', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'perkos-lock-test-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const archiveUrl = 'https://example.test/plugin.zip'
  const seats = [{ id: 'editor', uses: ['video.trim'] }]
  const manifest = { id: pin.id, version: pin.version, capabilities: ['video.trim'] }
  let archive
  const fetchRelease = async (url) => url === archiveUrl ? new Response(archive) :
    Response.json({ assets: [{ name: 'plugin.zip', browser_download_url: archiveUrl }] })
  function pack(declaration) {
    const path = join(directory, 'plugin.zip')
    rmSync(path, { force: true })
    writeFileSync(join(directory, 'plugin.json'), JSON.stringify(declaration))
    execFileSync('zip', ['-q', path, 'plugin.json'], { cwd: directory })
    archive = readFileSync(path)
  }

  await assert.rejects(verifyRelease(fixtureLock, seats, fetchRelease), /Pending plugin digests/)
  pack(manifest)
  const locked = await updateLock(fixtureLock, fetchRelease)
  await verifyRelease(locked, seats, fetchRelease)
  await assert.rejects(verifyRelease(locked, seats, async () => new Response(null, { status: 404 })),
    /GitHub release ffmpeg@0\.1\.0 does not exist yet/)

  pack({ ...manifest, capabilities: ['video.probe'] })
  await assert.rejects(verifyRelease(locked, seats, fetchRelease), /SHA-256 digest mismatch/)
  await assert.rejects(verifyRelease(await updateLock(fixtureLock, fetchRelease), seats, fetchRelease),
    /editor: video\.trim/)

  pack({ ...manifest, version: '0.2.0' })
  await assert.rejects(verifyRelease(await updateLock(fixtureLock, fetchRelease), seats, fetchRelease),
    /Invalid plugin\.json identity or capabilities/)
})
