import { COVER_LETTER_SEGMENT_NAMES } from '../constants';
import type { CoverLetterSegments } from '../types';

export function isCoverLetterTextSegments(
    value: unknown,
): value is CoverLetterSegments {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return COVER_LETTER_SEGMENT_NAMES.every(
        (name) => name in record && typeof record[name] === 'string',
    );
}
