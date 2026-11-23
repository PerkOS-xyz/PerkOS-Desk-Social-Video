const assert = require('node:assert/strict');
const test = require('node:test');
const desk = require('../desk.json');

function assertText(value) {
  assert.equal(typeof value, 'string');
  assert.ok(value.trim().length > 0);
}

test('desk has the required format 1 metadata', () => {
  assert.equal(desk.format, 1);
  assert.equal(desk.tier, 'public');
  for (const key of ['id', 'version', 'name', 'description']) {
    assertText(desk[key]);
  }
  assertText(desk.sparky.greeting);
  assert.ok(Array.isArray(desk.sparky.groups));
  assert.ok(Array.isArray(desk.home));
});

test('desk defines the five seats with their roles and capabilities', () => {
  assert.ok(Array.isArray(desk.seats));
  const seats = desk.seats.map(({ id, name, role, instructions, uses }) => {
    assertText(instructions);
    return [id, name, role, uses];
  });
  assert.deepEqual(seats, [
    ['researcher', 'Researcher', 'builder', []],
    ['writer', 'Writer', 'builder', []],
    ['recorder', 'Recorder', 'builder', ['video.record-window']],
    ['editor', 'Editor', 'builder', ['video.edit', 'video.render']],
    ['reviewer', 'Reviewer', 'reviewer', ['design.polish-review', 'design.slop-check']],
  ]);
});

test('setup steps collect all four required inputs', () => {
  assert.ok(Array.isArray(desk.steps));
  const stepIds = new Set();
  const questions = desk.steps.flatMap(({ id, title, questions }) => {
    assertText(id);
    assertText(title);
    assert.ok(!stepIds.has(id), `Duplicate step ID: ${id}`);
    stepIds.add(id);
    assert.ok(Array.isArray(questions) && questions.length > 0);
    return questions.map(({ id, kind, fills, label, required }) => {
      assertText(label);
      assert.equal(required, true);
      return [id, kind, fills];
    });
  });
  assert.deepEqual(questions, [
    ['product-folder', 'folder', 'productFolder'],
    ['app-window', 'text', 'appWindow'],
    ['networks', 'text', 'networks'],
    ['account-handle', 'text', 'accountHandle'],
  ]);
});
