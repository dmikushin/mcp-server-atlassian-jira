import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListCommentsToolArgs,
	type ListCommentsToolArgsType,
	AddCommentToolArgs,
	type AddCommentToolArgsType,
} from './atlassian.comments.types.js';
import atlassianCommentsController from '../controllers/atlassian.comments.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.comments.tool.ts');

// Log tool module initialization
toolLogger.debug('Jira comments tool module initialized');

/**
 * MCP Tool: List Comments for a Jira Issue
 *
 * Lists comments for a specific Jira issue.
 * Returns a formatted markdown response with comment details.
 *
 * @param {ListCommentsToolArgsType} args - Tool arguments for listing comments
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted comments list
 * @throws Will return error message if comment listing fails
 */
async function listComments(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.comments.tool.ts',
		'listComments',
	);
	methodLogger.debug('Listing Jira comments with args:', args);

	try {
		const result = await atlassianCommentsController.listComments(
			args as ListCommentsToolArgsType,
		);

		methodLogger.debug('Successfully retrieved comments list');

		// Content already includes the pagination information
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to list comments', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Add Comment to a Jira Issue
 *
 * Adds a new comment to a specific Jira issue.
 * Returns a formatted markdown response confirming the addition.
 *
 * @param {AddCommentToolArgsType} args - Tool arguments for adding a comment
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with confirmation
 * @throws Will return error message if comment addition fails
 */
async function addComment(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.comments.tool.ts',
		'addComment',
	);
	const typedArgs = args as AddCommentToolArgsType;
	methodLogger.debug('Adding comment to Jira issue:', {
		issueIdOrKey: typedArgs.issueIdOrKey,
		bodyLength: typedArgs.commentBody?.length || 0,
	});

	try {
		const result = await atlassianCommentsController.addComment(
			args as AddCommentToolArgsType,
		);

		methodLogger.debug('Successfully added comment');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to add comment', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Comments MCP Tools
 *
 * Registers the list-comments and add-comment tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.comments.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Comments tools...');

	// Register the list comments tool
	server.tool(
		'jira_ls_comments',
		`Lists comments for a specific Jira issue identified by \`issueIdOrKey\`. Supports pagination via \`limit\` and \`startAt\`. Returns a formatted Markdown list of comments with author, date, and content. Pagination information including next page instructions is included in the returned text. Requires Jira credentials to be configured.`,
		ListCommentsToolArgs.shape,
		listComments,
	);

	// Register the add comment tool
	server.tool(
		'jira_add_comment',
		`Adds a new comment to a specific Jira issue identified by \`issueIdOrKey\`. The content of the comment is provided in \`commentBody\` and supports Markdown formatting which will be converted to Jira's Atlassian Document Format (ADF). Returns a confirmation message and link to the newly created comment. Requires Jira credentials to be configured.`,
		AddCommentToolArgs.shape,
		addComment,
	);

	methodLogger.debug('Successfully registered Atlassian Comments tools');
}

export default { registerTools };
