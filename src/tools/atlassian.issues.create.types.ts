/**
 * Types for Atlassian Issues creation MCP tools
 */
import { z } from 'zod';

/**
 * Arguments for getting create metadata
 */
export const GetCreateMetaToolArgsSchema = z.object({
	projectKeyOrId: z
		.string()
		.describe(
			'Project key (e.g., "TES") or ID to get creation metadata for',
		),
	issueTypeId: z
		.string()
		.optional()
		.describe(
			'Optional specific issue type ID to get detailed field metadata',
		),
	issuetypeNames: z
		.array(z.string())
		.optional()
		.describe('Optional array of issue type names to filter'),
});

export type GetCreateMetaToolArgs = z.infer<typeof GetCreateMetaToolArgsSchema>;
export type GetCreateMetaToolArgsType = GetCreateMetaToolArgs;

/**
 * Arguments for creating an issue
 */
export const CreateIssueToolArgsSchema = z.object({
	projectKeyOrId: z
		.string()
		.describe(
			'Project key (e.g., "TES") or ID where the issue will be created',
		),
	issueTypeId: z
		.string()
		.describe('Issue type ID (get from create metadata)'),
	summary: z.string().describe('Issue summary/title'),
	description: z
		.string()
		.optional()
		.describe('Issue description in markdown format'),
	priority: z.string().optional().describe('Priority name or ID'),
	assignee: z.string().optional().describe('Assignee account ID or email'),
	labels: z.array(z.string()).optional().describe('Array of labels to apply'),
	components: z
		.array(z.string())
		.optional()
		.describe('Array of component IDs or names'),
	fixVersions: z
		.array(z.string())
		.optional()
		.describe('Array of fix version IDs or names'),
	customFields: z
		.record(z.string(), z.unknown())
		.optional()
		.describe(
			'Custom fields as key-value pairs (e.g., {"customfield_10001": "value"})',
		),
});

export type CreateIssueToolArgs = z.infer<typeof CreateIssueToolArgsSchema>;
export type CreateIssueToolArgsType = CreateIssueToolArgs;
