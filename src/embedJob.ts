import type { Job, TextEmbedding } from './types';
import { embed } from './embed';
import { jobToText } from './jobToText';

/**
 * Embeds a job posting using the same text representation used for cover letter generation,
 * so the resulting vector is comparable to letters embedded by embedCoverLetterSegments.
 * @param job The job to embed
 * @returns a text embedding vector for the job
 */
export async function embedJob(job: Job): Promise<TextEmbedding> {
    const [embedding] = await embed(jobToText(job));
    if (!embedding) throw new Error('Failed to embed job posting');
    return embedding;
}
