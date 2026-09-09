import { describe, test } from 'node:test';
import assert from 'node:assert';
import { GENERATOR_MODEL } from '../src/constants/generatorModel.js';
import { GENERATOR_REASONING_EFFORT } from '../src/constants/generatorReasoningEffort.js';
import type { CoverLetterRevisionInput } from '../src/types.js';

type CreateParams = {
    model: string;
    instructions: string;
    input: string;
    reasoning: { effort: string };
    text: {
        format: {
            type: string;
            name: string;
            strict: boolean;
            schema: unknown;
        };
    };
};

type CreateResult = {
    output_text: string;
    status?: string;
    incomplete_details?: { reason: string };
};

const REVISION_INPUT: CoverLetterRevisionInput = {
    selectedText: 'I am very interested in this role.',
    instruction: 'Make this more specific and confident.',
    coverLetterText:
        'Dear Hiring Manager,\n\nI am very interested in this role.\n\nKind regards',
    job: {
        title: 'Software Engineer',
        company: 'Example Company',
        location: 'Berlin',
        description: 'Build reliable TypeScript services.',
    },
};

describe('/src/reviseCoverLetterText.ts', () => {
    test('sends every context field to OpenAI and returns only the replacement passage', async (t) => {
        const replacementText =
            'My TypeScript experience equips me to contribute confidently to this role.';
        const createSpy = t.mock.fn<
            (params: CreateParams) => Promise<CreateResult>
        >(async () => ({
            output_text: JSON.stringify({ replacementText }),
        }));
        t.mock.module('../src/llm.js', {
            namedExports: {
                openAI: { responses: { create: createSpy } },
            },
        });

        const revision = await import('../src/reviseCoverLetterText.js');
        const output = await revision.reviseCoverLetterText(REVISION_INPUT);

        assert.strictEqual(output, replacementText);
        assert.strictEqual(createSpy.mock.callCount(), 1);
        const params = createSpy.mock.calls[0]?.arguments[0];
        assert.strictEqual(params?.model, GENERATOR_MODEL);
        assert.strictEqual(
            params?.reasoning?.effort,
            GENERATOR_REASONING_EFFORT,
        );
        assert.strictEqual(params?.text.format.type, 'json_schema');
        assert.strictEqual(params?.text.format.name, 'cover_letter_revision');
        assert.strictEqual(params?.text.format.strict, true);
        assert.match(
            params?.instructions ?? '',
            /preserve the draft's language/i,
        );
        assert.match(params?.instructions ?? '', /never invent experience/i);
        assert.match(
            params?.instructions ?? '',
            /no explanation or Markdown fence/i,
        );
        assert.match(
            params?.input ?? '',
            /I am very interested in this role\./,
        );
        assert.match(
            params?.input ?? '',
            /Make this more specific and confident\./,
        );
        assert.match(params?.input ?? '', /Dear Hiring Manager,/);
        assert.match(params?.input ?? '', /Software Engineer/);
        assert.match(params?.input ?? '', /Example Company/);
        assert.match(params?.input ?? '', /Berlin/);
        assert.match(
            params?.input ?? '',
            /Build reliable TypeScript services\./,
        );

        assert.strictEqual(
            revision.parseCoverLetterRevisionResponse(
                JSON.stringify({ replacementText: 'Line one\n\nLine two' }),
            ),
            'Line one\n\nLine two',
        );
        assert.throws(
            () => revision.parseCoverLetterRevisionResponse('not json'),
            SyntaxError,
        );
        assert.throws(
            () =>
                revision.parseCoverLetterRevisionResponse(
                    JSON.stringify({ replacementText: '   ' }),
                ),
            /valid replacement passage/,
        );
        assert.throws(
            () =>
                revision.parseCoverLetterRevisionResponse(
                    JSON.stringify({
                        replacementText: '```text\nrevision\n```',
                    }),
                ),
            /Markdown fence/,
        );

        createSpy.mock.mockImplementationOnce(async () => ({
            output_text: '',
            status: 'incomplete',
            incomplete_details: { reason: 'max_output_tokens' },
        }));
        await assert.rejects(
            revision.reviseCoverLetterText(REVISION_INPUT),
            /incomplete replacement passage \(max_output_tokens\)/,
        );
    });
});
