import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { canModifyTask, canCompleteTask } from '../lib/services/task-modify-guard';

describe('Task Modify Guard', () => {
  test('can modify pending task', () => {
    assert.ok(canModifyTask({ status: 'pending' }));
    assert.ok(canModifyTask({ status: 'in_progress' }));
    assert.ok(canModifyTask({ status: 'cancelled' }));
  });

  test('cannot modify completed task', () => {
    assert.ok(!canModifyTask({ status: 'completed' }));
  });

  test('cannot modify deleted task regardless of status', () => {
    assert.ok(!canModifyTask({ status: 'pending', is_deleted: true }));
    assert.ok(!canModifyTask({ status: 'in_progress', is_deleted: true }));
    assert.ok(!canModifyTask({ status: 'completed', is_deleted: true }));
  });

  test('can modify non-billable task', () => {
    const r = canCompleteTask({ status: 'in_progress', is_billable: false });
    assert.ok(r.ok);
  });

  test('can complete billable task with bill reference', () => {
    const r = canCompleteTask({ status: 'in_progress', is_billable: true, bill_reference: 'INV-001' });
    assert.ok(r.ok);
  });

  test('cannot complete billable task without bill reference', () => {
    const r = canCompleteTask({ status: 'in_progress', is_billable: true, bill_reference: null });
    assert.ok(!r.ok);
    if (!r.ok) assert.equal(r.reason, 'Billable tasks require a bill reference before completion');
  });

  test('cannot complete already-completed task', () => {
    const r = canCompleteTask({ status: 'completed' });
    assert.ok(!r.ok);
    if (!r.ok) assert.equal(r.reason, 'Task is already completed');
  });
});
