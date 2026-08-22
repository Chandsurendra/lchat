import { describe, test, expect } from 'bun:test';
import { loginSchema } from './auth';

describe('loginSchema', () => {
	test('should accept valid email and password', () => {
		const res = loginSchema.safeParse({
			email: 'user@example.com',
			password: 'password123'
		});
		expect(res.success).toBe(true);
	});

	test('should accept password up to 72 characters', () => {
		const password72 = 'a'.repeat(72);
		const res = loginSchema.safeParse({
			email: 'user@example.com',
			password: password72
		});
		expect(res.success).toBe(true);
	});

	test('should reject password longer than 72 characters to prevent Bcrypt CPU DoS', () => {
		const password73 = 'a'.repeat(73);
		const res = loginSchema.safeParse({
			email: 'user@example.com',
			password: password73
		});
		expect(res.success).toBe(false);
		if (!res.success) {
			expect(res.error.issues[0]?.message).toBe('Password must be under 72 characters');
		}
	});

	test('should reject empty password', () => {
		const res = loginSchema.safeParse({
			email: 'user@example.com',
			password: ''
		});
		expect(res.success).toBe(false);
	});
});
