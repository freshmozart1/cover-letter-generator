import type { Job } from './types';

/**
 * A function to convert jobs into strings.
 * @param job The job thats needs to be converted to a string.
 * @returns The converted job
 */
export function jobToText(job: Job): string {
    return `Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? 'Not specified'}
Description: ${job.description}`;
}
