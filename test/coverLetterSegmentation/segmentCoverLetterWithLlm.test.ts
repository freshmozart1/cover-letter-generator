import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { DIRTY_COVER_LETTER_AI_RESPONSE } from '../constants/dirtyCoverLetterAiResponse.js';
import { DIRTY_COVER_LETTER_AI_RESPONSE_SOURCE } from '../constants/dirtyCoverLetterAiResponseSource.js';
import { CoverLetterSegments } from '../../src/types.js';

describe('/src/coverLetterSegmentation/segmentCoverLetterWithLlm.ts', () => {
    it('exports segmentCoverLetterWithLlm()', async () => {
        const { segmentCoverLetterWithLlm } =
            await import('../../src/coverLetterSegmentation/segmentCoverLetterWithLlm.js');
        assert.strictEqual(typeof segmentCoverLetterWithLlm, 'function');
    });
    test('segmentCoverLetterWithLlm() calls openAI.responses.create', async (t) => {
        const { openAI } = await import('../../src/llm.js');
        const createSpy = t.mock.method(
            openAI.responses,
            'create',
            async () => ({
                output_text: DIRTY_COVER_LETTER_AI_RESPONSE,
            }),
        );
        const { segmentCoverLetterWithLlm } =
            await import('../../src/coverLetterSegmentation/segmentCoverLetterWithLlm.js');
        await segmentCoverLetterWithLlm(DIRTY_COVER_LETTER_AI_RESPONSE_SOURCE);
        assert.equal(createSpy.mock.calls.length, 1);
    });
    test('segmentCoverLetterWithLlm() returns normalized segments when every segment is contained in the source text', async (t) => {
        const { openAI } = await import('../../src/llm.js');
        t.mock.method(openAI.responses, 'create', async () => ({
            output_text: DIRTY_COVER_LETTER_AI_RESPONSE,
        }));
        const { segmentCoverLetterWithLlm } =
            await import('../../src/coverLetterSegmentation/segmentCoverLetterWithLlm.js');

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
        const output = await segmentCoverLetterWithLlm(
            DIRTY_COVER_LETTER_AI_RESPONSE_SOURCE,
        );
        assert.deepStrictEqual(output, expectedOutput);
    });
    test('segmentCoverLetterWithLlm() throws when a returned segment is not present in the source text', async (t) => {
        const { openAI } = await import('../../src/llm.js');
        t.mock.method(openAI.responses, 'create', async () => ({
            output_text: DIRTY_COVER_LETTER_AI_RESPONSE,
        }));
        const { segmentCoverLetterWithLlm } =
            await import('../../src/coverLetterSegmentation/segmentCoverLetterWithLlm.js');

        await assert.rejects(
            () =>
                segmentCoverLetterWithLlm(
                    'This source text contains none of the invented segments.',
                ),
            {
                message:
                    'OpenAI returned cover letter segments that are not present in the source text',
            },
        );
    });
});
