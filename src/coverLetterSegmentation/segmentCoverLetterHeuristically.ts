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

type IndexedLine = {
    text: string;
    index: number;
};

function findSubjectLine(
    lines: IndexedLine[],
    // A position within `lines`, not an `allLines` index.
    salutationPosition?: number,
): IndexedLine | undefined {
    const upperSearchBound = salutationPosition ?? Math.min(lines.length, 5);
    return lines.find((line, position) =>
        position >= upperSearchBound || position > 4
            ? false
            : SUBJECT_PREFIX_PATTERN.test(line.text) ||
              (line.text.length <= 180 &&
                  SUBJECT_KEYWORD_PATTERN.test(line.text)),
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
    const salutationLine = nonEmptyLines[salutationPosition];
    const greetingsLine = [...nonEmptyLines]
        .reverse()
        .find((line) => GREETINGS_PATTERN.test(line.text));
    const subjectLine = findSubjectLine(
        nonEmptyLines,
        salutationLine ? salutationPosition : undefined,
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
    const bodyParagraphs = splitParagraphs(
        bodyStartIndex < bodyEndIndex
            ? allLines
                  .slice(bodyStartIndex, bodyEndIndex)
                  .filter(
                      (_, relativeIndex) =>
                          bodyStartIndex + relativeIndex !== subjectLine?.index,
                  )
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
