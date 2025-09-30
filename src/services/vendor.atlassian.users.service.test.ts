import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import atlassianUsersService from './vendor.atlassian.users.service.js';
import * as transportUtil from '../utils/transport.util.js';

// Mock the transport utilities
jest.mock('../utils/transport.util.js', () => ({
	fetchAtlassian: jest.fn(),
	getAtlassianCredentials: jest.fn(),
}));

const mockedGetCredentials = transportUtil.getAtlassianCredentials as jest.MockedFunction<typeof transportUtil.getAtlassianCredentials>;
const mockedFetchAtlassian = transportUtil.fetchAtlassian as jest.MockedFunction<typeof transportUtil.fetchAtlassian>;

describe('vendor.atlassian.users.service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Clear the cache before each test
		atlassianUsersService.clearUserCache();
	});

	describe('isAccountId', () => {
		it('should identify valid account IDs', () => {
			expect(atlassianUsersService.isAccountId('557058:12345678-1234-1234-1234-123456789abc')).toBe(true);
			expect(atlassianUsersService.isAccountId('5bc73a:abcdef12-3456-7890-abcd-ef1234567890')).toBe(true);
			expect(atlassianUsersService.isAccountId('12345678-1234-1234-1234-123456789abc')).toBe(true);
		});

		it('should reject invalid account IDs', () => {
			expect(atlassianUsersService.isAccountId('john.doe@example.com')).toBe(false);
			expect(atlassianUsersService.isAccountId('johndoe')).toBe(false);
			expect(atlassianUsersService.isAccountId('John Doe')).toBe(false);
			expect(atlassianUsersService.isAccountId('')).toBe(false);
		});
	});

	describe('isEmail', () => {
		it('should identify valid email addresses', () => {
			expect(atlassianUsersService.isEmail('john.doe@example.com')).toBe(true);
			expect(atlassianUsersService.isEmail('user+tag@domain.co.uk')).toBe(true);
			expect(atlassianUsersService.isEmail('test.email@sub.domain.org')).toBe(true);
		});

		it('should reject invalid email addresses', () => {
			expect(atlassianUsersService.isEmail('johndoe')).toBe(false);
			expect(atlassianUsersService.isEmail('John Doe')).toBe(false);
			expect(atlassianUsersService.isEmail('557058:12345678')).toBe(false);
			expect(atlassianUsersService.isEmail('@example.com')).toBe(false);
			expect(atlassianUsersService.isEmail('user@')).toBe(false);
			expect(atlassianUsersService.isEmail('')).toBe(false);
		});
	});

	describe('searchUsersWithPicker', () => {
		it('should search users using the picker endpoint', async () => {
			const mockCredentials = {
				siteName: 'test',
				userEmail: 'admin@example.com',
				apiToken: 'test-token',
			};
			const mockResponse = {
				users: {
					users: [
						{
							accountId: '557058:user-id-123',
							emailAddress: 'john.doe@example.com',
							displayName: 'John Doe',
							active: true,
						},
					],
					total: 1,
				},
			};

			mockedGetCredentials.mockReturnValue(mockCredentials);
			mockedFetchAtlassian.mockResolvedValue(mockResponse);

			const result = await atlassianUsersService.searchUsersWithPicker('john.doe@example.com');

			expect(result).toEqual(mockResponse.users.users);
			expect(transportUtil.fetchAtlassian).toHaveBeenCalledWith(
				mockCredentials,
				'/rest/api/3/groupuserpicker?query=john.doe%40example.com&maxResults=10&showAvatar=false',
			);
		});

		it('should return null on error', async () => {
			const mockCredentials = {
				siteName: 'test',
				userEmail: 'admin@example.com',
				apiToken: 'test-token',
			};

			mockedGetCredentials.mockReturnValue(mockCredentials);
			mockedFetchAtlassian.mockRejectedValue(new Error('Network error'));

			const result = await atlassianUsersService.searchUsersWithPicker('john.doe@example.com');

			expect(result).toBeNull();
		});
	});

	describe('searchUsers', () => {
		it('should search users using the search endpoint', async () => {
			const mockCredentials = {
				siteName: 'test',
				userEmail: 'admin@example.com',
				apiToken: 'test-token',
			};
			const mockResponse = [
				{
					accountId: '557058:user-id-123',
					emailAddress: 'john.doe@example.com',
					displayName: 'John Doe',
					name: 'johndoe',
					active: true,
				},
			];

			mockedGetCredentials.mockReturnValue(mockCredentials);
			mockedFetchAtlassian.mockResolvedValue(mockResponse);

			const result = await atlassianUsersService.searchUsers('John Doe');

			expect(result).toEqual(mockResponse);
			expect(transportUtil.fetchAtlassian).toHaveBeenCalledWith(
				mockCredentials,
				'/rest/api/3/user/search?query=John%20Doe&maxResults=10',
			);
		});
	});

	describe('resolveUserIdentifier', () => {
		it('should return the identifier if it is already an accountId', async () => {
			const accountId = '557058:user-id-123';
			const result = await atlassianUsersService.resolveUserIdentifier(accountId);
			expect(result).toBe(accountId);
		});

		it('should resolve email to accountId using picker', async () => {
			const mockCredentials = {
				siteName: 'test',
				userEmail: 'admin@example.com',
				apiToken: 'test-token',
			};
			const mockResponse = {
				users: {
					users: [
						{
							accountId: '557058:user-id-123',
							emailAddress: 'john.doe@example.com',
							displayName: 'John Doe',
							active: true,
						},
					],
					total: 1,
				},
			};

			mockedGetCredentials.mockReturnValue(mockCredentials);
			mockedFetchAtlassian.mockResolvedValue(mockResponse);

			const result = await atlassianUsersService.resolveUserIdentifier('john.doe@example.com');
			expect(result).toBe('557058:user-id-123');
		});

		it('should resolve username to accountId using search', async () => {
			const mockCredentials = {
				siteName: 'test',
				userEmail: 'admin@example.com',
				apiToken: 'test-token',
			};
			const mockSearchResponse = [
				{
					accountId: '557058:user-id-456',
					name: 'johndoe',
					displayName: 'John Doe',
					active: true,
				},
			];

			mockedGetCredentials.mockReturnValue(mockCredentials);
			// First call will be to searchUsers
			mockedFetchAtlassian.mockResolvedValue(mockSearchResponse);

			const result = await atlassianUsersService.resolveUserIdentifier('johndoe');
			expect(result).toBe('557058:user-id-456');
		});

		it('should use cache for repeated lookups', async () => {
			const mockCredentials = {
				siteName: 'test',
				userEmail: 'admin@example.com',
				apiToken: 'test-token',
			};
			const mockResponse = {
				users: {
					users: [
						{
							accountId: '557058:cached-user',
							emailAddress: 'cached@example.com',
							displayName: 'Cached User',
							active: true,
						},
					],
					total: 1,
				},
			};

			mockedGetCredentials.mockReturnValue(mockCredentials);
			mockedFetchAtlassian.mockResolvedValue(mockResponse);

			// First call - should hit the API
			const result1 = await atlassianUsersService.resolveUserIdentifier('cached@example.com');
			expect(result1).toBe('557058:cached-user');
			expect(transportUtil.fetchAtlassian).toHaveBeenCalledTimes(1);

			// Second call - should use cache
			const result2 = await atlassianUsersService.resolveUserIdentifier('cached@example.com');
			expect(result2).toBe('557058:cached-user');
			expect(transportUtil.fetchAtlassian).toHaveBeenCalledTimes(1); // Still only 1 call
		});

		it('should return null if user not found', async () => {
			const mockCredentials = {
				siteName: 'test',
				userEmail: 'admin@example.com',
				apiToken: 'test-token',
			};

			mockedGetCredentials.mockReturnValue(mockCredentials);
			// Return empty results for all search attempts
			mockedFetchAtlassian
				.mockResolvedValueOnce([]) // searchUsers
				.mockResolvedValueOnce({ users: { users: [], total: 0 } }); // searchUsersWithPicker

			const result = await atlassianUsersService.resolveUserIdentifier('nonexistent@example.com');
			expect(result).toBeNull();
		});

		it('should return null for empty identifier', async () => {
			const result = await atlassianUsersService.resolveUserIdentifier('');
			expect(result).toBeNull();
		});
	});

	describe('clearUserCache', () => {
		it('should clear the user cache', async () => {
			const mockCredentials = {
				siteName: 'test',
				userEmail: 'admin@example.com',
				apiToken: 'test-token',
			};
			const mockResponse = {
				users: {
					users: [
						{
							accountId: '557058:cache-test',
							emailAddress: 'cache.test@example.com',
							displayName: 'Cache Test',
							active: true,
						},
					],
					total: 1,
				},
			};

			mockedGetCredentials.mockReturnValue(mockCredentials);
			mockedFetchAtlassian.mockResolvedValue(mockResponse);

			// First call - should hit the API
			await atlassianUsersService.resolveUserIdentifier('cache.test@example.com');
			expect(transportUtil.fetchAtlassian).toHaveBeenCalledTimes(1);

			// Clear cache
			atlassianUsersService.clearUserCache();

			// Second call - should hit the API again since cache was cleared
			await atlassianUsersService.resolveUserIdentifier('cache.test@example.com');
			expect(transportUtil.fetchAtlassian).toHaveBeenCalledTimes(2);
		});
	});
});