import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateToYmd,
  getRelativeYmd,
  isDeadlineExpired,
  categorizeGovtOrder,
  matchesSearchQuery,
  filterGovtOrders,
  getGovtOrderCounts,
  acknowledgeGovtOrder,
  unacknowledgeGovtOrder,
  convertGovtOrderToTask,
  createGovtOrder,
  getSampleGovtOrders,
} from './govtOrdersManager';
import { GovtOrder } from '../types/govtOrder';

describe('Govt Orders Manager - Pure Business Logic', () => {
  const baseNow = new Date('2026-10-30T10:00:00.000Z');

  const createDummyOrder = (overrides: Partial<GovtOrder> = {}): GovtOrder => ({
    id: 'test-order-1',
    orderNumber: 'पत्रांक: 1234/2026',
    title: 'निपुण असेसमेंट परीक्षा निर्देश / NIPUN Guidelines',
    date: '2026-10-30',
    issuingOffice: 'BSA Office Lucknow',
    deadline: '2026-11-05',
    priority: 'high',
    summary: 'सभी विद्यालयों में निपुण तालिका अद्यतन करें। Complete NIPUN tracker.',
    acknowledgementRequired: true,
    isAcknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
    linkedTaskIds: [],
    isRead: false,
    tags: ['NIPUN', 'निपुण'],
    createdAt: '2026-10-30T08:00:00.000Z',
    updatedAt: '2026-10-30T08:00:00.000Z',
    ...overrides,
  });

  describe('Date Helpers & Expired Check', () => {
    it('correctly checks if deadline is expired', () => {
      assert.equal(isDeadlineExpired('2026-10-25', baseNow), true);
      assert.equal(isDeadlineExpired('2026-11-05', baseNow), false);
      assert.equal(isDeadlineExpired('2026-10-30', baseNow), false); // Today is not expired
      assert.equal(isDeadlineExpired(null, baseNow), false);
      assert.equal(isDeadlineExpired(undefined, baseNow), false);
    });

    it('formats dates consistently', () => {
      const d = new Date('2026-10-30T00:00:00.000Z');
      assert.equal(formatDateToYmd(d), '2026-10-30');
      assert.equal(getRelativeYmd(5, d), '2026-11-04');
      assert.equal(getRelativeYmd(-5, d), '2026-10-25');
    });
  });

  describe('Categorization Logic', () => {
    it('marks recent unacknowledged order as new and action needed', () => {
      const order = createDummyOrder({
        date: '2026-10-30',
        deadline: '2026-11-05',
        isAcknowledged: false,
      });

      const cats = categorizeGovtOrder(order, baseNow);
      assert.equal(cats.isNew, true);
      assert.equal(cats.isActionNeeded, true);
      assert.equal(cats.isAcknowledged, false);
      assert.equal(cats.isExpired, false);
    });

    it('identifies expired orders where deadline has passed', () => {
      const order = createDummyOrder({
        date: '2026-10-15',
        deadline: '2026-10-20',
        isAcknowledged: false,
      });

      const cats = categorizeGovtOrder(order, baseNow);
      assert.equal(cats.isExpired, true);
      assert.equal(cats.isActionNeeded, false);
      assert.equal(cats.isNew, false);
    });

    it('identifies acknowledged orders', () => {
      const order = createDummyOrder({
        isAcknowledged: true,
        acknowledgedAt: '2026-10-30 09:00',
        acknowledgedBy: 'शिक्षक जी',
      });

      const cats = categorizeGovtOrder(order, baseNow);
      assert.equal(cats.isAcknowledged, true);
    });
  });

  describe('Search & Bilingual Keyword Matching', () => {
    it('matches Hindi and English keywords across various fields', () => {
      const order = createDummyOrder();

      // Title in Hindi
      assert.equal(matchesSearchQuery(order, 'निपुण'), true);
      // Title in English
      assert.equal(matchesSearchQuery(order, 'nipun'), true);
      assert.equal(matchesSearchQuery(order, 'guidelines'), true);
      // Order number
      assert.equal(matchesSearchQuery(order, '1234'), true);
      // Issuing office
      assert.equal(matchesSearchQuery(order, 'lucknow'), true);
      assert.equal(matchesSearchQuery(order, 'BSA'), true);
      // Summary text
      assert.equal(matchesSearchQuery(order, 'तालिका'), true);
      assert.equal(matchesSearchQuery(order, 'tracker'), true);
      // Non-existent
      assert.equal(matchesSearchQuery(order, 'xyz9999nonexistent'), false);
    });

    it('returns true when query is empty or spaces', () => {
      const order = createDummyOrder();
      assert.equal(matchesSearchQuery(order, ''), true);
      assert.equal(matchesSearchQuery(order, '   '), true);
    });
  });

  describe('Filter & Counts', () => {
    const sampleOrders = getSampleGovtOrders(baseNow);

    it('calculates counts accurately for all categories', () => {
      const counts = getGovtOrderCounts(sampleOrders, baseNow);
      assert.equal(counts.all, sampleOrders.length);
      assert.ok(counts.new > 0, 'Should have new orders');
      assert.ok(counts.action_needed > 0, 'Should have action needed orders');
      assert.ok(counts.acknowledged > 0, 'Should have acknowledged orders');
      assert.ok(counts.expired > 0, 'Should have expired orders');
    });

    it('filters correctly by tab', () => {
      const newOrders = filterGovtOrders(sampleOrders, { filter: 'new', now: baseNow });
      const ackOrders = filterGovtOrders(sampleOrders, { filter: 'acknowledged', now: baseNow });
      const expOrders = filterGovtOrders(sampleOrders, { filter: 'expired', now: baseNow });
      const actionOrders = filterGovtOrders(sampleOrders, { filter: 'action_needed', now: baseNow });

      newOrders.forEach((o) => {
        const c = categorizeGovtOrder(o, baseNow);
        assert.equal(c.isNew, true);
      });

      ackOrders.forEach((o) => {
        assert.equal(o.isAcknowledged, true);
      });

      expOrders.forEach((o) => {
        const c = categorizeGovtOrder(o, baseNow);
        assert.equal(c.isExpired, true);
      });

      actionOrders.forEach((o) => {
        const c = categorizeGovtOrder(o, baseNow);
        assert.equal(c.isActionNeeded, true);
      });
    });

    it('filters in combination with search query', () => {
      const filtered = filterGovtOrders(sampleOrders, {
        filter: 'all',
        query: 'DBT',
        now: baseNow,
      });

      assert.ok(filtered.length >= 1);
      assert.ok(filtered.some((o) => o.title.includes('DBT') || o.summary.includes('डीबीटी')));
    });
  });

  describe('Acknowledgement Lifecycle', () => {
    it('acknowledges an order and records timestamp and teacher', () => {
      const order = createDummyOrder({ isAcknowledged: false });
      const acked = acknowledgeGovtOrder(order, 'अनिल कुमार (स०अ०)', '30 Oct 2026, 10:15 AM');

      assert.equal(acked.isAcknowledged, true);
      assert.equal(acked.acknowledgedBy, 'अनिल कुमार (स०अ०)');
      assert.equal(acked.acknowledgedAt, '30 Oct 2026, 10:15 AM');
      assert.equal(acked.isRead, true);
    });

    it('supports reverting / un-acknowledging an order', () => {
      const order = createDummyOrder({
        isAcknowledged: true,
        acknowledgedBy: 'शिक्षक जी',
        acknowledgedAt: '30 Oct 2026',
      });
      const unacked = unacknowledgeGovtOrder(order);

      assert.equal(unacked.isAcknowledged, false);
      assert.equal(unacked.acknowledgedAt, null);
      assert.equal(unacked.acknowledgedBy, null);
    });
  });

  describe('Converting Order to Task', () => {
    it('creates a valid Task conforming to Task Status System and links to order', () => {
      const order = createDummyOrder({
        orderNumber: 'पत्रांक: 8841/2026',
        deadline: '2026-11-10',
        priority: 'high',
      });

      let idCallCount = 0;
      const fakeIdGen = () => `mock-task-id-${++idCallCount}`;

      const { task, updatedOrder } = convertGovtOrderToTask(
        order,
        {
          orderId: order.id,
          title: 'छात्र यूनिफॉर्म डीबीटी क्रय सत्यापन पूर्ण करें',
          description: 'सभी 45 छात्रों के अभिभावक खातों में राशि का सत्यापन',
          deadline: '2026-11-10',
          priority: 'urgent',
          assignedTo: 'अनिल वर्मा',
          recurrence: 'none',
        },
        fakeIdGen
      );

      // Verify task properties
      assert.equal(task.id, 'mock-task-id-1');
      assert.equal(task.title, 'छात्र यूनिफॉर्म डीबीटी क्रय सत्यापन पूर्ण करें');
      assert.equal(task.type, 'govt_order');
      assert.ok(task.source?.includes('पत्रांक: 8841/2026'));
      assert.equal(task.priority, 'urgent');
      assert.equal(task.status, 'not_started');
      assert.equal(task.assignedTo, 'अनिल वर्मा');
      assert.equal(task.recurrence, 'none');

      // Verify order link
      assert.deepEqual(updatedOrder.linkedTaskIds, ['mock-task-id-1']);
    });

    it('accumulates multiple tasks without duplicating existing task IDs', () => {
      const order = createDummyOrder({ linkedTaskIds: ['task-1'] });
      const { updatedOrder } = convertGovtOrderToTask(
        order,
        {
          orderId: order.id,
          title: 'दूसरा कार्य',
        },
        () => 'task-2'
      );

      assert.deepEqual(updatedOrder.linkedTaskIds, ['task-1', 'task-2']);
    });
  });

  describe('Create Order Validation', () => {
    it('creates an order with sensible defaults and generated order number if omitted', () => {
      const newOrder = createGovtOrder({
        title: 'विद्यालय स्वच्छता पखवाड़ा 2026',
        date: '2026-10-30',
        issuingOffice: 'BSA Office Bareilly',
        summary: 'प्रत्येक शनिवार को स्वच्छता अभियान संचालित करें।',
        priority: 'medium',
        acknowledgementRequired: true,
      });

      assert.ok(newOrder.id.startsWith('go-'));
      assert.ok(newOrder.orderNumber.includes('पत्रांक:'));
      assert.equal(newOrder.title, 'विद्यालय स्वच्छता पखवाड़ा 2026');
      assert.equal(newOrder.isAcknowledged, false);
      assert.equal(newOrder.priority, 'medium');
      assert.deepEqual(newOrder.linkedTaskIds, []);
    });
  });
});
