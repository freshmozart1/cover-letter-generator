import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('/src/index.ts', () => {
    it('exports exactly the intended public surface', async () => {
        // Dynamic import (not static) so this fallback runs before the module graph
        // loads: importing the entry point transitively evaluates src/llm.ts, which
        // instantiates the OpenAI client at module load time and throws without a key.
        process.env.OPENAI_API_KEY ??= 'test-key';
        const entryPoint = await import('../src/index.js');

        assert.strictEqual(
            typeof entryPoint.embedCoverLetterSegments,
            'function',
        );
        assert.strictEqual(typeof entryPoint.embedJob, 'function');
        assert.strictEqual(typeof entryPoint.generateCoverLetter, 'function');
        assert.strictEqual(
            typeof entryPoint.getTopXSimilarCoverLetters,
            'function',
        );
        assert.ok(Array.isArray(entryPoint.COVER_LETTER_SEGMENT_NAMES));
        assert.strictEqual(typeof entryPoint.segmentCoverLetter, 'function');

        // Locks the surface to exactly these six runtime exports, so an
        // unintended future addition fails loudly. Type-only exports
        // (CoverLetter, CoverLetterSegments, Job, SegmentationResult) are
        // erased at compile time and never appear here; npm run typecheck
        // covers those.
        assert.deepStrictEqual(Object.keys(entryPoint).sort(), [
            'COVER_LETTER_SEGMENT_NAMES',
            'embedCoverLetterSegments',
            'embedJob',
            'generateCoverLetter',
            'getTopXSimilarCoverLetters',
            'segmentCoverLetter',
        ]);
    });
});
