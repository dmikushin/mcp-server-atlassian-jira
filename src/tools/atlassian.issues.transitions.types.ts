/**
 * Types for Atlassian Issues transitions MCP tools
 */
import { z } from 'zod';

/**
 * Arguments for getting available transitions
 */
export const GetTransitionsToolArgsSchema = z.object({
	issueIdOrKey: z
		.string()
		.describe('The ID or key of the issue to get transitions for'),
	transitionId: z
		.string()
		.optional()
		.describe('Optional specific transition ID to check if available'),
	expand: z
		.string()
		.optional()
		.describe('Optional fields to expand (e.g., "transitions.fields")'),
});

export type GetTransitionsToolArgs = z.infer<typeof GetTransitionsToolArgsSchema>;
export type GetTransitionsToolArgsType = GetTransitionsToolArgs;

/**
 * Arguments for transitioning an issue
 */
export const TransitionIssueToolArgsSchema = z.object({
	issueIdOrKey: z
		.string()
		.describe('The ID or key of the issue to transition'),
	transitionId: z
		.string()
		.describe('The ID of the transition to perform'),
	comment: z
		.string()
		.optional()
		.describe('Optional comment to add during transition'),
	fields: z
		.record(z.string(), z.unknown())
		.optional()
		.describe(
			'Optional fields to update during transition (e.g., resolution, assignee)',
		),
	update: z
		.record(z.string(), z.array(z.unknown()))
		.optional()
		.describe('Optional update operations for multi-value fields'),
});

export type TransitionIssueToolArgs = z.infer<typeof TransitionIssueToolArgsSchema>;
export type TransitionIssueToolArgsType = TransitionIssueToolArgs;