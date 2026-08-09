export * from './types';
export { getTopXSimilarCoverLetters } from './getTopX';
export { embedCoverLetterSegments } from './embedCoverLetterSegments';
export { normalizeCoverLetterText } from './normalize';
export { openAI, parseCoverLetterSegmentsResponse } from './llm';
export { SEGMENTS_SCHEMA } from './segmentsSchema';
export { COVER_LETTER_SEGMENT_NAMES } from './constants';
export {
    isCoverLetterTextSegments,
    segmentCoverLetter,
} from './coverLetterSegmentation';
export type { SegmentationResult } from './coverLetterSegmentation';
export { generateCoverLetter } from './generate';
export { embedJob } from './embedJob';
