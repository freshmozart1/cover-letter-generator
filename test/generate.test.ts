import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { JOB_STRING } from './constants/jobString.js';
import { COVER_LETTER } from './constants/coverLetterSegments.js';
import { WRITING_RULES } from '../src/constants/writingRules.js';
import { GENERATOR_MODEL } from '../src/constants/generatorModel.js';
import { GENERATOR_INSTRUCTIONS } from '../src/constants/generatorInstructions.js';
import { JOB } from './constants/job.js';
import { COVER_LETTER_SEGMENT_NAMES } from '../src/constants/segmentNames.js';
import type { CoverLetter, CoverLetterSegments } from '../src/types.js';

type CreateParams = {
    model: string;
    instructions: string;
    input: string;
};

describe('/src/generate.ts', () => {
    test('generateCoverLetter() sends the built prompt to OpenAI and embeds the parsed response', async (t) => {
        const expectedOutput = Object.fromEntries(
            COVER_LETTER_SEGMENT_NAMES.map((n) => [
                n,
                { text: COVER_LETTER[n], embedding: [0, 1] },
            ]),
        ) as CoverLetter;
        const rawAiResponse = JSON.stringify(COVER_LETTER);
        const createSpy = t.mock.fn<
            (params: CreateParams) => Promise<{ output_text: string }>
        >(async () => ({ output_text: rawAiResponse }));
        const parseSpy = t.mock.fn<(input: string) => CoverLetterSegments>(
            () => COVER_LETTER,
        );
        const embedSpy = t.mock.fn<
            (segments: CoverLetterSegments) => Promise<CoverLetter>
        >(async () => expectedOutput);
        t.mock.module('../src/llm.js', {
            namedExports: {
                openAI: { responses: { create: createSpy } },
                parseCoverLetterSegmentsResponse: parseSpy,
            },
        });
        t.mock.module('../src/embedCoverLetterSegments.js', {
            namedExports: {
                embedCoverLetterSegments: embedSpy,
            },
        });
        const generate = await import('../src/generate.js');
        const expectedPrompt = generate.createCoverLetterPrompt(JOB, [
            COVER_LETTER,
        ]);
        const output = await generate.generateCoverLetter(JOB, [COVER_LETTER]);

        assert.strictEqual(createSpy.mock.callCount(), 1);
        const createCall = createSpy.mock.calls[0]?.arguments[0];
        assert.strictEqual(createCall?.model, GENERATOR_MODEL);
        assert.strictEqual(createCall?.instructions, GENERATOR_INSTRUCTIONS);
        assert.strictEqual(createCall?.input, expectedPrompt);

        assert.strictEqual(parseSpy.mock.callCount(), 1);
        assert.strictEqual(parseSpy.mock.calls[0]?.arguments[0], rawAiResponse);

        assert.strictEqual(embedSpy.mock.callCount(), 1);
        assert.strictEqual(embedSpy.mock.calls[0]?.arguments[0], COVER_LETTER);

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
