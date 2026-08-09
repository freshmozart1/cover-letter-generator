import { test, mock } from 'node:test';
import assert from 'node:assert';

// Dynamic import (not static) so this fallback runs before the module graph
// loads: importing embedCoverLetterSegments.ts transitively evaluates
// src/llm.ts, which instantiates the OpenAI client at module load time and
// throws without a key.
process.env.OPENAI_API_KEY ??= 'test-key';

type EmbedInput = string | string[];
type EmbedFn = (inputs: EmbedInput) => Promise<number[][]>;

// embedCoverLetterSegments.js is an ES module, so the runtime only ever
// evaluates it once per process; its binding to embed() is resolved against
// whichever mock is active at that first import. Re-registering
// mock.module() per test would therefore only affect the very first test.
// Routing every call through this mutable delegate lets each test swap
// behavior without needing a fresh module instance.
let embedImpl: EmbedFn = async () => {
    throw new Error(
        'embed() was called without a mock configured for this test',
    );
};

mock.module('../src/embed.js', {
    namedExports: {
        embed: (inputs: EmbedInput) => embedImpl(inputs),
    },
});

test('empty segments never reach embed()', async () => {
    embedImpl = async (inputs) => {
        const arr = Array.isArray(inputs) ? inputs : [inputs];
        if (arr.some((s) => s === ''))
            throw new Error('would have hit the real API 400');
        return arr.map(() => [0.1, 0.2, 0.3]);
    };
    const { embedCoverLetterSegments } =
        await import('../src/embedCoverLetterSegments.js');

    await assert.doesNotReject(() =>
        embedCoverLetterSegments({
            subject: '',
            salutation: 'Dear Hiring Manager,',
            introduction: 'Introduction text.',
            mainBody: 'Main body text.',
            conclusion: 'Conclusion text.',
            greetings: 'Best regards,',
        }),
    );
});

test('empty segment has no embedding, keeps its text; non-empty segment keeps its embedding', async () => {
    embedImpl = async (inputs) => {
        const arr = Array.isArray(inputs) ? inputs : [inputs];
        return arr.map(() => [0.1, 0.2, 0.3]);
    };
    const { embedCoverLetterSegments } =
        await import('../src/embedCoverLetterSegments.js');

    const result = await embedCoverLetterSegments({
        subject: '',
        salutation: 'Dear Hiring Manager,',
        introduction: 'Introduction text.',
        mainBody: 'Main body text.',
        conclusion: 'Conclusion text.',
        greetings: 'Best regards,',
    });

    assert.strictEqual(result.subject.text, '');
    assert.strictEqual(result.subject.embedding, undefined);
    assert.strictEqual(result.salutation.text, 'Dear Hiring Manager,');
    assert.deepStrictEqual(result.salutation.embedding, [0.1, 0.2, 0.3]);
});

test('all segments empty: embed() is never invoked and no segment has an embedding', async () => {
    embedImpl = async () => {
        throw new Error('embed() should not have been called');
    };
    const { embedCoverLetterSegments } =
        await import('../src/embedCoverLetterSegments.js');

    const result = await embedCoverLetterSegments({
        subject: '',
        salutation: '',
        introduction: '',
        mainBody: '',
        conclusion: '',
        greetings: '',
    });

    for (const name of [
        'subject',
        'salutation',
        'introduction',
        'mainBody',
        'conclusion',
        'greetings',
    ] as const) {
        assert.strictEqual(result[name].text, '');
        assert.strictEqual(result[name].embedding, undefined);
    }
});

test('regression: all non-empty segments still get embedded, in order', async () => {
    embedImpl = async (inputs) => {
        const arr = Array.isArray(inputs) ? inputs : [inputs];
        return arr.map((_, i) => [i]);
    };
    const { embedCoverLetterSegments } =
        await import('../src/embedCoverLetterSegments.js');

    const result = await embedCoverLetterSegments({
        subject: 'Subject text',
        salutation: 'Salutation text',
        introduction: 'Introduction text',
        mainBody: 'Main body text',
        conclusion: 'Conclusion text',
        greetings: 'Greetings text',
    });

    const expectedOrder = [
        'subject',
        'salutation',
        'introduction',
        'mainBody',
        'conclusion',
        'greetings',
    ] as const;

    expectedOrder.forEach((name, index) => {
        assert.deepStrictEqual(result[name].embedding, [index]);
    });
});
