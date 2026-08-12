import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { openAI } from '../src/llm';

describe('/src/embed.ts', () => {
    test('embed() returns embeddings', async (t) => {
        const createSpy = t.mock.method(
            openAI.embeddings,
            'create',
            async () => ({
                data: [{ embedding: [] }, { embedding: [] }],
            }),
        );
        const { embed } = await import('../src/embed.js');
        const arrayOutput = await embed(['test1', 'test2']);
        assert.strictEqual(createSpy.mock.callCount(), 1);
        assert.strictEqual(arrayOutput.length, 2);
        await assert.rejects(embed('test'), {
            message: 'Expected 1 embeddings, but got 2',
        });
        assert.strictEqual(createSpy.mock.callCount(), 2);
        createSpy.mock.mockImplementationOnce(async () => ({
            data: [{ embedding: [] }],
        }));
        const stringOutput = await embed('test');
        assert.strictEqual(createSpy.mock.callCount(), 3);
        assert.strictEqual(stringOutput.length, 1);
    });
    it('exports embed()', async () => {
        const { embed } = await import('../src/embed.js');
        assert.strictEqual(typeof embed, 'function');
    });
});
