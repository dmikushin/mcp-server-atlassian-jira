import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListIssuesToolArgs,
	type ListIssuesToolArgsType,
	GetIssueToolArgs,
	type GetIssueToolArgsType,
} from './atlassian.issues.types.js';
import atlassianIssuesController from '../controllers/atlassian.issues.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.issues.tool.ts');

// Log tool module initialization
toolLogger.debug('Jira issues tool module initialized');

/**
 * MCP Tool: List Jira Issues
 *
 * Lists Jira issues with optional filtering using JQL.
 * Returns a formatted markdown response with issue details. The response
 * includes the executed JQL query and pagination information.
 *
 * @param {ListIssuesToolArgsType} args - Tool arguments for filtering issues
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issues list
 * @throws Will return error message if issue listing fails
 */
async function listIssues(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'listIssues',
	);
	methodLogger.debug('Listing Jira issues with filters:', args);

	try {
		// This is a pass-through function, so we pass all args directly to the controller
		const result = await atlassianIssuesController.list(
			args as ListIssuesToolArgsType,
		);

		methodLogger.debug('Successfully retrieved issues list');

		// Content already includes JQL query and pagination information
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to list issues', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Jira Issue Details
 *
 * Retrieves detailed information about a specific Jira issue.
 * Returns a formatted markdown response with issue data.
 *
 * @param {GetIssueToolArgsType} args - Tool arguments containing the issue ID/key
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issue details
 * @throws Will return error message if issue retrieval fails
 */
async function getIssue(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'getIssue',
	);

	methodLogger.debug(`Retrieving issue details for: ${args.issueIdOrKey}`);

	try {
		// Pass args directly to the controller
		const result = await atlassianIssuesController.get(
			args as GetIssueToolArgsType,
		);
		methodLogger.debug('Successfully retrieved issue details');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to get issue details', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Issues MCP Tools
 *
 * Registers the list-issues and get-issue tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Issues tools...');

	// Register the list issues tool
	server.tool(
		'jira_ls_issues',
		`Searches for Jira issues using JQL and other filters. Supports filtering by project (\`projectKeyOrId\`), statuses (\`statuses\`), or advanced JQL queries (\`jql\`). Includes pagination via \`limit\` and \`startAt\`. Returns formatted issue summaries including key, type, status, summary, and assignee. The response includes the executed JQL query and pagination information with instructions for viewing the next page. Requires Jira credentials to be configured.`,
		ListIssuesToolArgs.shape,
		listIssues,
	);

	// Register the get issue details tool
	server.tool(
		'jira_get_issue',
		`Retrieves comprehensive details about a specific Jira issue using its ID or key (\`issueIdOrKey\`). Returns formatted issue information including summary, description, status, reporter, assignee, comments summary, and related development information (commits, branches, pull requests) if available. Requires Jira credentials to be configured.`,
		GetIssueToolArgs.shape,
		getIssue,
	);

	methodLogger.debug('Successfully registered Atlassian Issues tools');
}

export default { registerTools };
