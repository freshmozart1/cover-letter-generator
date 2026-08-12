import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { JOB_STRING } from './constants/jobString.js';
import { COVER_LETTER } from './constants/coverLetterSegments.js';
import { WRITING_RULES } from '../src/constants/writingRules.js';
import { JOB } from './constants/job.js';
import { COVER_LETTER_SEGMENT_NAMES } from '../src/constants/segmentNames.js';

describe('/src/generate.ts', () => {
    test('generateCoverLetter() returns a cover letter', async (t) => {
        const expectedOutput = Object.fromEntries(
            COVER_LETTER_SEGMENT_NAMES.map((n) => [
                n,
                { text: COVER_LETTER[n], embedding: [0, 1] },
            ]),
        );
        t.mock.module('../src/llm.js', {
            namedExports: {
                openAI: {
                    responses: {
                        create: async () => ({
                            output_text: JSON.stringify(COVER_LETTER),
                        }),
                    },
                },
                parseCoverLetterSegmentsResponse: () => COVER_LETTER,
            },
        });
        t.mock.module('../src/embedCoverLetterSegments.js', {
            namedExports: {
                embedCoverLetterSegments: t.mock.fn(async () => expectedOutput),
            },
        });
        const generate = await import('../src/generate.js');
        const output = await generate.generateCoverLetter(JOB, [COVER_LETTER]);
        assert.equal(output, expectedOutput);
    });
    test('createCoverLetterPrompt() returns correct prompt', async () => {
        const coverLetterText = Object.values(COVER_LETTER).join('\n');
        const expectedOutput = [
            `Write a cover letter for the following job vacancy:`,
            JOB_STRING,
            '---',
            `Sample cover letters for style and content review:`,
            `Cover Letter 1:\n${coverLetterText}`,
            '---',
            `Rules:`,
            WRITING_RULES,
        ].join('\n\n');
        const output = await import('../src/generate.js').then(
            ({ createCoverLetterPrompt }) =>
                createCoverLetterPrompt(JOB, [COVER_LETTER]),
        );
        assert.strictEqual(output, expectedOutput);
    });
    it('exports generateCoverLetter()', async () => {
        const { generateCoverLetter } = await import('../src/generate.js');
        assert.strictEqual(typeof generateCoverLetter, 'function');
    });
});
