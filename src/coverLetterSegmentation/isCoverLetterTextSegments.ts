import { COVER_LETTER_SEGMENT_NAMES } from '../constants/segmentNames';
import type { CoverLetterSegmentName, CoverLetterSegments } from '../types';

export function isCoverLetterTextSegments(
    value: unknown,
): value is CoverLetterSegments {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;

    return (
        Object.keys(candidate).every((key) =>
            COVER_LETTER_SEGMENT_NAMES.includes(key as CoverLetterSegmentName),
        ) &&
        COVER_LETTER_SEGMENT_NAMES.every(
            (segmentName) => typeof candidate[segmentName] === 'string',
        )
    );
}
