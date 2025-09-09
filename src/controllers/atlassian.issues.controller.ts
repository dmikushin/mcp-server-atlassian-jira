import { Logger } from '../utils/logger.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { createApiError } from '../utils/error.util.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import atlassianDevInfoService from '../services/vendor.atlassian.devinfo.service.js';
import { formatIssuesList } from './atlassian.issues.list.formatter.js';
import { formatIssueDetails } from './atlassian.issues.details.formatter.js';
import { formatDevelopmentInfo } from './atlassian.issues.development.formatter.js';
import { SearchIssuesParams } from '../services/vendor.atlassian.issues.types.js';
import {
	GetIssueToolArgsType,
	ListIssuesToolArgsType,
} from '../tools/atlassian.issues.types.js';
import {
	DevInfoResponse,
	DevInfoSummaryResponse,
} from '../services/vendor.atlassian.issues.types.js';
import { formatPagination } from '../utils/formatter.util.js';

/**
 * Controller for managing Jira issues.
 * Provides functionality for listing issues and retrieving issue details.
 */

// Define default fields here (or import if defined elsewhere)
const DEFAULT_ISSUE_FIELDS = [
	'summary',
	'description',
	'status',
	'issuetype',
	'priority',
	'project',
	'assignee',
	'reporter',
	'creator',
	'created',
	'updated',
	'timetracking',
	'comment',
	'attachment',
	'worklog',
	'issuelinks',
	'labels',
];

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.issues.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Jira issues controller initialized');

/**
 * List Jira issues with optional filtering
 * @param options - Optional filter options for the issues list
 * @param options.jql - JQL query to filter issues
 * @param options.limit - Maximum number of issues to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted issue list content and pagination information
 */
async function list(
	options: ListIssuesToolArgsType = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.issues.controller.ts',
		'list',
	);
	methodLogger.debug('Listing Jira issues (raw options received):', options);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw new Error(
				'Atlassian credentials are required for this operation',
			);
		}

		// Create a defaults object with proper typing
		const defaults: Partial<ListIssuesToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
			orderBy: 'updated DESC', // Jira default sort
			startAt: 0, // Default startAt to 0
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListIssuesToolArgsType>(
			options,
			defaults,
		);
		methodLogger.debug(
			'Listing Jira issues (merged options after defaults):',
			mergedOptions,
		);

		// Revert to simpler JQL building logic, using statuses
		const jqlParts: string[] = [];
		if (mergedOptions.jql && mergedOptions.jql.trim() !== '') {
			jqlParts.push(mergedOptions.jql); // Pass user JQL directly without wrapping
		}
		if (mergedOptions.projectKeyOrId) {
			// No need to escape simple keys/IDs typically
			jqlParts.push(`project = ${mergedOptions.projectKeyOrId}`);
		}
		if (mergedOptions.statuses && mergedOptions.statuses.length > 0) {
			// Simply quote the status names without complex normalization
			// Status names in Jira are case-sensitive and must match exactly
			const quotedStatuses = mergedOptions.statuses.map(
				(status) => `"${status.trim()}"`,
			);

			const statusQuery =
				quotedStatuses.length === 1
					? `status = ${quotedStatuses[0]}`
					: `status IN (${quotedStatuses.join(', ')})`;
			jqlParts.push(statusQuery);
		}

		let finalJql = jqlParts.join(' AND ');

		// Handle the case where no search criteria are provided
		if (finalJql.trim() === '') {
			// Default search if no criteria provided - must be bounded for new API
			// Use a reasonable time window to ensure the query is bounded
			finalJql = 'updated >= -90d';
		}

		// Apply ordering logic only after ensuring we have a base query
		if (mergedOptions.orderBy) {
			if (!finalJql.toUpperCase().includes('ORDER BY')) {
				finalJql += ` ORDER BY ${mergedOptions.orderBy}`;
			} else {
				methodLogger.warn(
					'orderBy parameter ignored as provided JQL already contains ORDER BY clause.',
				);
			}
		} else if (
			finalJql.trim() !== '' &&
			!finalJql.toUpperCase().includes('ORDER BY')
		) {
			// Apply default sort only if some JQL exists and no order is specified
			finalJql += ' ORDER BY updated DESC';
		}

		methodLogger.debug(`Executing generated JQL: ${finalJql}`);

		const params: SearchIssuesParams = {
			jql: finalJql,
			maxResults: mergedOptions.limit,
			startAt: mergedOptions.startAt,
			expand: ['renderedFields', 'names'],
			fields: DEFAULT_ISSUE_FIELDS, // Use defined constant
		};

		const issuesData = await atlassianIssuesService.search(params);

		methodLogger.debug(
			`Retrieved ${issuesData.issues.length} issues${issuesData.isLast ? ' (final page)' : ' (more available)'}`,
		);

		const pagination = extractPaginationInfo(
			issuesData as unknown as Record<string, unknown>,
			PaginationType.OFFSET,
			'Issue',
		);

		// The formatter expects an object with issues and baseUrl
		if (!credentials || !credentials.siteName) {
			// Handle missing credentials/siteName - perhaps throw an error or default cautiously
			throw new Error(
				'Missing necessary credentials (siteName) to construct base URL.',
			);
		}
		const baseUrl = `https://${credentials.siteName}.atlassian.net`; // Construct baseUrl from siteName

		const formatterInput = {
			issues: issuesData.issues || [],
			baseUrl: baseUrl,
		};

		const formattedIssues = formatIssuesList(formatterInput);

		// Create JQL info section
		const jqlInfoText = `**Executed JQL Query:** \`${finalJql}\``;

		// Combine JQL info and issues content
		const finalContent = jqlInfoText + '\n\n' + formattedIssues;

		// Combine formatted content with pagination information
		let contentWithPagination = finalContent;
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			contentWithPagination += '\n\n' + paginationString;
		}

		return {
			content: contentWithPagination,
		};
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Issues',
				'listing',
				'controllers/atlassian.issues.controller.ts@list',
				undefined,
				{ options, jql: options.jql },
			),
		);
	}
}

/**
 * Get a single Jira issue by ID or key
 * @param identifier Issue identifier (ID or key)
 * @returns Detailed issue information formatted as Markdown
 */
async function get(
	identifier: GetIssueToolArgsType,
): Promise<ControllerResponse> {
	const { issueIdOrKey } = identifier;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.issues.controller.ts',
		'get',
	);

	methodLogger.debug(`Getting Jira issue with ID/key: ${issueIdOrKey}...`);

	// Validate issue ID/key format
	if (!issueIdOrKey || issueIdOrKey === 'invalid') {
		throw createApiError('Invalid issue ID or key', 400);
	}

	try {
		// Always include all fields
		const fields = [
			'summary',
			'description',
			'status',
			'issuetype',
			'priority',
			'project',
			'assignee',
			'reporter',
			'creator',
			'created',
			'updated',
			'timetracking',
			'comment',
			'attachment',
			'worklog',
			'issuelinks',
		];

		// Get issue details
		const issueData = await atlassianIssuesService.get(issueIdOrKey, {
			fields,
		});

		methodLogger.debug(`Retrieved issue: ${issueIdOrKey}`);

		// Format the issue data for display using the formatter
		const formattedIssue = formatIssueDetails(issueData);

		// Get development information if available
		let devInfoSummary: DevInfoSummaryResponse | null = null;
		let devInfoCommits: DevInfoResponse | null = null;
		let devInfoBranches: DevInfoResponse | null = null;
		let devInfoPullRequests: DevInfoResponse | null = null;

		try {
			// Use the issue ID to get development information
			methodLogger.debug(
				`Getting development information for issue ID: ${issueData.id}...`,
			);

			// Get summary first to check if there's any dev info available
			devInfoSummary = await atlassianDevInfoService.getSummary(
				issueData.id,
			);

			// If there's any development information available, get the details
			if (
				devInfoSummary?.summary?.repository?.overall?.count ||
				devInfoSummary?.summary?.branch?.overall?.count ||
				devInfoSummary?.summary?.pullrequest?.overall?.count
			) {
				// Fetch detailed development information
				methodLogger.debug(
					'Development information available, fetching details...',
				);

				// Run these in parallel for better performance
				[devInfoCommits, devInfoBranches, devInfoPullRequests] =
					await Promise.all([
						atlassianDevInfoService.getCommits(issueData.id),
						atlassianDevInfoService.getBranches(issueData.id),
						atlassianDevInfoService.getPullRequests(issueData.id),
					]);

				methodLogger.debug(
					'Successfully retrieved development information',
				);
			} else {
				methodLogger.debug(
					'No development information available for this issue',
				);
			}
		} catch (error) {
			// Log the error but don't fail the whole request
			methodLogger.warn(
				'Failed to retrieve development information:',
				error,
			);
		}

		// Format development information if available
		const formattedDevInfo = formatDevelopmentInfo(
			devInfoSummary,
			devInfoCommits,
			devInfoBranches,
			devInfoPullRequests,
		);

		// Combine the formatted issue details with the formatted development information
		const combinedContent = formattedDevInfo
			? `${formattedIssue}\n${formattedDevInfo}`
			: formattedIssue;

		return {
			content: combinedContent,
		};
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Issue',
				'retrieving',
				'controllers/atlassian.issues.controller.ts@get',
				issueIdOrKey,
			),
		);
	}
}

export default {
	list,
	get,
};
