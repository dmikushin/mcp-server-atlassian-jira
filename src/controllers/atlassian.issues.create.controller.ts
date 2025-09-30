import { Logger } from '../utils/logger.util.js';
import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import atlassianUsersService from '../services/vendor.atlassian.users.service.js';
import {
	GetCreateMetaToolArgsType,
	CreateIssueToolArgsType,
} from '../tools/atlassian.issues.create.types.js';
import {
	formatCreateMeta,
	formatCreateIssueResponse,
} from './atlassian.issues.create.formatter.js';
import { CreateIssueParams } from '../services/vendor.atlassian.issues.types.js';
import { markdownToAdf } from '../utils/adf-from-markdown.util.js';

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.issues.create.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Jira issues create controller initialized');

/**
 * Get create metadata for a project and its issue types
 * @param args Arguments containing project identifier and optional filters
 * @returns Formatted create metadata response
 */
async function getCreateMeta(args: GetCreateMetaToolArgsType) {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.issues.create.controller.ts',
		'getCreateMeta',
	);

	methodLogger.debug(
		`Getting create metadata for project: ${args.projectKeyOrId}`,
		args,
	);

	const response = await atlassianIssuesService.getCreateMeta(
		args.projectKeyOrId,
		args.issueTypeId,
		{
			...(args.issuetypeNames && { issuetypeNames: args.issuetypeNames }),
		},
	);

	methodLogger.debug('Retrieved create metadata successfully');

	return {
		content: formatCreateMeta(response, args.projectKeyOrId),
	};
}

/**
 * Create a new Jira issue
 * @param args Arguments containing issue creation data
 * @returns Formatted create issue response
 */
async function createIssue(args: CreateIssueToolArgsType) {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.issues.create.controller.ts',
		'createIssue',
	);

	methodLogger.debug('Creating new issue:', args);

	// Build the fields object for issue creation
	const fields: Record<string, unknown> = {
		project: {
			key: args.projectKeyOrId,
		},
		issuetype: {
			id: args.issueTypeId,
		},
		summary: args.summary,
	};

	// Add description as ADF if provided
	if (args.description) {
		fields.description = markdownToAdf(args.description);
	}

	// Add optional fields
	if (args.priority) {
		// Try as ID first, then as name
		if (/^\d+$/.test(args.priority)) {
			fields.priority = { id: args.priority };
		} else {
			fields.priority = { name: args.priority };
		}
	}

	if (args.assignee) {
		// Resolve assignee identifier to accountId if needed
		const assigneeAccountId = await atlassianUsersService.resolveUserIdentifier(
			args.assignee,
		);
		if (assigneeAccountId) {
			fields.assignee = { accountId: assigneeAccountId };
			methodLogger.debug(
				`Resolved assignee "${args.assignee}" to accountId: ${assigneeAccountId}`,
			);
		} else {
			methodLogger.warn(
				`Could not resolve assignee identifier: ${args.assignee}`,
			);
			// Still try with the original value as a fallback
			fields.assignee = { accountId: args.assignee };
		}
	}

	if (args.labels?.length) {
		fields.labels = args.labels;
	}

	if (args.components?.length) {
		fields.components = args.components.map((comp) => {
			// Try as ID first, then as name
			if (/^\d+$/.test(comp)) {
				return { id: comp };
			} else {
				return { name: comp };
			}
		});
	}

	if (args.fixVersions?.length) {
		fields.fixVersions = args.fixVersions.map((version) => {
			// Try as ID first, then as name
			if (/^\d+$/.test(version)) {
				return { id: version };
			} else {
				return { name: version };
			}
		});
	}

	// Add custom fields if provided
	if (args.customFields) {
		Object.assign(fields, args.customFields);
	}

	const createParams: CreateIssueParams = {
		fields,
	};

	methodLogger.debug('Calling service to create issue with fields:', fields);

	const response = await atlassianIssuesService.createIssue(createParams);

	methodLogger.debug('Created issue successfully:', response);

	return {
		content: formatCreateIssueResponse(response),
	};
}

export default {
	getCreateMeta,
	createIssue,
};
