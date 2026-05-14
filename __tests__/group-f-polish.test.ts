import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { computeProjectedTax, advanceTaxSchedule } from '../lib/services/tax-projection-pure';
import { getClientVisibleStatus, CLIENT_VISIBLE_LABELS } from '../lib/services/client-visible-status';
import { canTransition, nextStatuses } from '../lib/services/task-transitions';

describe('Tax Projection Pure', () => {
  test('zero income yields zero tax', () => {
    const t = computeProjectedTax(0, 0);
    assert.equal(t.taxable_income, 0);
    assert.equal(t.tax, 0);
  });

  test('tax below 3L exemption is zero', () => {
    const t = computeProjectedTax(250000, 0);
    assert.equal(t.tax, 0);
  });

  test('tax at 9L taxable income', () => {
    // taxable = 900000
    // 300000 @ 0% = 0
    // 300000 @ 5% = 15000
    // 300000 @ 10% = 30000
    // total = 45000 * 1.04 = 46800
    const t = computeProjectedTax(900000, 0);
    assert.equal(t.taxable_income, 900000);
    assert.equal(t.tax, 46800);
  });

  test('deductions reduce taxable income', () => {
    const t = computeProjectedTax(1000000, 150000);
    assert.equal(t.taxable_income, 850000);
  });

  test('advance tax schedule sums to total tax', () => {
    const t = computeProjectedTax(1500000, 0);
    const sched = advanceTaxSchedule(t.tax);
    assert.equal(sched.length, 4);
    assert.equal(sched[3].amount, t.tax);
    assert.ok(sched[0].amount <= sched[1].amount);
    assert.ok(sched[1].amount <= sched[2].amount);
    assert.ok(sched[2].amount <= sched[3].amount);
  });
});

describe('Client Visible Status', () => {
  test('pending maps to scheduled', () => {
    const s = getClientVisibleStatus({ status: 'pending' });
    assert.equal(s, 'scheduled');
    assert.equal(CLIENT_VISIBLE_LABELS[s], 'Scheduled');
  });

  test('in_progress maps to in_progress', () => {
    const s = getClientVisibleStatus({ status: 'in_progress' });
    assert.equal(s, 'in_progress');
    assert.equal(CLIENT_VISIBLE_LABELS[s], 'In Progress');
  });

  test('review maps to under_review', () => {
    const s = getClientVisibleStatus({ status: 'review' });
    assert.equal(s, 'under_review');
    assert.equal(CLIENT_VISIBLE_LABELS[s], 'Under Review');
  });

  test('completed maps to done', () => {
    const s = getClientVisibleStatus({ status: 'completed' });
    assert.equal(s, 'done');
    assert.equal(CLIENT_VISIBLE_LABELS[s], 'Done');
  });

  test('blocked_on_client maps to we_need_info', () => {
    const s = getClientVisibleStatus({ status: 'in_progress', is_blocked_on_client: true });
    assert.equal(s, 'we_need_info');
    assert.equal(CLIENT_VISIBLE_LABELS[s], 'We Need Information from You');
  });

  test('is_stuck overrides everything', () => {
    const s = getClientVisibleStatus({ status: 'completed', is_stuck: true });
    assert.equal(s, 'on_hold');
    assert.equal(CLIENT_VISIBLE_LABELS[s], 'On Hold');
  });

  test('cancelled maps to cancelled', () => {
    const s = getClientVisibleStatus({ status: 'cancelled' });
    assert.equal(s, 'cancelled');
    assert.equal(CLIENT_VISIBLE_LABELS[s], 'Cancelled');
  });
});

describe('Task Transitions', () => {
  test('pending can move to in_progress and cancelled', () => {
    assert.ok(canTransition('pending', 'in_progress'));
    assert.ok(canTransition('pending', 'cancelled'));
    assert.ok(!canTransition('pending', 'completed'));
  });

  test('in_progress can move to completed, cancelled, or back to pending', () => {
    assert.ok(canTransition('in_progress', 'completed'));
    assert.ok(canTransition('in_progress', 'cancelled'));
    assert.ok(canTransition('in_progress', 'pending'));
  });

  test('completed is terminal', () => {
    assert.deepEqual(nextStatuses('completed'), []);
    assert.ok(!canTransition('completed', 'pending'));
    assert.ok(!canTransition('completed', 'in_progress'));
  });

  test('cancelled can be reopened to pending', () => {
    assert.ok(canTransition('cancelled', 'pending'));
    assert.ok(!canTransition('cancelled', 'in_progress'));
    assert.ok(!canTransition('cancelled', 'completed'));
  });

  test('nextStatuses returns correct arrays', () => {
    assert.deepEqual(nextStatuses('pending'), ['in_progress', 'cancelled']);
    assert.deepEqual(nextStatuses('in_progress'), ['completed', 'cancelled', 'pending']);
    assert.deepEqual(nextStatuses('completed'), []);
    assert.deepEqual(nextStatuses('cancelled'), ['pending']);
  });
});
