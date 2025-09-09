import { z } from 'zod';
import { Logger } from './logger.util.js';
import { createApiError } from './error.util.js';

// Create a contextualized logger for this file
const logger = Logger.forContext('utils/validation.util.ts');

// Toggle for testing - skip validation in test environments
export const skipValidation = process.env.NODE_ENV === 'test';

/**
 * Validates API response against a Zod schema
 * @param data The data to validate
 * @param schema The Zod schema to validate against
 * @param context Context for error messages (e.g., "issue details", "issue list")
 * @param serviceIdentifier Optional service identifier for more specific logging
 * @returns The validated data
 * @throws {McpError} If validation fails
 */
export function validateResponse<T>(
	data: unknown,
	schema: z.ZodType<T>,
	context: string,
	serviceIdentifier?: string,
): T {
	const methodLogger = logger.forMethod('validateResponse');
	const logPrefix = serviceIdentifier ? `[${serviceIdentifier}] ` : '';

	// Skip validation in test environment if the flag is set
	if (skipValidation) {
		methodLogger.debug(
			`${logPrefix}Skipping validation for ${context} in test environment`,
		);
		return data as T;
	}

	try {
		methodLogger.debug(`${logPrefix}Validating response for ${context}`);
		return schema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error(
				`${logPrefix}Response validation failed for ${context}:`,
				error.format(),
			);
			throw createApiError(
				`API response validation failed: Invalid Jira ${context} format`,
				500,
				{ zodErrors: error.format() },
			);
		}
		// Re-throw if it's not a Zod error
		methodLogger.error(
			`${logPrefix}Non-Zod error during validation for ${context}:`,
			error,
		);
		throw error;
	}
}
