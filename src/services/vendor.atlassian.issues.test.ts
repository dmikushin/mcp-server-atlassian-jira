import atlassianIssuesService from './vendor.atlassian.issues.service.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { config } from '../utils/config.util.js';
import { McpError } from '../utils/error.util.js';

describe('Vendor Atlassian Issues Service', () => {
	// Load configuration and skip all tests if Atlassian credentials are not available
	beforeAll(() => {
		// Load configuration from all sources
		config.load();

		const credentials = getAtlassianCredentials();
		if (!credentials) {
			console.warn(
				'Skipping Atlassian Issues tests: No credentials available',
			);
		}
	});

	// Helper function to skip tests when credentials are missing
	const skipIfNoCredentials = () => !getAtlassianCredentials();

	describe('search', () => {
		it('should return a list of issues', async () => {
			if (skipIfNoCredentials()) return;

			// Call the function with the real API using bounded JQL query
			const result = await atlassianIssuesService.search({
				jql: 'created >= -30d',
				maxResults: 5,
			});

			// Verify the response structure (new API response)
			expect(result).toHaveProperty('issues');
			expect(Array.isArray(result.issues)).toBe(true);
			// New API response structure
			expect(result).toHaveProperty('isLast');
			// nextPageToken is optional (only present if there are more pages)
			if (!result.isLast) {
				expect(result).toHaveProperty('nextPageToken');
			}

			// If issues are returned, verify their structure
			if (result.issues.length > 0) {
				const issue = result.issues[0];
				expect(issue).toHaveProperty('id');
				expect(issue).toHaveProperty('key');
				expect(issue).toHaveProperty('self');
				expect(issue).toHaveProperty('fields');
				expect(issue.fields).toHaveProperty('project');
			}
		}, 30000);

		it('should handle pagination with nextPageToken', async () => {
			if (skipIfNoCredentials()) return;

			// Call the function with pagination parameters and bounded JQL
			const result = await atlassianIssuesService.search({
				jql: 'created >= -30d',
				maxResults: 2,
			});

			// Verify response structure
			expect(result).toHaveProperty('issues');
			expect(result.issues.length).toBeLessThanOrEqual(2);
			expect(result).toHaveProperty('isLast');

			// If there are more pages, test pagination with nextPageToken
			if (!result.isLast && result.nextPageToken) {
				const page2 = await atlassianIssuesService.search({
					jql: 'created >= -30d',
					maxResults: 2,
					nextPageToken: result.nextPageToken,
				});

				expect(page2).toHaveProperty('issues');
				expect(page2.issues.length).toBeLessThanOrEqual(2);

				// If both pages have at least one issue, verify they're different
				if (result.issues.length > 0 && page2.issues.length > 0) {
					expect(result.issues[0].id).not.toBe(page2.issues[0].id);
				}
			}
		}, 30000);

		it('should support searching with simple JQL (project=KEY)', async () => {
			if (skipIfNoCredentials()) return;

			// First, get a list of issues to extract a project key using bounded query
			const initialSearch = await atlassianIssuesService.search({
				jql: 'created >= -30d',
				maxResults: 1,
			});

			if (initialSearch.issues.length === 0) {
				console.warn('Skipping project JQL test: No issues found');
				return;
			}

			// Extract project key from the first issue
			const projectKey = initialSearch.issues[0].fields.project.key;

			// Now search using that project key
			const result = await atlassianIssuesService.search({
				jql: `project = ${projectKey}`,
				maxResults: 5,
			});

			// Verify results
			expect(result).toHaveProperty('issues');
			expect(Array.isArray(result.issues)).toBe(true);

			// Check that all returned issues belong to the specified project
			if (result.issues.length > 0) {
				result.issues.forEach((issue) => {
					expect(issue.fields.project.key).toBe(projectKey);
				});
			}
		}, 30000);

		it('should support complex JQL with multiple conditions', async () => {
			if (skipIfNoCredentials()) return;

			try {
				// Use a more complex JQL with multiple conditions and ORDER BY
				const result = await atlassianIssuesService.search({
					jql: 'created >= -90d AND status != Closed ORDER BY created DESC',
					maxResults: 3,
				});

				// Verify the response structure
				expect(result).toHaveProperty('issues');
				expect(Array.isArray(result.issues)).toBe(true);
				expect(result.issues.length).toBeLessThanOrEqual(3);

				// Check if dates are sorted (if we have multiple issues)
				if (result.issues.length >= 2) {
					const date1 = new Date(
						result.issues[0].fields.created ||
							new Date().toISOString(),
					).getTime();
					const date2 = new Date(
						result.issues[1].fields.created ||
							new Date().toISOString(),
					).getTime();
					expect(date1).toBeGreaterThanOrEqual(date2);
				}
			} catch (error) {
				// Some Jira instances may not support all operators or fields
				// Accept API errors as valid test results
				expect(error).toBeInstanceOf(McpError);
			}
		}, 30000);

		it('should handle AND/OR operators in JQL', async () => {
			if (skipIfNoCredentials()) return;

			try {
				// Use JQL with AND/OR logic
				const result = await atlassianIssuesService.search({
					jql: 'created >= -60d AND (type = Bug OR priority = High)',
					maxResults: 5,
				});

				// Verify the response structure
				expect(result).toHaveProperty('issues');
				expect(Array.isArray(result.issues)).toBe(true);

				// Verify each issue matches the criteria
				if (result.issues.length > 0) {
					result.issues.forEach((issue) => {
						const created = new Date(
							issue.fields.created || new Date().toISOString(),
						);
						const sixtyDaysAgo = new Date();
						sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

						expect(created.getTime()).toBeGreaterThanOrEqual(
							sixtyDaysAgo.getTime(),
						);

						// At least one of these should be true
						const isBug = issue.fields.issuetype?.name === 'Bug';
						const isHighPriority =
							issue.fields.priority?.name === 'High';

						expect(isBug || isHighPriority).toBe(true);
					});
				}
			} catch (error) {
				// Some Jira instances may not support all operators or fields
				// Accept API errors as valid test results
				expect(error).toBeInstanceOf(McpError);
			}
		}, 30000);

		it('should handle requesting specific fields', async () => {
			if (skipIfNoCredentials()) return;

			// Request only specific fields
			const result = await atlassianIssuesService.search({
				jql: 'created >= -30d',
				fields: ['summary', 'status', 'assignee'],
				maxResults: 2,
			});

			// Verify response
			expect(result).toHaveProperty('issues');
			expect(Array.isArray(result.issues)).toBe(true);

			// Check the returned fields for each issue
			if (result.issues.length > 0) {
				result.issues.forEach((issue) => {
					expect(issue.fields).toHaveProperty('summary');
					expect(issue.fields).toHaveProperty('status');
					expect(issue.fields).toHaveProperty('assignee');
				});
			}
		}, 30000);

		it('should throw McpError for invalid JQL syntax', async () => {
			if (skipIfNoCredentials()) return;

			// Use JQL with invalid syntax
			try {
				await atlassianIssuesService.search({
					jql: 'invalid syntax === with incorrect operators',
				});
				fail('Expected an error for invalid JQL syntax');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// The error might have a generic message, so just check that it's a 400 Bad Request
				expect((error as McpError).statusCode).toBe(400);
			}
		}, 30000);

		it('should handle empty results gracefully', async () => {
			if (skipIfNoCredentials()) return;

			// Use JQL that is unlikely to match any issues
			const uniqueValue = `NONEXISTENT_VALUE_${Date.now()}`;
			const result = await atlassianIssuesService.search({
				jql: `summary ~ "${uniqueValue}"`,
			});

			// Verify empty result structure
			expect(result).toHaveProperty('issues');
			expect(Array.isArray(result.issues)).toBe(true);
			expect(result.issues.length).toBe(0);
			// New API doesn't return total, but should return isLast: true
			expect(result.isLast).toBe(true);
		}, 30000);
	});

	describe('get', () => {
		// Helper function to get a valid issue key for testing
		async function getValidIssueKey(): Promise<string | null> {
			if (skipIfNoCredentials()) return null;
			try {
				const searchResult = await atlassianIssuesService.search({
					jql: 'created >= -30d',
					maxResults: 1,
				});

				if (searchResult.issues.length === 0) {
					console.warn('No issues found for testing');
					return null;
				}

				return searchResult.issues[0].key;
			} catch (error) {
				console.warn('Error fetching issue for tests:', error);
				return null;
			}
		}

		it('should return issue details', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key
			const issueKey = await getValidIssueKey();
			if (!issueKey) {
				console.warn('Skipping issue details test: No issues found');
				return;
			}

			// Call the function with the real API
			const result = await atlassianIssuesService.get(issueKey);

			// Verify the response structure
			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('key');
			expect(result).toHaveProperty('self');
			expect(result).toHaveProperty('fields');
			expect(result.fields).toHaveProperty('project');

			// Verify the issue key matches
			expect(result.key).toBe(issueKey);
		}, 30000);

		it('should handle field parameters', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key
			const issueKey = await getValidIssueKey();
			if (!issueKey) {
				console.warn('Skipping issue fields test: No issues found');
				return;
			}

			// Call the function with specific fields
			const result = await atlassianIssuesService.get(issueKey, {
				fields: ['summary', 'status', 'description'],
			});

			// Verify only requested fields are present
			expect(result.fields).toHaveProperty('summary');
			expect(result.fields).toHaveProperty('status');
			expect(result.fields).toHaveProperty('description');
		}, 30000);

		it('should support expand options', async () => {
			if (skipIfNoCredentials()) return;

			// Get a valid issue key
			const issueKey = await getValidIssueKey();
			if (!issueKey) {
				console.warn('Skipping issue expand test: No issues found');
				return;
			}

			// Call the function with expand options
			const result = await atlassianIssuesService.get(issueKey, {
				expand: ['changelog', 'names'],
			});

			// Verify expanded fields are included
			expect(result).toHaveProperty('changelog');
			expect(result).toHaveProperty('names');
		}, 30000);

		it('should throw McpError for non-existent issue ID', async () => {
			if (skipIfNoCredentials()) return;

			const nonExistentIssueKey = 'NONEXISTENT-99999';

			try {
				await atlassianIssuesService.get(nonExistentIssueKey);
				fail('Expected an error for non-existent issue ID');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				expect((error as McpError).statusCode).toBe(404);
			}
		}, 30000);

		it('should throw McpError for invalid issue ID format', async () => {
			if (skipIfNoCredentials()) return;

			// Use an invalid format (issue keys should be PROJECT-NUMBER)
			const invalidFormat = 'Invalid-Format@#$%';

			try {
				await atlassianIssuesService.get(invalidFormat);
				fail('Expected an error for invalid issue ID format');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// API might return 400 (Bad Request) or 404 (Not Found)
				expect([400, 404]).toContain((error as McpError).statusCode);
			}
		}, 30000);

		it('should throw McpError for empty issue ID', async () => {
			if (skipIfNoCredentials()) return;

			try {
				await atlassianIssuesService.get('');
				fail('Expected an error for empty issue ID');
			} catch (error) {
				expect(error).toBeInstanceOf(McpError);
				// API might return various error codes for empty key
				expect([400, 404, 405]).toContain(
					(error as McpError).statusCode,
				);
			}
		}, 30000);
	});
});
