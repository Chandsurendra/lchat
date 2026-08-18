import { z } from 'zod';
import { USERNAME_REGEX } from '#lib/utils/constants';

export const emailSchema = z.string().email('Enter a valid email address');
export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(72, 'Password must be under 72 characters');

export const loginSchema = z.object({
	email: emailSchema,
	password: z
		.string()
		.min(1, 'Password is required')
		.max(72, 'Password must be under 72 characters')
});

export const registerSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	username: z
		.string()
		.regex(USERNAME_REGEX, 'Username must be 3-20 chars: letters, numbers, underscores'),
	displayName: z.string().min(1, 'Display name is required').max(40)
});

export const profileSchema = z.object({
	username: z
		.string()
		.regex(USERNAME_REGEX, 'Username must be 3-20 chars: letters, numbers, underscores'),
	displayName: z.string().min(1, 'Display name is required').max(40),
	bio: z.string().max(160, 'Bio must be under 160 characters').optional()
});

export function firstError(error: unknown): string {
	if (error instanceof z.ZodError) {
		return error.issues[0]?.message ?? 'Invalid input';
	}
	return error instanceof Error ? error.message : 'Something went wrong';
}
