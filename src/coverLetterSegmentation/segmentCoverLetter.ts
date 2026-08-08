import { normalizeCoverLetterText } from '../normalize';
import { segmentCoverLetterHeuristically } from './segmentCoverLetterHeuristically';
import { segmentCoverLetterWithLlm } from './segmentCoverLetterWithLlm';
import { SegmentationResult } from './types';

export async function segmentCoverLetter(
    input: string,
): Promise<SegmentationResult> {
    const normalizedInput = normalizeCoverLetterText(input);
    const heuristicResult = segmentCoverLetterHeuristically(normalizedInput);
    if (!heuristicResult.fallbackReason)
        return { ...heuristicResult, source: 'heuristic' };
    const fallbackSegments = await segmentCoverLetterWithLlm(normalizedInput);
    return {
        segments: fallbackSegments,
        source: 'llm',
        confidence: heuristicResult.confidence,
        fallbackReason: heuristicResult.fallbackReason,
    };
}
