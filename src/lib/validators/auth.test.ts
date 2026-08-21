import { describe, expect, it } from 'bun:test';
import { loginSchema, registerSchema } from './auth';

describe('auth validators', () => {
	it('accepts valid login credentials', () => {
		const result = loginSchema.safeParse({
			email: 'user@example.com',
			password: 'validPassword123'
		});
		expect(result.success).toBe(true);
	});

	it('rejects login passwords exceeding 72 characters', () => {
		const longPassword = 'a'.repeat(73);
		const result = loginSchema.safeParse({
			email: 'user@example.com',
			password: longPassword
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Password must be under 72 characters');
		}
	});

	it('rejects register passwords exceeding 72 characters', () => {
		const longPassword = 'a'.repeat(73);
		const result = registerSchema.safeParse({
			email: 'user@example.com',
			password: longPassword,
			username: 'user_123',
			displayName: 'User'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Password must be under 72 characters');
		}
	});
});
