import { describe, expect, it } from 'bun:test';
import { timeAgo, formatTime, formatDate, isSameDay, dayLabel, formatBytes } from './time';

describe('time utilities', () => {
	it('timeAgo formats recent timestamps correctly', () => {
		const now = Date.now();
		expect(timeAgo(new Date(now - 10000))).toBe('now');
		expect(timeAgo(new Date(now - 60000))).toBe('1m ago');
		expect(timeAgo(new Date(now - 3600000))).toBe('1h ago');
		expect(timeAgo(new Date(now - 86400000))).toBe('1d ago');
		expect(timeAgo(new Date(now - 10000).toISOString())).toBe('now');
		expect(timeAgo(new Date(now - 120000).toISOString())).toBe('2m ago');
	});

	it('formatTime formats time string correctly', () => {
		const date = new Date('2025-01-01T12:00:00Z');
		expect(typeof formatTime(date)).toBe('string');
		expect(typeof formatTime('2025-01-01T12:00:00Z')).toBe('string');
	});

	it('formatDate formats date string correctly', () => {
		const date = new Date('2025-01-01T12:00:00Z');
		expect(formatDate(date)).toContain('2025');
		expect(formatDate('2025-01-01T12:00:00Z')).toContain('2025');
	});

	it('isSameDay correctly identifies matching days', () => {
		const d1 = new Date('2025-05-10T10:00:00Z');
		const d2 = new Date('2025-05-10T22:00:00Z');
		const d3 = new Date('2025-05-11T10:00:00Z');
		expect(isSameDay(d1, d2)).toBe(true);
		expect(isSameDay(d1, d3)).toBe(false);
		expect(isSameDay('2025-05-10T10:00:00Z', '2025-05-10T22:00:00Z')).toBe(true);
	});

	it('dayLabel returns Today, Yesterday or formatDate', () => {
		const today = new Date();
		const yesterday = new Date(Date.now() - 86400000);
		const oldDate = new Date('2020-01-01T10:00:00Z');

		expect(dayLabel(today)).toBe('Today');
		expect(dayLabel(yesterday)).toBe('Yesterday');
		expect(dayLabel(oldDate)).toContain('2020');
	});

	it('formatBytes formats bytes sizes correctly', () => {
		expect(formatBytes(0)).toBe('0 B');
		expect(formatBytes(1024)).toBe('1 KB');
		expect(formatBytes(1048576)).toBe('1 MB');
		expect(formatBytes(1073741824)).toBe('1 GB');
	});
});
