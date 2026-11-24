import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { parsePluginsLock } from './runtime-plugins-lock.js'

const lockFile = new URL('../plugins.lock', import.meta.url)
const deskFile = new URL('../desk.json', import.meta.url)
const run = promisify(execFile)
const releasesUrl = 'https://api.github.com/repos/PerkOS-xyz/PerkOS-Runtime-Plugins/releases'

export function checkLock(json, { release = false } = {}) {
  const lock = parsePluginsLock(json)
  const pins = Object.entries(lock.plugins)
  if (!pins.length) throw new Error('plugins.lock must pin at least one plugin')

  if (release) {
    const pending = pins.filter(([, pin]) => typeof pin === 'string')
      .map(([id, version]) => id + '@' + version)
    if (pending.length) {
      throw new Error('Pending plugin digests: ' + pending.join(', ') +
        '. Run npm run lock -- update once the releases are published.')
    }
  }
  return lock
}

async function downloadArchive(tag, fetchRelease) {
  const release = await fetchRelease(releasesUrl + '/tags/' + encodeURIComponent(tag), {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (release.status === 404) throw new Error('GitHub release ' + tag + ' does not exist yet')
  if (!release.ok) throw new Error('Could not read GitHub release ' + tag + ' (HTTP ' + release.status + ')')
  const { assets } = await release.json()
  const archive = assets?.find((asset) => asset.name === 'plugin.zip')
  if (!archive?.browser_download_url) throw new Error('GitHub release ' + tag + ' has no plugin.zip asset')

  const download = await fetchRelease(archive.browser_download_url)
  if (!download.ok || !download.body) {
    throw new Error('Could not download plugin.zip for ' + tag + ' (HTTP ' + download.status + ')')
  }
  return Buffer.from(await download.arrayBuffer())
}

export async function updateLock(json, fetchRelease = fetch) {
  const { source, plugins } = checkLock(json)
  const updated = Object.create(null)
  for (const [id, pin] of Object.entries(plugins)) {
    const version = typeof pin === 'string' ? pin : pin.version
    const archive = await downloadArchive(id + '@' + version, fetchRelease)
    const sha256 = createHash('sha256').update(archive).digest('hex')
    updated[id] = { version, sha256 }
  }
  const result = JSON.stringify({ source, plugins: updated }, null, 2) + '\n'
  checkLock(result, { release: true })
  return result
}

export function checkSeatCoverage(seats, provided) {
  const missing = seats.flatMap(({ id, uses }) =>
    (uses ?? []).filter((capability) => !provided.has(capability))
      .map((capability) => `${id}: ${capability}`))
  if (missing.length) throw new Error('Seat capabilities missing from locked plugins: ' + missing.join(', '))
}

export async function verifyRelease(json, seats, fetchRelease = fetch) {
  const { plugins } = checkLock(json, { release: true })
  const provided = new Set()
  const directory = await mkdtemp(join(tmpdir(), 'perkos-plugin-'))
  const archivePath = join(directory, 'plugin.zip')
  try {
    for (const [id, pin] of Object.entries(plugins)) {
      const tag = id + '@' + pin.version
      const archive = await downloadArchive(tag, fetchRelease)
      if (createHash('sha256').update(archive).digest('hex') !== pin.sha256) {
        throw new Error('SHA-256 digest mismatch for ' + tag)
      }
      await writeFile(archivePath, archive)
      let manifest
      try {
        const { stdout } = await run('unzip', ['-p', archivePath, 'plugin.json'])
        manifest = JSON.parse(stdout)
      } catch (error) {
        throw new Error('Could not read plugin.json for ' + tag + ': ' + error.message)
      }
      if (manifest?.id !== id || manifest.version !== pin.version ||
          !Array.isArray(manifest.capabilities) ||
          !manifest.capabilities.every((capability) => typeof capability === 'string')) {
        throw new Error('Invalid plugin.json identity or capabilities for ' + tag)
      }
      for (const capability of manifest.capabilities) provided.add(capability)
    }
    checkSeatCoverage(seats, provided)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function main(args) {
  const command = args.join(' ')
  if (!['check', 'check --release', 'update'].includes(command)) {
    throw new Error('Usage: npm run lock -- <check [--release]|update>')
  }
  const lock = await readFile(lockFile, 'utf8')
  if (command === 'update') {
    const updated = await updateLock(lock)
    await writeFile(lockFile, updated)
  } else if (command === 'check --release') {
    const { seats } = JSON.parse(await readFile(deskFile, 'utf8'))
    await verifyRelease(lock, seats)
  } else {
    checkLock(lock)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
