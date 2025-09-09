import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import atlassianWorklogsController from '../controllers/atlassian.worklogs.controller.js';
import {
	ListWorklogsToolArgsSchema,
	AddWorklogToolArgsSchema,
	UpdateWorklogToolArgsSchema,
	DeleteWorklogToolArgsSchema,
	type ListWorklogsToolArgsType,
	type AddWorklogToolArgsType,
	type UpdateWorklogToolArgsType,
	type DeleteWorklogToolArgsType,
} from './atlassian.worklogs.types.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.worklogs.tool.ts');

// Log tool initialization
toolLogger.debug('Jira worklogs tool initialized');

/**
 * Handler for listing worklogs for an issue
 * @param args Tool arguments
 * @returns Formatted list of worklogs
 */
async function handleListWorklogs(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.worklogs.tool.ts',
		'handleListWorklogs',
	);
	methodLogger.debug('Handling list worklogs request', args);

	try {
		const result = await atlassianWorklogsController.listWorklogs(
			args as ListWorklogsToolArgsType,
		);
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Error listing worklogs', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Handler for adding a worklog to an issue
 * @param args Tool arguments
 * @returns Confirmation of added worklog
 */
async function handleAddWorklog(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.worklogs.tool.ts',
		'handleAddWorklog',
	);
	methodLogger.debug('Handling add worklog request', args);

	try {
		const result = await atlassianWorklogsController.addWorklog(
			args as AddWorklogToolArgsType,
		);
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Error adding worklog', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Handler for updating an existing worklog
 * @param args Tool arguments
 * @returns Confirmation of updated worklog
 */
async function handleUpdateWorklog(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.worklogs.tool.ts',
		'handleUpdateWorklog',
	);
	methodLogger.debug('Handling update worklog request', args);

	try {
		const result = await atlassianWorklogsController.updateWorklog(
			args as UpdateWorklogToolArgsType,
		);
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Error updating worklog', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Handler for deleting a worklog
 * @param args Tool arguments
 * @returns Confirmation of deleted worklog
 */
async function handleDeleteWorklog(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.worklogs.tool.ts',
		'handleDeleteWorklog',
	);
	methodLogger.debug('Handling delete worklog request', args);

	try {
		const result = await atlassianWorklogsController.deleteWorklog(
			args as DeleteWorklogToolArgsType,
		);
		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Error deleting worklog', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Jira worklog tools with the MCP server
 * @param server The MCP server instance
 */
function registerTools(server: McpServer) {
	const registerLogger = Logger.forContext(
		'tools/atlassian.worklogs.tool.ts',
		'registerTools',
	);
	registerLogger.debug('Registering Jira worklog tools');

	// Register list worklogs tool
	server.tool(
		'jira_ls_worklogs',
		'List worklogs for a Jira issue. Shows all work logged on an issue including time spent, authors, and comments.',
		ListWorklogsToolArgsSchema.shape,
		handleListWorklogs,
	);
	registerLogger.debug('Registered jira_ls_worklogs tool');

	// Register add worklog tool
	server.tool(
		'jira_add_worklog',
		'Add a worklog entry to a Jira issue. Logs time spent working on an issue with optional comment and estimate adjustment.',
		AddWorklogToolArgsSchema.shape,
		handleAddWorklog,
	);
	registerLogger.debug('Registered jira_add_worklog tool');

	// Register update worklog tool
	server.tool(
		'jira_update_worklog',
		'Update an existing worklog entry. Modify the time spent, comment, or start time of a previously logged work entry.',
		UpdateWorklogToolArgsSchema.shape,
		handleUpdateWorklog,
	);
	registerLogger.debug('Registered jira_update_worklog tool');

	// Register delete worklog tool
	server.tool(
		'jira_delete_worklog',
		'Delete a worklog entry from a Jira issue. Removes a previously logged work entry with optional estimate adjustment.',
		DeleteWorklogToolArgsSchema.shape,
		handleDeleteWorklog,
	);
	registerLogger.debug('Registered jira_delete_worklog tool');

	registerLogger.debug('All Jira worklog tools registered successfully');
}

export default { registerTools };
