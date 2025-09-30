import { GetTransitionsResponse, Issue } from '../services/vendor.atlassian.issues.types.js';

/**
 * Format available transitions for display
 * @param response Transitions response from API
 * @param issueIdOrKey Issue identifier
 * @returns Formatted markdown string
 */
export function formatTransitions(
	response: GetTransitionsResponse,
	issueIdOrKey: string,
): string {
	const lines: string[] = [
		`# Available Transitions for ${issueIdOrKey}`,
		'',
	];

	if (!response.transitions || response.transitions.length === 0) {
		lines.push('*No transitions available from the current status.*');
		lines.push('');
		lines.push(
			'This could mean:',
			'- The issue is in a final state',
			'- You don\'t have permission to transition this issue',
			'- The workflow doesn\'t allow transitions from the current status',
		);
		return lines.join('\n');
	}

	lines.push(`Found **${response.transitions.length}** available transition(s):`);
	lines.push('');

	response.transitions.forEach((transition, index) => {
		lines.push(`## ${index + 1}. ${transition.name}`);
		lines.push(`**ID:** \`${transition.id}\``);
		lines.push(`**Target Status:** ${transition.to.name}`);

		if (transition.to.description) {
			lines.push(`**Description:** ${transition.to.description}`);
		}

		if (transition.to.statusCategory) {
			lines.push(
				`**Category:** ${transition.to.statusCategory.name} (${transition.to.statusCategory.colorName})`,
			);
		}

		// Add information about additional fields if present
		if (transition.hasScreen) {
			lines.push('');
			lines.push('⚠️ **Note:** This transition has a screen with additional fields.');

			if (transition.fields && Object.keys(transition.fields).length > 0) {
				lines.push('');
				lines.push('### Required/Available Fields:');
				Object.entries(transition.fields).forEach(([fieldId, field]: [string, any]) => {
					const required = field.required ? '**[Required]**' : '[Optional]';
					lines.push(`- **${field.name || fieldId}** ${required}`);
				});
			}
		}

		lines.push('');
		lines.push('---');
		lines.push('');
	});

	// Add usage hint
	lines.push('## Usage');
	lines.push('To transition this issue, use the `jira_transition_issue` tool with:');
	lines.push('- `issueIdOrKey`: ' + issueIdOrKey);
	lines.push('- `transitionId`: One of the IDs listed above');
	lines.push('- `comment`: (optional) Add a comment with the transition');
	lines.push('- `fields`: (optional) Set additional fields if required');

	return lines.join('\n');
}

/**
 * Format transition result for display
 * @param issueIdOrKey Issue identifier
 * @param transitionId Transition that was performed
 * @param updatedIssue Updated issue after transition
 * @returns Formatted markdown string
 */
export function formatTransitionResult(
	issueIdOrKey: string,
	transitionId: string,
	updatedIssue: Issue,
): string {
	const lines: string[] = [
		`# Transition Completed Successfully`,
		'',
		`✅ Issue **${issueIdOrKey}** has been transitioned.`,
		'',
		'## Updated Issue Status',
		`- **Issue:** ${updatedIssue.key}`,
		`- **Summary:** ${updatedIssue.fields.summary}`,
		`- **New Status:** ${updatedIssue.fields.status?.name || 'Unknown'}`,
		'',
		`The transition with ID \`${transitionId}\` was successfully applied.`,
	];

	return lines.join('\n');
}