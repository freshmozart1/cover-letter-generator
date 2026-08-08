import type { CoverLetterSegments } from '../types';

export function isCoverLetterTextSegments(
    value: unknown,
): value is CoverLetterSegments {
    return (
        typeof value === 'object' &&
        value !== null &&
        'subject' in value &&
        typeof value.subject === 'string' &&
        'salutation' in value &&
        typeof value.salutation === 'string' &&
        'introduction' in value &&
        typeof value.introduction === 'string' &&
        'mainBody' in value &&
        typeof value.mainBody === 'string' &&
        'conclusion' in value &&
        typeof value.conclusion === 'string' &&
        'greetings' in value &&
        typeof value.greetings === 'string'
    );
}
