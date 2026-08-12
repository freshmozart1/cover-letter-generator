import { it, describe, beforeEach, test } from 'node:test';
import assert from 'node:assert';
import { CoverLetterSegments } from '../src/types.js';
import { COVER_LETTER_DIRTY_JSON } from './constants/coverLetterDirtyJson.js';

describe('/src/llm.ts', () => {
    beforeEach(() => {
        process.env.OPENAI_API_KEY ??= 'test-key';
    });
    it('exports parseCoverLetterSegmentsResponse()', async () => {
        const { parseCoverLetterSegmentsResponse } =
            await import('../src/llm.js');
        assert.strictEqual(typeof parseCoverLetterSegmentsResponse, 'function');
    });
    it('exports const openAI', async () => {
        const { openAI } = await import('../src/llm.js');
        assert.strictEqual(typeof openAI, 'object');
    });
    test('parseCoverLetterSegmentsResponse(input) throws if input is not a cover letter', async () => {
        const { parseCoverLetterSegmentsResponse } =
            await import('../src/llm.js');
        assert.throws(
            () => {
                parseCoverLetterSegmentsResponse('null');
            },
            { message: 'OpenAI did not return valid cover letter segments' },
        );
        assert.throws(
            () => {
                parseCoverLetterSegmentsResponse('[]');
            },
            { message: 'OpenAI did not return valid cover letter segments' },
        );
        assert.throws(
            () => {
                parseCoverLetterSegmentsResponse('');
            },
            { message: 'Unexpected end of JSON input' },
        );
        assert.throws(
            () => {
                parseCoverLetterSegmentsResponse('1');
            },
            { message: 'OpenAI did not return valid cover letter segments' },
        );
    });
    test('parseCoverLetterSegmentsResponse(input) returns normalized cover letter segments', async () => {
        const { parseCoverLetterSegmentsResponse } =
            await import('../src/llm.js');

        const expectedOutput: CoverLetterSegments = {
            subject: 'Bewerbung',
            salutation: 'Sehr geehrte Damen und Herren,',
            introduction:
                'ich habe Erfahrung mit Änderungen, öffentlichen Projekten und übernehme gerne Verantwortung für anspruchsvolle Aufgaben.',
            mainBody:
                'Meine Stärken liegen in der Entwicklung robuster Lösungen.',
            conclusion: 'Außerdem arbeite ich gerne im Team.',
            greetings: 'Mit freundlichen Grüßen Ole Köster',
        };
        const output = parseCoverLetterSegmentsResponse(
            COVER_LETTER_DIRTY_JSON,
        );
        assert.deepStrictEqual(output, expectedOutput);
    });
});
