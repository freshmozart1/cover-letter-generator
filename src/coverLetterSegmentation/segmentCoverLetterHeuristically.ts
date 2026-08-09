import {
    BodySegments,
    CoverLetterSegments,
    HeuristicSegmentationResult,
} from './types';

const SUBJECT_PREFIX_PATTERN = /^(?:betreff|betr\.?|subject|re)\s*[:-]/iu;
const SUBJECT_KEYWORD_PATTERN =
    /\b(?:bewerbung|application|applying|position|stelle|ausbildung|praktikum)\b/iu;
const SALUTATION_PATTERN =
    /^(?:sehr geehrte(?:r|\s+damen\s+und\s+herren|\s+frau|\s+herr)|liebe(?:r|\s)|dear\s+|to whom it may concern|dear hiring manager|dear sir or madam)/iu;
const GREETINGS_PATTERN =
    /^(?:mit freundlichen gr(?:ü|ue)ßen|freundliche gr(?:ü|ue)ße|viele gr(?:ü|ue)ße|herzliche gr(?:ü|ue)ße|beste gr(?:ü|ue)ße|kind regards|best regards|sincerely|yours faithfully|yours sincerely|regards)\b/iu;
const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?])\s+/u;
const MAX_SUBJECT_SEARCH_LINES = 5;

type IndexedLine = {
    text: string;
    index: number;
};

/**
 * A function that finds the subject line of a cover letter. It only searches the
 * lines above the salutation. When a salutation was found, its position is used
 * as the exact upper bound of the search — no arbitrary line-count cap is
 * applied. Only when no salutation was found does the search fall back to the
 * first {@link MAX_SUBJECT_SEARCH_LINES} non-empty lines.
 * @param lines the non-empty lines of the cover letter, in document order
 * @param salutationPosition index of the salutation **within `lines`** — a
 * position, not an `allLines` index. Omit it when no salutation was found.
 * @returns the subject line, or `undefined` if there is none
 */
function findSubjectLine(
    lines: IndexedLine[],
    salutationPosition?: number,
): IndexedLine | undefined {
    const upperSearchBound = salutationPosition ?? MAX_SUBJECT_SEARCH_LINES;
    return lines.find(
        (line, position) =>
            position < upperSearchBound &&
            (SUBJECT_PREFIX_PATTERN.test(line.text) ||
                (line.text.length <= 180 &&
                    SUBJECT_KEYWORD_PATTERN.test(line.text))),
    );
}

function splitParagraphs(lines: string[]): string[] {
    return lines
        .join('\n')
        .split(/\n{2,}/u)
        .map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
        .filter((paragraph) => paragraph.length > 0);
}

function buildBodySegments(bodyParagraphs: string[]): BodySegments {
    if (bodyParagraphs.length === 0)
        return { introduction: '', mainBody: '', conclusion: '' };
    if (bodyParagraphs.length === 1) {
        const { remainingText, lastSentence } = splitLastSentence(
            bodyParagraphs[0] ?? '',
        );
        return {
            introduction: remainingText,
            mainBody: '',
            conclusion: lastSentence,
        };
    }

    if (bodyParagraphs.length === 2) {
        return {
            introduction: bodyParagraphs[0] ?? '',
            mainBody: '',
            conclusion: bodyParagraphs[1] ?? '',
        };
    }

    return {
        introduction: bodyParagraphs[0] ?? '',
        mainBody: bodyParagraphs.slice(1, -1).join('\n\n'),
        conclusion: bodyParagraphs[bodyParagraphs.length - 1] ?? '',
    };
}

function splitLastSentence(paragraph: string): {
    remainingText: string;
    lastSentence: string;
} {
    const sentences = paragraph
        .split(SENTENCE_BOUNDARY_PATTERN)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length > 0);

    if (sentences.length < 2) {
        return { remainingText: '', lastSentence: paragraph.trim() };
    }

    const lastSentence = sentences[sentences.length - 1];

    if (!lastSentence) {
        return { remainingText: '', lastSentence: paragraph.trim() };
    }

    return {
        remainingText: sentences.slice(0, -1).join(' '),
        lastSentence,
    };
}

function scoreHeuristicSegments(
    segments: CoverLetterSegments,
    hasOrderedMarkers: boolean,
    hasMultipleBodyParagraphs: boolean,
): HeuristicSegmentationResult {
    if (!segments.salutation) {
        return {
            segments,
            confidence: 0.25,
            fallbackReason: 'salutation not found',
        };
    }

    if (!segments.greetings) {
        return {
            segments,
            confidence: 0.35,
            fallbackReason: 'greetings not found',
        };
    }

    if (!hasOrderedMarkers) {
        return {
            segments,
            confidence: 0.2,
            fallbackReason: 'salutation and greetings are not in a valid order',
        };
    }

    if (!segments.introduction || !segments.conclusion) {
        return {
            segments,
            confidence: 0.45,
            fallbackReason:
                'body could not be split into introduction and conclusion',
        };
    }

    if (!hasMultipleBodyParagraphs && !segments.mainBody) {
        return {
            segments,
            confidence: 0.55,
            fallbackReason: 'single-paragraph body without main body',
        };
    }

    return { segments, confidence: segments.mainBody ? 0.95 : 0.75 };
}

function createEmptyTextSegments(): CoverLetterSegments {
    return {
        subject: '',
        salutation: '',
        introduction: '',
        mainBody: '',
        conclusion: '',
        greetings: '',
    };
}

export function segmentCoverLetterHeuristically(
    input: string,
): HeuristicSegmentationResult {
    const allLines = input.split('\n');
    const nonEmptyLines = allLines
        .map<IndexedLine>((text, index) => ({ text, index }))
        .filter((line) => line.text.length > 0);
    // Position within nonEmptyLines, not an allLines index — findSubjectLine bounds
    // its scan by iteration position, so it needs this rather than salutationLine.index.
    const salutationPosition = nonEmptyLines.findIndex((line) =>
        SALUTATION_PATTERN.test(line.text),
    );
    const salutationLine =
        salutationPosition === -1
            ? undefined
            : nonEmptyLines[salutationPosition];
    const greetingsLine = nonEmptyLines.findLast((line) =>
        GREETINGS_PATTERN.test(line.text),
    );
    const subjectLine = findSubjectLine(
        nonEmptyLines,
        salutationPosition === -1 ? undefined : salutationPosition,
    );
    const hasOrderedMarkers =
        salutationLine !== undefined &&
        greetingsLine !== undefined &&
        salutationLine.index < greetingsLine.index;
    const bodyStartIndex = salutationLine
        ? salutationLine.index + 1
        : subjectLine
          ? subjectLine.index + 1
          : 0;
    const bodyEndIndex = greetingsLine?.index ?? allLines.length;
    // No subject-line filter needed here: findSubjectLine only ever looks above the
    // salutation, so subjectLine.index is always below bodyStartIndex.
    const bodyParagraphs = splitParagraphs(
        bodyStartIndex < bodyEndIndex
            ? allLines.slice(bodyStartIndex, bodyEndIndex)
            : [],
    );
    const bodySegments = buildBodySegments(bodyParagraphs);
    const segments: CoverLetterSegments = {
        ...createEmptyTextSegments(),
        subject: subjectLine?.text ?? '',
        salutation: salutationLine?.text ?? '',
        ...bodySegments,
        greetings: greetingsLine
            ? allLines
                  .slice(greetingsLine.index)
                  .filter((line) => line.trim().length > 0)
                  .join('\n')
            : '',
    };

    return scoreHeuristicSegments(
        segments,
        hasOrderedMarkers,
        bodyParagraphs.length > 1,
    );
}
