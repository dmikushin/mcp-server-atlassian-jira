import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListStatusesToolArgs,
	type ListStatusesToolArgsType,
} from './atlassian.statuses.types.js';
import atlassianStatusesController from '../controllers/atlassian.statuses.controller.js';

const toolLogger = Logger.forContext('tools/atlassian.statuses.tool.ts');
toolLogger.debug('Jira statuses tool module initialized');

/**
 * Handler for jira_ls_statuses tool.
 * Lists available Jira statuses, optionally filtering by project.
 *
 * @param {ListStatusesToolArgsType} args - Tool arguments with optional projectKeyOrId
 * @returns {Promise<object>} MCP response object with formatted Markdown
 */
async function handleListStatuses(args: Record<string, unknown>) {
	const methodLogger = toolLogger.forMethod('handleListStatuses');
	methodLogger.debug('Listing Jira statuses with arguments:', args);

	try {
		const result = await atlassianStatusesController.listStatuses(
			args as ListStatusesToolArgsType,
		);

		methodLogger.debug('Successfully retrieved statuses');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to list statuses', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register the jira_ls_statuses tool with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance
 */
function registerTools(server: McpServer) {
	const methodLogger = toolLogger.forMethod('registerTools');
	methodLogger.debug('Registering Jira statuses tools...');

	server.tool(
		'jira_ls_statuses',
		`Lists available Jira statuses, either globally or for a specific project (\`projectKeyOrId\`).
Use this to discover valid status names and IDs needed for filtering issues (e.g., in \`jira_ls_issues\`).
**Important:** This tool returns *all* available statuses in a single response. The underlying Jira API does not support pagination for this endpoint, so parameters like \`limit\` or pagination tokens are not applicable.
Returns a formatted Markdown list of statuses including name, ID, description, and category (To Do, In Progress, Done).
Requires Jira credentials to be configured.`,
		ListStatusesToolArgs.shape,
		handleListStatuses,
	);

	methodLogger.debug('Successfully registered Jira statuses tools');
}

export default { registerTools };
