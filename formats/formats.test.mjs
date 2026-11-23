import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/** @param {unknown} value @param {string} field */
function positiveInteger(value, field) {
  assert.ok(typeof value === 'number' && Number.isInteger(value) && value > 0, field);
}

/** @param {unknown} value @param {string} field */
function nonemptyString(value, field) {
  assert.ok(typeof value === 'string' && value.trim().length > 0, field);
}

/** @param {unknown} value @param {string} field */
function verification(value, field) {
  assert.ok(value === 'verified' || value === 'unverified', field);
}

for (const network of ['x', 'tiktok', 'instagram']) {
  test(network + ' defines a complete social format', () => {
    const file = new URL('./' + network + '.json', import.meta.url);
    const format = JSON.parse(readFileSync(file, 'utf8'));
    const { video, videoLength, text, threads } = format;

    assert.equal(format.network, network);
    assert.ok(Array.isArray(video) && video.length > 0, 'video');
    for (const preset of video) {
      nonemptyString(preset.placement, 'video.placement');
      assert.match(preset.aspectRatio, /^[1-9]\d*:[1-9]\d*$/);
      positiveInteger(preset.widthPx, 'video.widthPx');
      positiveInteger(preset.heightPx, 'video.heightPx');
      const [width, height] = preset.aspectRatio.split(':').map(Number);
      assert.equal(preset.widthPx * height, preset.heightPx * width, 'video.aspectRatio');
    }

    positiveInteger(videoLength.maxSeconds, 'videoLength.maxSeconds');
    nonemptyString(videoLength.scope, 'videoLength.scope');
    verification(videoLength.verification, 'videoLength.verification');

    positiveInteger(text.maxCharacters, 'text.maxCharacters');
    if (text.deskMaxCharacters !== null || network === 'x') {
      positiveInteger(text.deskMaxCharacters, 'text.deskMaxCharacters');
      assert.ok(text.deskMaxCharacters <= text.maxCharacters, 'desk cap fits platform limit');
    }
    nonemptyString(text.scope, 'text.scope');
    verification(text.limitVerification, 'text.limitVerification');
    nonemptyString(text.counting, 'text.counting');
    verification(text.countingVerification, 'text.countingVerification');

    assert.equal(typeof threads.supported, 'boolean');
    verification(threads.verification, 'threads.verification');
  });
}
