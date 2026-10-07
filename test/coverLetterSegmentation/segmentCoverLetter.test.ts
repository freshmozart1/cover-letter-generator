import { describe, test, type TestContext } from 'node:test';
import assert from 'node:assert';
import {
    CoverLetterSegments,
    HeuristicSegmentationResult,
    SegmentationResult,
} from '../../src/coverLetterSegmentation';
import { COVER_LETTER_CLEAN_STRING } from '../constants/coverLetterCleanString';
import { COVER_LETTER_DIRTY_STRING } from '../constants/coverLetterDirtyString';
import { COVER_LETTER } from '../constants/coverLetterSegments';

const SEGMENT_COVER_LETTER_MODULE =
    '../../src/coverLetterSegmentation/segmentCoverLetter.js';

const FALLBACK_REASON = 'aluhut snackbar';

async function segmentCoverLetterMockFactory(
    t: TestContext,
    nodeModuleReloadString: 'heuristic' | 'llmFallback',
) {
    const normalizeSpy = t.mock.fn<(input: string) => string>(
        () => COVER_LETTER_CLEAN_STRING,
    );
    const segmentHeuristicallySpy = t.mock.fn<
        () => HeuristicSegmentationResult
    >(() => ({
        segments: COVER_LETTER,
        confidence: 0.95,
        ...(nodeModuleReloadString === 'llmFallback'
            ? { fallbackReason: FALLBACK_REASON }
            : {}),
    }));
    const segmentWithLlmSpy = t.mock.fn<() => Promise<CoverLetterSegments>>(
        async () => COVER_LETTER,
    );
    t.mock.module('../../src/normalize.js', {
        namedExports: {
            normalizeCoverLetterText: normalizeSpy,
        },
    });
    t.mock.module(
        '../../src/coverLetterSegmentation/segmentCoverLetterHeuristically.js',
        {
            namedExports: {
                segmentCoverLetterHeuristically: segmentHeuristicallySpy,
            },
        },
    );
    t.mock.module(
        '../../src/coverLetterSegmentation/segmentCoverLetterWithLlm.js',
        {
            namedExports: {
                segmentCoverLetterWithLlm: segmentWithLlmSpy,
            },
        },
    );
    const { segmentCoverLetter } = (await import(
        `${SEGMENT_COVER_LETTER_MODULE}?case=${nodeModuleReloadString}`
    )) as {
        segmentCoverLetter: (input: string) => Promise<SegmentationResult>;
    };
    return {
        segmentCoverLetter,
        normalizeSpy,
        segmentHeuristicallySpy,
        segmentWithLlmSpy,
    };
}

describe('/src/coverLetterSegmentation/segmentCoverLetter.ts', () => {
    test("segmentCoverLetter() returns { ...heuristicResult, source: 'heuristic' }, when heuristicResult has no fallbackReason.", async (t) => {
        const {
            segmentCoverLetter,
            normalizeSpy,
            segmentHeuristicallySpy,
            segmentWithLlmSpy,
        } = await segmentCoverLetterMockFactory(t, 'heuristic');
        const expectedOutput: SegmentationResult = {
            segments: COVER_LETTER,
            confidence: 0.95,
            source: 'heuristic',
        };
        const output = await segmentCoverLetter(COVER_LETTER_DIRTY_STRING);
        assert.strictEqual(normalizeSpy.mock.callCount(), 1);
        assert.strictEqual(segmentHeuristicallySpy.mock.callCount(), 1);
        assert.strictEqual(segmentWithLlmSpy.mock.callCount(), 0);
        assert.deepStrictEqual(output, expectedOutput);
    });
    test("segmentCoverLetter() returns { ...llmResult, source: 'llm' }, when heuristicResult has a fallbackReason.", async (t) => {
        const {
            segmentCoverLetter,
            normalizeSpy,
            segmentHeuristicallySpy,
            segmentWithLlmSpy,
        } = await segmentCoverLetterMockFactory(t, 'llmFallback');
        const output = await segmentCoverLetter(COVER_LETTER_DIRTY_STRING);
        const expectedOutput: SegmentationResult = {
            segments: COVER_LETTER,
            confidence: 0.95,
            source: 'llm',
            fallbackReason: FALLBACK_REASON,
        };
        assert.strictEqual(normalizeSpy.mock.callCount(), 1);
        assert.strictEqual(segmentHeuristicallySpy.mock.callCount(), 1);
        assert.strictEqual(segmentWithLlmSpy.mock.callCount(), 1);
        assert.deepStrictEqual(output, expectedOutput);
    });
});
