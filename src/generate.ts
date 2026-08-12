import type { CoverLetter, CoverLetterSegments, Job } from './types';
import { SEGMENTS_SCHEMA } from './constants/segmentsSchema';
import { openAI, parseCoverLetterSegmentsResponse } from './llm';
import { embedCoverLetterSegments } from './embedCoverLetterSegments';
import { jobToText } from './jobToText';
import { normalizeCoverLetterText } from './normalize';
import { WRITING_RULES } from './constants/writingRules';
import { GENERATOR_INSTRUCTIONS } from './constants/generatorInstructions';
import { GENERATOR_MODEL } from './constants/generatorModel';

/**
 * This function creates ai prompts for writing cover letters
 * @param job the job that somebody wants to apply to
 * @param exampleCoverLetterSegments Examples of cover letters for the AI
 * @returns a prompt that instructs an ai to write cover letters
 */
export function createCoverLetterPrompt(
    job: Job,
    exampleCoverLetterSegments: CoverLetterSegments[],
): string {
    return [
        `Write a cover letter for the following job vacancy:`,
        jobToText(job),
        `---`,
        `Sample cover letters for style and content review:`,
        `${exampleCoverLetterSegments.map((cl, i) => `Cover Letter ${i + 1}:\n${normalizeCoverLetterText(cl)}`).join(`\n\n`)}`,
        `---`,
        `Rules:`,
        WRITING_RULES,
    ].join('\n\n');
}

/**
 * This function takes a job posting and an array of sample cover letters
 * that have a high cosine similarity to that job posting,
 * and then generates a new cover letter by using the job posting
 * and the samples as a basis, returning the AI-generated cover letter.
 * @param job The job the consumer wants to apply for
 * @param exampleCoverLetters An array of example cover letters with high cosine similarity to the job
 */
export async function generateCoverLetter(
    job: Job,
    exampleCoverLetters: CoverLetterSegments[],
): Promise<CoverLetter> {
    const generatorInput: string = createCoverLetterPrompt(
        job,
        exampleCoverLetters,
    );
    const aiResponse = await openAI.responses.create({
        model: GENERATOR_MODEL,
        instructions: GENERATOR_INSTRUCTIONS,
        input: generatorInput,
        text: {
            format: {
                type: 'json_schema',
                name: 'cover_letter',
                strict: true,
                schema: SEGMENTS_SCHEMA,
            },
        },
    });
    return embedCoverLetterSegments(
        parseCoverLetterSegmentsResponse(aiResponse.output_text),
    );
}
