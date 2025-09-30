import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import { createAuthMissingError } from '../utils/error.util.js';
import { z } from 'zod';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.atlassian.users.service.ts',
);

// User search response types
const UserSchema = z.object({
	accountId: z.string(),
	accountType: z.string().optional(),
	emailAddress: z.string().optional(),
	displayName: z.string().optional(),
	name: z.string().optional(),
	avatarUrls: z
		.object({
			'48x48': z.string().optional(),
			'24x24': z.string().optional(),
			'16x16': z.string().optional(),
			'32x32': z.string().optional(),
		})
		.optional(),
	active: z.boolean().optional(),
});

const GroupUserPickerResponseSchema = z.object({
	users: z
		.object({
			users: z.array(UserSchema),
			total: z.number(),
		})
		.optional(),
	groups: z
		.object({
			groups: z.array(z.any()),
			total: z.number(),
		})
		.optional(),
});

type User = z.infer<typeof UserSchema>;
type GroupUserPickerResponse = z.infer<typeof GroupUserPickerResponseSchema>;

// Simple in-memory cache for user lookups
class UserCache {
	private cache: Map<string, { accountId: string; timestamp: number }> =
		new Map();
	private readonly TTL = 1000 * 60 * 60; // 1 hour TTL

	get(identifier: string): string | null {
		const cached = this.cache.get(identifier.toLowerCase());
		if (cached && Date.now() - cached.timestamp < this.TTL) {
			serviceLogger.debug(`Cache hit for user: ${identifier}`);
			return cached.accountId;
		}
		if (cached) {
			// Clean up expired entry
			this.cache.delete(identifier.toLowerCase());
		}
		return null;
	}

	set(identifier: string, accountId: string): void {
		this.cache.set(identifier.toLowerCase(), {
			accountId,
			timestamp: Date.now(),
		});
		serviceLogger.debug(`Cached user: ${identifier} -> ${accountId}`);
	}

	clear(): void {
		this.cache.clear();
		serviceLogger.debug('User cache cleared');
	}
}

const userCache = new UserCache();

/**
 * Search for users using the group/user picker endpoint
 * This endpoint is more reliable for email searches
 * @param query Email, username, or partial match
 * @returns Array of matching users
 */
async function searchUsersWithPicker(
	query: string,
): Promise<User[] | null> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.users.service.ts',
		'searchUsersWithPicker',
	);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw createAuthMissingError('user search');
		}

		const encodedQuery = encodeURIComponent(query);
		const requestPath = `/rest/api/3/groupuserpicker?query=${encodedQuery}&maxResults=10&showAvatar=false`;

		methodLogger.debug(`Searching users with picker for: ${query}`);

		const response = await fetchAtlassian<GroupUserPickerResponse>(
			credentials,
			requestPath,
		);

		methodLogger.debug(
			`Found ${response.users?.users?.length || 0} users`,
		);

		return response.users?.users || null;
	} catch (error) {
		methodLogger.error('Failed to search users with picker:', error);
		return null;
	}
}

/**
 * Search for users using the user search endpoint
 * Requires "Browse users and groups" permission
 * @param query Email, username, or display name
 * @returns Array of matching users
 */
async function searchUsers(query: string): Promise<User[] | null> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.users.service.ts',
		'searchUsers',
	);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw createAuthMissingError('user search');
		}

		const encodedQuery = encodeURIComponent(query);
		const requestPath = `/rest/api/3/user/search?query=${encodedQuery}&maxResults=10`;

		methodLogger.debug(`Searching users for: ${query}`);

		const response = await fetchAtlassian<User[]>(
			credentials,
			requestPath,
		);

		methodLogger.debug(`Found ${response.length} users`);

		return response;
	} catch (error) {
		methodLogger.error('Failed to search users:', error);
		return null;
	}
}

/**
 * Check if a string looks like an accountId
 * AccountIds typically follow pattern like "557058:..." or similar
 * @param identifier String to check
 * @returns True if it looks like an accountId
 */
function isAccountId(identifier: string): boolean {
	// Common patterns for Jira Cloud accountIds
	return /^[0-9a-f]{6}:/.test(identifier) || /^[0-9a-f-]{36}$/.test(identifier);
}

/**
 * Check if a string is an email address
 * @param identifier String to check
 * @returns True if it's an email
 */
function isEmail(identifier: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

/**
 * Resolve a user identifier (email, username, or accountId) to an accountId
 * @param identifier Email, username, or accountId
 * @returns AccountId or null if not found
 */
async function resolveUserIdentifier(
	identifier: string,
): Promise<string | null> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.users.service.ts',
		'resolveUserIdentifier',
	);

	if (!identifier) {
		return null;
	}

	// Check if it's already an accountId
	if (isAccountId(identifier)) {
		methodLogger.debug(`Identifier is already an accountId: ${identifier}`);
		return identifier;
	}

	// Check cache first
	const cached = userCache.get(identifier);
	if (cached) {
		return cached;
	}

	methodLogger.debug(`Resolving user identifier: ${identifier}`);

	// Try different search methods
	let users: User[] | null = null;

	// If it's an email, use the picker endpoint (more reliable for emails)
	if (isEmail(identifier)) {
		users = await searchUsersWithPicker(identifier);
	}

	// If no results or not an email, try the general search
	if (!users || users.length === 0) {
		users = await searchUsers(identifier);
	}

	// If still no results, try the picker as a fallback
	if (!users || users.length === 0) {
		users = await searchUsersWithPicker(identifier);
	}

	if (users && users.length > 0) {
		// Find exact match if possible
		let user = users.find(
			(u) =>
				u.emailAddress?.toLowerCase() === identifier.toLowerCase() ||
				u.name?.toLowerCase() === identifier.toLowerCase() ||
				u.displayName?.toLowerCase() === identifier.toLowerCase(),
		);

		// If no exact match, take the first result
		if (!user) {
			user = users[0];
		}

		if (user?.accountId) {
			// Cache the result
			userCache.set(identifier, user.accountId);
			methodLogger.debug(`Resolved to accountId: ${user.accountId}`);
			return user.accountId;
		}
	}

	methodLogger.warn(`Could not resolve user identifier: ${identifier}`);
	return null;
}

/**
 * Clear the user cache
 */
function clearUserCache(): void {
	userCache.clear();
}

// Log service initialization
serviceLogger.debug('Jira users service initialized');

export default {
	searchUsersWithPicker,
	searchUsers,
	resolveUserIdentifier,
	isAccountId,
	isEmail,
	clearUserCache,
};