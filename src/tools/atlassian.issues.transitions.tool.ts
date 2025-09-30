/**
 * MCP Tool implementations for Atlassian Issues transitions
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import atlassianIssuesTransitionsController from '../controllers/atlassian.issues.transitions.controller.js';
import {
	GetTransitionsToolArgsSchema,
	TransitionIssueToolArgsSchema,
	type GetTransitionsToolArgsType,
	type TransitionIssueToolArgsType,
} from './atlassian.issues.transitions.types.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.issues.transitions.tool.ts');

// Log tool module initialization
toolLogger.debug('Jira issues transitions tool module initialized');

/**
 * MCP Tool: Get Available Transitions
 *
 * Retrieves available workflow transitions for a specific issue.
 * Returns a formatted markdown response with transition details.
 *
 * @param {GetTransitionsToolArgsType} args - Tool arguments containing issue ID/key
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted transitions list
 * @throws Will return error message if transitions retrieval fails
 */
async function getTransitions(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.transitions.tool.ts',
		'getTransitions',
	);
	methodLogger.debug('Getting transitions for issue:', args);

	try {
		const result = await atlassianIssuesTransitionsController.getTransitions(
			args as GetTransitionsToolArgsType,
		);

		methodLogger.debug('Successfully retrieved transitions');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (err) {
		methodLogger.error('Error retrieving transitions', err);
		const errorResult = formatErrorForMcpTool(err);
		return {
			content: errorResult.content,
		};
	}
}

/**
 * MCP Tool: Transition Issue
 *
 * Transitions an issue to a new status.
 * Returns a formatted markdown response with the result.
 *
 * @param {TransitionIssueToolArgsType} args - Tool arguments containing issue ID/key and transition details
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted transition result
 * @throws Will return error message if transition fails
 */
async function transitionIssue(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.transitions.tool.ts',
		'transitionIssue',
	);
	methodLogger.debug('Transitioning issue:', args);

	try {
		const result = await atlassianIssuesTransitionsController.transitionIssue(
			args as TransitionIssueToolArgsType,
		);

		methodLogger.debug('Successfully transitioned issue');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (err) {
		methodLogger.error('Error transitioning issue', err);
		const errorResult = formatErrorForMcpTool(err);
		return {
			content: errorResult.content,
		};
	}
}

/**
 * Register all issues transitions tools with the MCP server
 *
 * @param server - The MCP server instance to register tools with
 */
export function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.transitions.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Issues Transitions tools...');

	// Register the get transitions tool
	server.tool(
		'jira_get_issue_transitions',
		`Get all available workflow transitions for a JIRA issue. Shows which status changes are possible from the current state and what fields are required for each transition. Returns the transition ID needed to perform the status change. Requires Jira credentials to be configured.`,
		GetTransitionsToolArgsSchema.shape,
		getTransitions,
	);

	// Register the transition issue tool
	server.tool(
		'jira_transition_issue',
		`Transition a JIRA issue to a new status (e.g., from "To Do" to "In Progress"). Use jira_get_issue_transitions first to see available transitions and get the transition ID. Supports optional comment and field updates during transition. Requires Jira credentials to be configured.`,
		TransitionIssueToolArgsSchema.shape,
		transitionIssue,
	);

	methodLogger.debug('Successfully registered Atlassian Issues Transitions tools');
}

export default { registerTools };