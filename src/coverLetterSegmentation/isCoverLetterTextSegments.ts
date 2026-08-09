import type { CoverLetterSegments } from '../types';
import { COVER_LETTER_SEGMENT_NAMES } from '../constants';

export function isCoverLetterTextSegments(
    value: unknown,
): value is CoverLetterSegments {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return COVER_LETTER_SEGMENT_NAMES.every(
        (segmentName) => typeof candidate[segmentName] === 'string',
    );
}
