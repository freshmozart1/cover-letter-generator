import { test } from 'node:test';
import assert from 'node:assert';

test('segmentCoverLetter is exported from the package entry point as a function', async () => {
    // Dynamic import (not static) so this fallback runs before the module graph
    // loads: importing the entry point transitively evaluates src/llm.ts, which
    // instantiates the OpenAI client at module load time and throws without a key.
    process.env.OPENAI_API_KEY ??= 'test-key';
    const { segmentCoverLetter } = await import('../src/index.js');
    assert.strictEqual(typeof segmentCoverLetter, 'function');
});
