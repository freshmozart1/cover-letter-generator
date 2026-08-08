import { CoverLetterSegments } from '../types';

type HeuristicSegmentationResult = {
    segments: CoverLetterSegments;
    confidence: number;
    fallbackReason?: string;
};

type SegmentationResult = HeuristicSegmentationResult & {
    source: 'heuristic' | 'llm';
};

type BodySegments = Pick<
    CoverLetterSegments,
    'introduction' | 'mainBody' | 'conclusion'
>;
export type {
    CoverLetterSegments,
    HeuristicSegmentationResult,
    SegmentationResult,
    BodySegments,
};
