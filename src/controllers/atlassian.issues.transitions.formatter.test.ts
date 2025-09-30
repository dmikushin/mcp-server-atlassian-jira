import { formatTransitions, formatTransitionResult } from './atlassian.issues.transitions.formatter';
import { GetTransitionsResponse, Issue } from '../services/vendor.atlassian.issues.types';

describe('atlassian.issues.transitions.formatter', () => {
	describe('formatTransitions', () => {
		it('should format transitions with basic information', () => {
			const response: GetTransitionsResponse = {
				transitions: [
					{
						id: '11',
						name: 'To Do',
						to: {
							self: 'https://example.atlassian.net/rest/api/3/status/10000',
							description: 'Work has not started',
							iconUrl: 'https://example.atlassian.net/',
							name: 'To Do',
							id: '10000',
							statusCategory: {
								self: 'https://example.atlassian.net/rest/api/3/statuscategory/2',
								id: 2,
								key: 'new',
								colorName: 'blue-gray',
								name: 'To Do',
							},
						},
						hasScreen: false,
						isGlobal: false,
						isInitial: false,
						isConditional: false,
						isLooped: false,
					},
					{
						id: '21',
						name: 'In Progress',
						to: {
							self: 'https://example.atlassian.net/rest/api/3/status/10001',
							description: 'Work is ongoing',
							iconUrl: 'https://example.atlassian.net/',
							name: 'In Progress',
							id: '10001',
							statusCategory: {
								self: 'https://example.atlassian.net/rest/api/3/statuscategory/4',
								id: 4,
								key: 'indeterminate',
								colorName: 'yellow',
								name: 'In Progress',
							},
						},
						hasScreen: false,
						isGlobal: false,
						isInitial: false,
						isConditional: false,
						isLooped: false,
					},
				],
			};

			const result = formatTransitions(response, 'TEST-123');

			expect(result).toContain('# Available Transitions for TEST-123');
			expect(result).toContain('Found **2** available transition(s):');
			expect(result).toContain('## 1. To Do');
			expect(result).toContain('**ID:** `11`');
			expect(result).toContain('**Target Status:** To Do');
			expect(result).toContain('**Description:** Work has not started');
			expect(result).toContain('**Category:** To Do (blue-gray)');
			expect(result).toContain('## 2. In Progress');
			expect(result).toContain('**ID:** `21`');
			expect(result).toContain('**Target Status:** In Progress');
			expect(result).toContain('## Usage');
			expect(result).toContain('`issueIdOrKey`: TEST-123');
		});

		it('should handle transitions with screens and fields', () => {
			const response: GetTransitionsResponse = {
				transitions: [
					{
						id: '31',
						name: 'Done',
						to: {
							self: 'https://example.atlassian.net/rest/api/3/status/10002',
							description: 'Work is complete',
							iconUrl: 'https://example.atlassian.net/',
							name: 'Done',
							id: '10002',
						},
						hasScreen: true,
						fields: {
							resolution: {
								required: true,
								name: 'Resolution',
								schema: {
									type: 'option',
									system: 'resolution',
								},
							},
							comment: {
								required: false,
								name: 'Comment',
								schema: {
									type: 'string',
								},
							},
						},
						isGlobal: false,
						isInitial: false,
						isConditional: false,
						isLooped: false,
					},
				],
			};

			const result = formatTransitions(response, 'BUG-456');

			expect(result).toContain('# Available Transitions for BUG-456');
			expect(result).toContain('⚠️ **Note:** This transition has a screen with additional fields.');
			expect(result).toContain('### Required/Available Fields:');
			expect(result).toContain('**Resolution** **[Required]**');
			expect(result).toContain('**Comment** [Optional]');
		});

		it('should handle empty transitions list', () => {
			const response: GetTransitionsResponse = {
				transitions: [],
			};

			const result = formatTransitions(response, 'CLOSED-789');

			expect(result).toContain('# Available Transitions for CLOSED-789');
			expect(result).toContain('*No transitions available from the current status.*');
			expect(result).toContain('This could mean:');
			expect(result).toContain('- The issue is in a final state');
			expect(result).toContain("- You don't have permission to transition this issue");
			expect(result).toContain("- The workflow doesn't allow transitions from the current status");
		});

		it('should handle transitions without descriptions or categories', () => {
			const response: GetTransitionsResponse = {
				transitions: [
					{
						id: '41',
						name: 'Custom Status',
						to: {
							self: 'https://example.atlassian.net/rest/api/3/status/10003',
							iconUrl: 'https://example.atlassian.net/',
							name: 'Custom Status',
							id: '10003',
							// No description or statusCategory
						},
						hasScreen: false,
						isGlobal: false,
						isInitial: false,
						isConditional: false,
						isLooped: false,
					},
				],
			};

			const result = formatTransitions(response, 'CUSTOM-101');

			expect(result).toContain('## 1. Custom Status');
			expect(result).toContain('**ID:** `41`');
			expect(result).toContain('**Target Status:** Custom Status');
			expect(result).not.toContain('**Description:**');
			expect(result).not.toContain('**Category:**');
		});
	});

	describe('formatTransitionResult', () => {
		it('should format successful transition result', () => {
			const updatedIssue: Issue = {
				id: '10000',
				key: 'TEST-123',
				fields: {
					summary: 'Test Issue Summary',
					status: {
						name: 'In Progress',
					},
				},
			} as Issue;

			const result = formatTransitionResult('TEST-123', '21', updatedIssue);

			expect(result).toContain('# Transition Completed Successfully');
			expect(result).toContain('✅ Issue **TEST-123** has been transitioned.');
			expect(result).toContain('## Updated Issue Status');
			expect(result).toContain('- **Issue:** TEST-123');
			expect(result).toContain('- **Summary:** Test Issue Summary');
			expect(result).toContain('- **New Status:** In Progress');
			expect(result).toContain('The transition with ID `21` was successfully applied.');
		});

		it('should handle missing status in updated issue', () => {
			const updatedIssue: Issue = {
				id: '10001',
				key: 'BUG-456',
				fields: {
					summary: 'Bug Issue',
					// No status field
				},
			} as Issue;

			const result = formatTransitionResult('BUG-456', '31', updatedIssue);

			expect(result).toContain('# Transition Completed Successfully');
			expect(result).toContain('✅ Issue **BUG-456** has been transitioned.');
			expect(result).toContain('- **Issue:** BUG-456');
			expect(result).toContain('- **Summary:** Bug Issue');
			expect(result).toContain('- **New Status:** Unknown');
			expect(result).toContain('The transition with ID `31` was successfully applied.');
		});
	});
});