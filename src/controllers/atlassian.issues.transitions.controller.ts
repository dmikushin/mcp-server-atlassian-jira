import { Logger } from '../utils/logger.util.js';
import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import {
	GetTransitionsToolArgsType,
	TransitionIssueToolArgsType,
} from '../tools/atlassian.issues.transitions.types.js';
import { formatTransitions, formatTransitionResult } from './atlassian.issues.transitions.formatter.js';

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.issues.transitions.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Jira issues transitions controller initialized');

/**
 * Get available transitions for an issue
 * @param args Arguments containing issue ID/key
 * @returns Formatted transitions response
 */
async function getTransitions(args: GetTransitionsToolArgsType) {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.issues.transitions.controller.ts',
		'getTransitions',
	);

	methodLogger.debug(
		`Getting transitions for issue: ${args.issueIdOrKey}`,
		args,
	);

	const response = await atlassianIssuesService.getTransitions(
		args.issueIdOrKey,
	);

	methodLogger.debug('Retrieved transitions successfully');

	return {
		content: formatTransitions(response, args.issueIdOrKey),
	};
}

/**
 * Transition an issue to a new status
 * @param args Arguments containing issue ID/key and transition details
 * @returns Formatted transition result
 */
async function transitionIssue(args: TransitionIssueToolArgsType) {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.issues.transitions.controller.ts',
		'transitionIssue',
	);

	methodLogger.debug(
		`Transitioning issue ${args.issueIdOrKey} with transition ${args.transitionId}`,
		args,
	);

	// Build the transition parameters
	const transitionParams = {
		transition: {
			id: args.transitionId,
		},
		fields: args.fields,
		update: args.update,
	};

	// Perform the transition
	await atlassianIssuesService.transitionIssue(
		args.issueIdOrKey,
		transitionParams,
	);

	// If a comment was provided, add it after the transition
	if (args.comment) {
		methodLogger.debug('Adding comment to transitioned issue');
		await atlassianIssuesService.addComment(args.issueIdOrKey, {
			body: {
				body: args.comment,
			},
		});
	}

	methodLogger.debug('Transition completed successfully');

	// Get the updated issue to show the new status
	const updatedIssue = await atlassianIssuesService.get(args.issueIdOrKey, {
		fields: ['status', 'summary'],
	});

	return {
		content: formatTransitionResult(
			args.issueIdOrKey,
			args.transitionId,
			updatedIssue,
		),
	};
}

export default {
	getTransitions,
	transitionIssue,
};