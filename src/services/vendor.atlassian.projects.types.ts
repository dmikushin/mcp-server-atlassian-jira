/**
 * Types for Atlassian Jira Projects API
 */
import { z } from 'zod';

/**
 * Project style enum
 */
const ProjectStyleSchema = z.enum(['classic', 'next-gen']);

/**
 * Project avatar URLs
 */
const ProjectAvatarUrlsSchema = z.object({
	'16x16': z.string().url(),
	'24x24': z.string().url(),
	'32x32': z.string().url(),
	'48x48': z.string().url(),
});

/**
 * Project insight information
 */
const ProjectInsightSchema = z.object({
	lastIssueUpdateTime: z.string(),
	totalIssueCount: z.number(),
});

/**
 * Project category
 */
const ProjectCategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	self: z.string().url(),
});

/**
 * Project object returned from the API
 */
const ProjectSchema = z.object({
	id: z.string(),
	key: z.string(),
	name: z.string(),
	self: z.string().url(),
	simplified: z.boolean(),
	style: ProjectStyleSchema,
	avatarUrls: ProjectAvatarUrlsSchema,
	insight: ProjectInsightSchema.optional(),
	projectCategory: ProjectCategorySchema.optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

/**
 * Project component
 */
const ProjectComponentSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	lead: z
		.object({
			id: z.string(),
			displayName: z.string(),
		})
		.optional(),
	assigneeType: z.string().optional(),
	assignee: z
		.object({
			id: z.string(),
			displayName: z.string(),
		})
		.optional(),
	self: z.string().url(),
});

/**
 * Project version
 */
const ProjectVersionSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	archived: z.boolean(),
	released: z.boolean(),
	releaseDate: z.string().optional(),
	startDate: z.string().optional(),
	self: z.string().url(),
});

/**
 * Extended project object with optional fields
 */
const ProjectDetailedSchema = ProjectSchema.extend({
	description: z.string().optional(),
	lead: z
		.object({
			id: z.string().optional(),
			displayName: z.string(),
			active: z.boolean(),
			self: z.string().optional(),
			accountId: z.string().optional(),
			avatarUrls: z.record(z.string(), z.string()).optional(),
		})
		.optional(),
	components: z.array(ProjectComponentSchema),
	versions: z.array(ProjectVersionSchema),
	properties: z
		.object({
			results: z.array(z.any()).optional(),
			meta: z.any().optional(),
			_links: z.any().optional(),
		})
		.optional(),
});
export type ProjectDetailed = z.infer<typeof ProjectDetailedSchema>;

/**
 * Parameters for listing projects
 */
export interface ListProjectsParams {
	ids?: string[];
	keys?: string[];
	query?: string;
	typeKey?: string;
	categoryId?: string;
	action?: string;
	expand?: string[];
	status?: string[];
	orderBy?: string;
	startAt?: number;
	maxResults?: number;
}

/**
 * Parameters for getting a project by ID or key
 */
export interface GetProjectByIdParams {
	expand?: string[];
	includeComponents?: boolean;
	includeVersions?: boolean;
	includeProperties?: boolean;
}

/**
 * API response for listing projects
 */
const ProjectsResponseSchema = z.object({
	isLast: z.boolean(),
	maxResults: z.number(),
	nextPage: z.string().optional(),
	self: z.string().url(),
	startAt: z.number(),
	total: z.number(),
	values: z.array(ProjectSchema),
});
export type ProjectsResponse = z.infer<typeof ProjectsResponseSchema>;

// Export schemas needed by the service implementation
export { ProjectSchema, ProjectDetailedSchema, ProjectsResponseSchema };
