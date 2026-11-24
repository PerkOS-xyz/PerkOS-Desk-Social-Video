import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const lockFile = new URL('../plugins.lock', import.meta.url)
const releasesUrl = 'https://api.github.com/repos/PerkOS-xyz/PerkOS-Runtime-Plugins/releases'
const exactVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

function isExactVersion(version) {
  const match = typeof version === 'string' && exactVersion.exec(version)
  return match && match[0] === version &&
    !match[4]?.split('.').some((part) => /^0\d+$/.test(part))
}

export function checkLock(lock, { release = false } = {}) {
  if (lock?.format !== 1 || !Array.isArray(lock.plugins) || !lock.plugins.length ||
      Object.keys(lock).length !== 2) {
    throw new Error('plugins.lock must contain format 1 and a nonempty plugins array')
  }

  const ids = new Set()
  const pending = []
  for (const pin of lock.plugins) {
    if (typeof pin?.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(pin.id) ||
        pin.id.trim() !== pin.id || !isExactVersion(pin.version) || Object.keys(pin).length !== 3) {
      throw new Error('Each plugin pin must contain an id, an exact version and a sha256 field')
    }
    if (ids.has(pin.id)) throw new Error('Duplicate plugin ID: ' + pin.id)
    ids.add(pin.id)
    const tag = pin.id + '@' + pin.version
    if (pin.sha256 === null) {
      pending.push(tag)
    } else if (typeof pin.sha256 !== 'string' || pin.sha256.length !== 64 || /[^a-f0-9]/.test(pin.sha256)) {
      throw new Error('Invalid SHA-256 digest for ' + tag)
    }
  }

  if (release && pending.length) {
    throw new Error('Pending plugin digests: ' + pending.join(', ') +
      '. Run npm run lock -- update once the releases are published.')
  }
}

export async function updateLock(lock, fetchRelease = fetch) {
  checkLock(lock)
  const plugins = []
  for (const pin of lock.plugins) {
    const tag = pin.id + '@' + pin.version
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
    const hash = createHash('sha256')
    for await (const chunk of download.body) hash.update(chunk)
    plugins.push({ ...pin, sha256: hash.digest('hex') })
  }
  return { format: 1, plugins }
}

async function main(args) {
  const command = args.join(' ')
  if (!['check', 'check --release', 'update'].includes(command)) {
    throw new Error('Usage: npm run lock -- <check [--release]|update>')
  }
  const lock = JSON.parse(await readFile(lockFile, 'utf8'))
  if (command === 'update') {
    const updated = await updateLock(lock)
    await writeFile(lockFile, JSON.stringify(updated, null, 2) + '\n')
  } else {
    checkLock(lock, { release: command === 'check --release' })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
