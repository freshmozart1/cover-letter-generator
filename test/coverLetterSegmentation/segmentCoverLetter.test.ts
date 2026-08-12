import { it, describe, test, type TestContext, type Mock } from 'node:test';
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

type SegmentCoverLetterMock = {
    segmentCoverLetter: (input: string) => Promise<SegmentationResult>;
};

type SegmentHeuristicallyMock = Mock<() => HeuristicSegmentationResult>;
type NormalizeMock = Mock<(input: string) => string>;
type SegmentWithLlmMock = Mock<() => Promise<CoverLetterSegments>>;
type HeuristicSegmentCoverLetterMock = SegmentCoverLetterMock & {
    normalizeSpy: NormalizeMock;
    segmentHeuristicallySpy: SegmentHeuristicallyMock;
};

type LlmSegmentCoverLetterMock = HeuristicSegmentCoverLetterMock & {
    segmentWithLlmSpy: Mock<() => Promise<CoverLetterSegments>>;
};

// Branching maps 1:1 to the three test scenarios below (heuristic path, LLM
// fallback path, exports-only smoke test); splitting it up would duplicate the
// module-mocking setup across each test instead of centralizing it here.
// fallow-ignore-next-line complexity
async function segmentCoverLetterMockFactory<
    T extends
        | SegmentCoverLetterMock
        | HeuristicSegmentCoverLetterMock
        | LlmSegmentCoverLetterMock,
>(
    t: TestContext,
    nodeModuleReloadString: 'heuristic' | 'llmFallback' | 'exportsCheck',
): Promise<T> {
    let normalizeSpy: NormalizeMock | undefined;
    let segmentHeuristicallySpy: SegmentHeuristicallyMock | undefined;
    let segmentWithLlmSpy: SegmentWithLlmMock | undefined;
    if (nodeModuleReloadString !== 'exportsCheck') {
        normalizeSpy = t.mock.fn<(input: string) => string>(
            () => COVER_LETTER_CLEAN_STRING,
        );
        segmentHeuristicallySpy = t.mock.fn<() => HeuristicSegmentationResult>(
            () =>
                nodeModuleReloadString === 'llmFallback'
                    ? {
                          segments: COVER_LETTER,
                          confidence: 0.95,
                          fallbackReason: FALLBACK_REASON,
                      }
                    : {
                          segments: COVER_LETTER,
                          confidence: 0.95,
                      },
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
    }
    if (nodeModuleReloadString === 'llmFallback') {
        segmentWithLlmSpy = t.mock.fn<() => Promise<CoverLetterSegments>>(
            async () => COVER_LETTER,
        );
        t.mock.module(
            '../../src/coverLetterSegmentation/segmentCoverLetterWithLlm.js',
            {
                namedExports: {
                    segmentCoverLetterWithLlm: segmentWithLlmSpy,
                },
            },
        );
    }
    const { segmentCoverLetter } = (await import(
        `${SEGMENT_COVER_LETTER_MODULE}?case=${nodeModuleReloadString}`
    )) as {
        segmentCoverLetter: (input: string) => Promise<SegmentationResult>;
    };
    if (nodeModuleReloadString === 'exportsCheck')
        return { segmentCoverLetter } as T;
    else if (nodeModuleReloadString === 'llmFallback')
        return {
            segmentCoverLetter,
            normalizeSpy,
            segmentHeuristicallySpy,
            segmentWithLlmSpy,
        } as T;
    else
        return {
            segmentCoverLetter,
            normalizeSpy,
            segmentHeuristicallySpy,
        } as T;
}

describe('/src/coverLetterSegmentation/segmentCoverLetter.ts', () => {
    test("segmentCoverLetter() returns { ...heuristicResult, source: 'heuristic' }, when heuristicResult has no fallbackReason.", async (t) => {
        const { segmentCoverLetter, normalizeSpy, segmentHeuristicallySpy } =
            await segmentCoverLetterMockFactory<HeuristicSegmentCoverLetterMock>(
                t,
                'heuristic',
            );
        const expectedOutput: SegmentationResult = {
            segments: COVER_LETTER,
            confidence: 0.95,
            source: 'heuristic',
        };
        const output = await segmentCoverLetter(COVER_LETTER_DIRTY_STRING);
        assert.strictEqual(normalizeSpy.mock.callCount(), 1);
        assert.strictEqual(segmentHeuristicallySpy.mock.callCount(), 1);
        assert.deepStrictEqual(output, expectedOutput);
    });
    test("segmentCoverLetter() returns { ...llmResult, source: 'llm' }, when heuristicResult has a fallbackReason.", async (t) => {
        const {
            segmentCoverLetter,
            normalizeSpy,
            segmentHeuristicallySpy,
            segmentWithLlmSpy,
        } = await segmentCoverLetterMockFactory<LlmSegmentCoverLetterMock>(
            t,
            'llmFallback',
        );
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
    it('exports segmentCoverLetter()', async () => {
        const { segmentCoverLetter } = await import(
            `${SEGMENT_COVER_LETTER_MODULE}?case=exportsCheck`
        );
        assert.strictEqual(typeof segmentCoverLetter, 'function');
    });
});
