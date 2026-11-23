const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const lock = JSON.parse(readFileSync(join(__dirname, '../plugins.lock'), 'utf8'));
const deskPath = join(__dirname, '../desk.json');

// Initial capability assignments for the desk. Verify against upstream
// declarations when the pinned releases are available.
const capabilitiesByRelease = new Map([
  ['ffmpeg@0.1.0', ['video.edit']],
  ['openscreen@0.1.0', ['video.record-window']],
  ['effectcraft@0.1.0', []],
  ['impeccable@0.1.0', ['design.polish-review', 'design.slop-check']],
  ['remotion@0.1.0', ['video.render']],
]);

function lockedCapabilities() {
  assert.equal(lock.source, 'https://github.com/PerkOS-xyz/PerkOS-Runtime-Plugins');
  const pins = Object.entries(lock.plugins);
  assert.ok(pins.length > 0, 'plugins.lock must pin at least one plugin');
  return new Set(pins.flatMap(([id, version]) => {
    const release = `${id}@${version}`;
    assert.ok(capabilitiesByRelease.has(release), `Missing capability entry for ${release}`);
    return capabilitiesByRelease.get(release);
  }));
}

test('plugin lock pins releases with known capability entries', () => {
  lockedCapabilities();
});

test('locked plugins cover every seat capability', {
  skip: !existsSync(deskPath) && 'desk.json is absent',
}, () => {
  const { seats } = JSON.parse(readFileSync(deskPath, 'utf8'));
  const provided = lockedCapabilities();
  const missing = seats.flatMap(({ id, uses }) => uses
    .filter((capability) => !provided.has(capability))
    .map((capability) => `${id}: ${capability}`));
  assert.deepEqual(missing, [], 'Seat capabilities missing from locked plugins');
});
