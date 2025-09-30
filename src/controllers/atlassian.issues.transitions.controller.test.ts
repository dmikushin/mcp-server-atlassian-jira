import atlassianIssuesTransitionsController from './atlassian.issues.transitions.controller';
import atlassianIssuesService from '../services/vendor.atlassian.issues.service';
import { formatTransitions, formatTransitionResult } from './atlassian.issues.transitions.formatter';

// Mock dependencies
jest.mock('../services/vendor.atlassian.issues.service');
jest.mock('./atlassian.issues.transitions.formatter');
jest.mock('../utils/logger.util', () => ({
	Logger: {
		forContext: jest.fn().mockReturnValue({
			debug: jest.fn(),
		}),
	},
}));

describe('atlassianIssuesTransitionsController', () => {
	const mockIssuesService = atlassianIssuesService as jest.Mocked<typeof atlassianIssuesService>;
	const mockFormatTransitions = formatTransitions as jest.MockedFunction<typeof formatTransitions>;
	const mockFormatTransitionResult = formatTransitionResult as jest.MockedFunction<typeof formatTransitionResult>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getTransitions', () => {
		it('should successfully get transitions for an issue', async () => {
			const args = {
				issueIdOrKey: 'TEST-123',
			};

			const mockResponse = {
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
						isAvailable: true,
						isConditional: false,
						isLooped: false,
					},
				],
			};

			const formattedContent = '# Available Transitions for TEST-123\n\nFound **1** transition(s)...';

			mockIssuesService.getTransitions.mockResolvedValue(mockResponse);
			mockFormatTransitions.mockReturnValue(formattedContent);

			const result = await atlassianIssuesTransitionsController.getTransitions(args);

			expect(mockIssuesService.getTransitions).toHaveBeenCalledWith('TEST-123');
			expect(mockFormatTransitions).toHaveBeenCalledWith(mockResponse, 'TEST-123');
			expect(result).toEqual({
				content: formattedContent,
			});
		});

		it('should handle errors when getting transitions fails', async () => {
			const args = {
				issueIdOrKey: 'INVALID-999',
			};

			const error = new Error('Issue not found');
			mockIssuesService.getTransitions.mockRejectedValue(error);

			await expect(atlassianIssuesTransitionsController.getTransitions(args)).rejects.toThrow(
				'Issue not found',
			);

			expect(mockIssuesService.getTransitions).toHaveBeenCalledWith('INVALID-999');
			expect(mockFormatTransitions).not.toHaveBeenCalled();
		});
	});

	describe('transitionIssue', () => {
		it('should successfully transition an issue', async () => {
			const args = {
				issueIdOrKey: 'TEST-123',
				transitionId: '21',
				comment: 'Starting work on this issue',
				fields: {
					assignee: { accountId: 'user123' },
				},
			};

			const mockUpdatedIssue = {
				id: '10000',
				key: 'TEST-123',
				fields: {
					summary: 'Test Issue',
					status: {
						name: 'In Progress',
					},
				},
			};

			const formattedContent = '# Transition Completed Successfully\n\n✅ Issue **TEST-123** has been transitioned.';

			mockIssuesService.transitionIssue.mockResolvedValue(undefined);
			mockIssuesService.addComment.mockResolvedValue({} as any);
			mockIssuesService.get.mockResolvedValue(mockUpdatedIssue as any);
			mockFormatTransitionResult.mockReturnValue(formattedContent);

			const result = await atlassianIssuesTransitionsController.transitionIssue(args);

			expect(mockIssuesService.transitionIssue).toHaveBeenCalledWith(
				'TEST-123',
				{
					transition: { id: '21' },
					fields: { assignee: { accountId: 'user123' } },
					update: undefined,
				},
			);

			expect(mockIssuesService.addComment).toHaveBeenCalledWith('TEST-123', {
				body: {
					body: 'Starting work on this issue',
				},
			});

			expect(mockIssuesService.get).toHaveBeenCalledWith('TEST-123', {
				fields: ['status', 'summary'],
			});

			expect(mockFormatTransitionResult).toHaveBeenCalledWith(
				'TEST-123',
				'21',
				mockUpdatedIssue,
			);

			expect(result).toEqual({
				content: formattedContent,
			});
		});

		it('should transition an issue without a comment', async () => {
			const args = {
				issueIdOrKey: 'TEST-456',
				transitionId: '31',
			};

			const mockUpdatedIssue = {
				id: '10001',
				key: 'TEST-456',
				fields: {
					summary: 'Another Test Issue',
					status: {
						name: 'Done',
					},
				},
			};

			const formattedContent = '# Transition Completed Successfully';

			mockIssuesService.transitionIssue.mockResolvedValue(undefined);
			mockIssuesService.get.mockResolvedValue(mockUpdatedIssue as any);
			mockFormatTransitionResult.mockReturnValue(formattedContent);

			const result = await atlassianIssuesTransitionsController.transitionIssue(args);

			expect(mockIssuesService.transitionIssue).toHaveBeenCalledWith(
				'TEST-456',
				{
					transition: { id: '31' },
					fields: undefined,
					update: undefined,
				},
			);

			expect(mockIssuesService.addComment).not.toHaveBeenCalled();

			expect(mockIssuesService.get).toHaveBeenCalledWith('TEST-456', {
				fields: ['status', 'summary'],
			});

			expect(result).toEqual({
				content: formattedContent,
			});
		});

		it('should handle errors when transitioning fails', async () => {
			const args = {
				issueIdOrKey: 'TEST-789',
				transitionId: '99',
			};

			const error = new Error('Invalid transition');
			mockIssuesService.transitionIssue.mockRejectedValue(error);

			await expect(atlassianIssuesTransitionsController.transitionIssue(args)).rejects.toThrow(
				'Invalid transition',
			);

			expect(mockIssuesService.transitionIssue).toHaveBeenCalledWith(
				'TEST-789',
				{
					transition: { id: '99' },
					fields: undefined,
					update: undefined,
				},
			);

			expect(mockIssuesService.addComment).not.toHaveBeenCalled();
			expect(mockIssuesService.get).not.toHaveBeenCalled();
			expect(mockFormatTransitionResult).not.toHaveBeenCalled();
		});

		it('should handle errors when adding comment fails', async () => {
			const args = {
				issueIdOrKey: 'TEST-999',
				transitionId: '21',
				comment: 'This will fail',
			};

			const error = new Error('Failed to add comment');

			mockIssuesService.transitionIssue.mockResolvedValue(undefined);
			mockIssuesService.addComment.mockRejectedValue(error);

			await expect(atlassianIssuesTransitionsController.transitionIssue(args)).rejects.toThrow(
				'Failed to add comment',
			);

			expect(mockIssuesService.transitionIssue).toHaveBeenCalledWith(
				'TEST-999',
				{
					transition: { id: '21' },
					fields: undefined,
					update: undefined,
				},
			);

			expect(mockIssuesService.addComment).toHaveBeenCalledWith('TEST-999', {
				body: {
					body: 'This will fail',
				},
			});

			expect(mockIssuesService.get).not.toHaveBeenCalled();
			expect(mockFormatTransitionResult).not.toHaveBeenCalled();
		});
	});
});