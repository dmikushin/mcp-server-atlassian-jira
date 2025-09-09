import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	type GetCreateMetaToolArgsType,
	GetCreateMetaToolArgsSchema,
	type CreateIssueToolArgsType,
	CreateIssueToolArgsSchema,
} from './atlassian.issues.create.types.js';
import atlassianIssuesCreateController from '../controllers/atlassian.issues.create.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.issues.create.tool.ts');

// Log tool module initialization
toolLogger.debug('Jira issues create tool module initialized');

/**
 * MCP Tool: Get Issue Creation Metadata
 *
 * Gets the metadata required to create issues in a Jira project.
 * Returns field requirements, allowed values, and validation rules.
 *
 * @param {GetCreateMetaToolArgsType} args - Tool arguments for getting create metadata
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted metadata
 * @throws Will return error message if metadata retrieval fails
 */
async function getCreateMeta(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.create.tool.ts',
		'getCreateMeta',
	);
	methodLogger.debug('Getting create metadata for project:', args);

	try {
		const result = await atlassianIssuesCreateController.getCreateMeta(
			args as GetCreateMetaToolArgsType,
		);

		methodLogger.debug('Successfully retrieved create metadata');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to get create metadata', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Create Jira Issue
 *
 * Creates a new issue in the specified Jira project.
 * Requires project key/ID, issue type, and summary at minimum.
 *
 * @param {CreateIssueToolArgsType} args - Tool arguments for creating the issue
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with creation result
 * @throws Will return error message if issue creation fails
 */
async function createIssue(args: Record<string, unknown>) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.create.tool.ts',
		'createIssue',
	);

	methodLogger.debug('Creating new issue:', args);

	try {
		const result = await atlassianIssuesCreateController.createIssue(
			args as CreateIssueToolArgsType,
		);
		methodLogger.debug('Successfully created issue');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to create issue', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Issues Create MCP Tools
 *
 * Registers the get-create-meta and create-issue tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function registerTools(server: McpServer): void {
	const registerLogger = Logger.forContext(
		'tools/atlassian.issues.create.tool.ts',
		'registerTools',
	);

	// Register get create metadata tool
	server.tool(
		'jira_get_create_meta',
		'STEP 1: Get project-specific metadata required to create issues in a Jira project. Each project has different issue types, required fields, and validation rules. Returns field requirements, allowed values, custom fields, and issue type IDs. MUST be called before jira_create_issue to understand what fields are required.',
		GetCreateMetaToolArgsSchema.shape,
		getCreateMeta,
	);
	registerLogger.debug('Registered jira_get_create_meta tool');

	// Register create issue tool
	server.tool(
		'jira_create_issue',
		'STEP 2: Create a new issue in a Jira project using metadata from jira_get_create_meta. Each project has unique requirements - always call jira_get_create_meta first to get the correct issue type IDs and required fields. Supports markdown descriptions (converted to ADF), custom fields, and all standard Jira fields.',
		CreateIssueToolArgsSchema.shape,
		createIssue,
	);
	registerLogger.debug('Registered jira_create_issue tool');

	registerLogger.debug(
		'All Jira issue creation tools registered successfully',
	);
}

export default {
	registerTools,
};
