import { normalizeCoverLetterText } from '../normalize';
import { segmentCoverLetterHeuristically } from './segmentCoverLetterHeuristically';
import { segmentCoverLetterWithLlm } from './segmentCoverLetterWithLlm';
import { SegmentationResult } from './types';

/**
 * A function that segments a cover letter into its parts. It first normalizes
 * the input text, then attempts heuristic segmentation. If the heuristic
 * result includes a fallback reason, it falls back to LLM-based segmentation
 * instead.
 * @param input the raw cover letter text to segment
 * @returns a SegmentationResult indicating which strategy ('heuristic' or
 * 'llm') produced the segments, along with a confidence score and, when
 * applicable, a fallbackReason
 */
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
