import type { CoverLetter, CoverLetterSegments, Job } from './types';
import { SEGMENTS_SCHEMA } from './segmentsSchema';
import { openAI, parseCoverLetterSegmentsResponse } from './llm';
import { COVER_LETTER_SEGMENT_NAMES } from './constants';
import { embedCoverLetterSegments } from './embedCoverLetterSegments';

const GENERATOR_MODEL = 'gpt-5.6-sol';
const GENERATOR_INSTRUCTIONS = `You are an experienced career counselor who crafts professional, authentic cover letters.
You carefully analyze sample cover letters to identify and incorporate the writer’s writing style, tone, and personal characteristics.`;

/**
 * A function to convert jobs into strings.
 * @param job The job thats needs to be converted to a string.
 * @returns The converted job
 */
function jobToText(job: Job): string {
    return `Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? 'Not specified'}
Description: ${job.description ?? 'Not specified'}`;
}

/**
 * A function to convert cover letters into strings.
 * @param coverLetter The cover letter that needs to be converted to a string.
 * @returns The converted cover letter
 */
function coverLetterToText(coverLetter: CoverLetter): string {
    const coverLetterSegments: CoverLetterSegments = {
        subject: coverLetter.subject.text,
        salutation: coverLetter.salutation.text,
        introduction: coverLetter.introduction.text,
        mainBody: coverLetter.mainBody.text,
        conclusion: coverLetter.conclusion.text,
        greetings: coverLetter.greetings.text,
    };
    return COVER_LETTER_SEGMENT_NAMES.map(
        (segmentName) => coverLetterSegments[segmentName],
    )
        .filter((segmentText) => segmentText.trim().length > 0)
        .join(`\n\n`);
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
    exampleCoverLetters: CoverLetter[],
): Promise<CoverLetter> {
    const generatorInput: string = [
        `Write a cover letter for the following job vacancy:\n`,
        jobToText(job) + '\n',
        `---\n`,
        `Sample cover letters for style and content review:\n`,
        `${exampleCoverLetters.map((cl, i) => `Cover Letter ${i + 1}:\n${coverLetterToText(cl)}`).join(`\n\n`)}\n`,
        `---\n`,
        `Rules:\n`,
        `- Write a new cover letter tailored specifically to this position.`,
        `- Adopt the personal writing style and tone used in the references.`,
        `- Carefully tailor the wording, specific points, and key focus areas to this position.`,
        `- Return only the final cover letter, without any comments.`,
        `- Use the same language in the cover letter as in the job posting.`,
        `- Limit the cover letter to a maximum of 250 words.`,
        `- Segment the cover letter into the requested fields.`,
    ].join('\n');
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
