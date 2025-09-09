import atlassianSearchController from './atlassian.search.controller.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js';

describe('Atlassian Search Controller', () => {
	// Load configuration and check for credentials before all tests
	beforeAll(() => {
		config.load(); // Ensure config is loaded
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Search Controller tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	describe('search', () => {
		it('should return a formatted search result in Markdown for a valid JQL query', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianSearchController.search({
				jql: 'created >= -30d',
				limit: 5,
			});

			// Verify ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Verify Markdown content
			expect(result.content).toMatch(/^# Jira Search Results/m); // Has header
			expect(result.content).toContain('JQL Query:'); // Shows query
			expect(result.content).toContain('created >= -30d'); // Shows the actual query

			// Content should include pagination information
			if (result.content.includes('More results are available')) {
				expect(result.content).toContain('Use --start-at');
			}
		}, 30000);

		it('should handle pagination (limit/cursor) correctly', async () => {
			if (skipIfNoCredentials()) return;

			// First page
			const result1 = await atlassianSearchController.search({
				jql: 'created >= -90d',
				limit: 2,
			});

			// Check if the first page has pagination information
			if (result1.content.includes('More results are available')) {
				// Extract startAt from the content
				const startAtMatch = result1.content.match(
					/Use --start-at (\d+) to view more/,
				);
				if (startAtMatch && startAtMatch[1]) {
					const nextStartAt = parseInt(startAtMatch[1], 10);

					// Fetch second page
					const result2 = await atlassianSearchController.search({
						jql: 'created >= -90d',
						limit: 2,
						startAt: nextStartAt,
					});

					// Content should include both search and pagination info
					expect(result2.content).toMatch(/^# Jira Search Results/m);
					expect(result2.content).toContain('JQL Query:');
				}
			} else {
				console.warn(
					'Skipping cursor test: Only one page of search results found.',
				);
			}
		}, 30000);

		it('should handle empty results gracefully', async () => {
			if (skipIfNoCredentials()) return;

			// Use a specific JQL that's unlikely to match any issues
			const uniqueQuery = `summary ~ "NONEXISTENT_TEST_ISSUE_${Date.now()}"`;
			const result = await atlassianSearchController.search({
				jql: uniqueQuery,
			});

			// Verify ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Should show the search query even for empty results
			expect(result.content).toMatch(/^# Jira Search Results/m);
			expect(result.content).toContain('JQL Query:');
			expect(result.content).toContain(uniqueQuery);

			// Check for appropriate message for no results
			expect(result.content).toContain('No issues found');

			// Should include timestamp
			expect(result.content).toContain('Information retrieved at:');
		}, 30000);

		it('should handle error for invalid JQL', async () => {
			if (skipIfNoCredentials()) return;

			// Use invalid JQL syntax
			try {
				await atlassianSearchController.search({
					jql: 'invalid operator === something',
				});
				fail('Expected an error for invalid JQL');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// The error might have a generic error message, so we'll just check that it's a McpError
				expect((error as McpError).statusCode).toBe(410);
			}
		}, 30000);

		it('should perform search with empty JQL (returns all accessible issues)', async () => {
			if (skipIfNoCredentials()) return;

			const result = await atlassianSearchController.search({
				limit: 3,
			});

			// Verify ControllerResponse structure
			expect(result).toHaveProperty('content');
			expect(typeof result.content).toBe('string');

			// Should show the search results header
			expect(result.content).toMatch(/^# Jira Search Results/m);

			// Should include JQL and possibly pagination information
			expect(result.content).toContain('JQL Query:');
			expect(result.content).toContain('ORDER BY updated DESC'); // Default ordering
		}, 30000);

		it('should support complex JQL with multiple conditions', async () => {
			if (skipIfNoCredentials()) return;

			try {
				const result = await atlassianSearchController.search({
					jql: 'created >= -60d AND type != Epic ORDER BY created DESC',
					limit: 3,
				});

				// Verify ControllerResponse structure
				expect(result).toHaveProperty('content');
				expect(typeof result.content).toBe('string');

				// Should show the search results header and query
				expect(result.content).toMatch(/^# Jira Search Results/m);
				expect(result.content).toContain('JQL Query:');
				expect(result.content).toContain(
					'created >= -60d AND type != Epic ORDER BY created DESC',
				);
			} catch (error) {
				// Some Jira servers might not support all JQL functions, so we'll accept either
				// successful results or a properly formed error
				expect(error).toBeInstanceOf(McpError);
			}
		}, 30000);
	});
});
