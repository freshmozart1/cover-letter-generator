import { test } from 'node:test';
import assert from 'node:assert';
// Static import is safe here (unlike test/index.test.ts): this module only has
// type-only imports, so it never evaluates src/llm.ts and needs no API key.
import { segmentCoverLetterHeuristically } from '../../src/coverLetterSegmentation/segmentCoverLetterHeuristically';

test('does not mistake an introduction for a subject line when a letterhead precedes the salutation', () => {
    // The salutation sits at nonEmptyLines position 2 but allLines index 4, so a
    // bound taken from the allLines index would let the subject scan run past it
    // into the body and swallow the introduction.
    const input = [
        'Max Mustermann',
        '',
        'Musterstadt, 1. Januar 2026',
        '',
        'Sehr geehrte Frau Muster,',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
        '',
        'Ich arbeite seit fünf Jahren in der Softwareentwicklung.',
        '',
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    // The wrong subject also collapsed the body to two paragraphs and scored 0.75,
    // so pin the score too — not just the segments.
    assert.strictEqual(fallbackReason, undefined);
    assert.strictEqual(confidence, 0.95);
    assert.strictEqual(segments.subject, '');
    assert.strictEqual(
        segments.introduction,
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
    );
    assert.strictEqual(
        segments.mainBody,
        'Ich arbeite seit fünf Jahren in der Softwareentwicklung.',
    );
    assert.strictEqual(
        segments.conclusion,
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
    );
});

test('still finds a genuine subject line on the non-empty line before the salutation', () => {
    const input = [
        'Betreff: Bewerbung als Entwicklerin',
        '',
        'Sehr geehrte Frau Muster,',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
        '',
        'Ich arbeite seit fünf Jahren in der Softwareentwicklung.',
        '',
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    assert.strictEqual(fallbackReason, undefined);
    assert.strictEqual(confidence, 0.95);
    assert.strictEqual(segments.subject, 'Betreff: Bewerbung als Entwicklerin');
    assert.strictEqual(segments.salutation, 'Sehr geehrte Frau Muster,');
    assert.strictEqual(
        segments.introduction,
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
    );
});

test('disables the subject scan when the salutation is the first non-empty line', () => {
    // Boundary case: salutationPosition is 0, so the search bound must be 0 too.
    // A `||`-for-`??` slip, or a truthiness guard at the call site, re-opens the
    // scan here and lets the introduction be picked up as the subject.
    const input = [
        'Sehr geehrte Frau Muster,',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
        '',
        'Ich arbeite seit fünf Jahren in der Softwareentwicklung.',
        '',
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments } = segmentCoverLetterHeuristically(input);

    assert.strictEqual(segments.subject, '');
    assert.strictEqual(segments.salutation, 'Sehr geehrte Frau Muster,');
    assert.strictEqual(
        segments.introduction,
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
    );
});

test('still finds a genuine subject line behind a long recipient block, past MAX_SUBJECT_SEARCH_LINES', () => {
    // Five consecutive non-empty lines of recipient block (sender name, street,
    // city, company name, department) push "Betreff:" to nonEmptyLines position
    // 5 — at or beyond the old MAX_SUBJECT_SEARCH_LINES(5) cap, which would have
    // excluded it via `Math.min(salutationPosition, MAX_SUBJECT_SEARCH_LINES)`.
    // The salutation sits at position 6, which is a bigger, still-correct bound.
    const input = [
        'Max Mustermann',
        'Musterstraße 1',
        '12345 Musterstadt',
        'Beispiel GmbH',
        'Personalabteilung',
        'Betreff: Bewerbung als Entwicklerin',
        '',
        'Sehr geehrte Frau Muster,',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
        '',
        'Ich arbeite seit fünf Jahren in der Softwareentwicklung.',
        '',
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    assert.strictEqual(segments.subject, 'Betreff: Bewerbung als Entwicklerin');
    assert.strictEqual(fallbackReason, undefined);
    assert.strictEqual(confidence, 0.95);
});

test('falls back to the leading-lines bound when there is no salutation', () => {
    // The subject sits at nonEmptyLines position 2, behind a letterhead, so this
    // actually pins a fallback bound greater than 1.
    const input = [
        'Max Mustermann',
        '',
        'Musterstadt, 1. Januar 2026',
        '',
        'Betreff: Bewerbung als Entwicklerin',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
        '',
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments, fallbackReason } = segmentCoverLetterHeuristically(input);

    assert.strictEqual(segments.subject, 'Betreff: Bewerbung als Entwicklerin');
    assert.strictEqual(segments.salutation, '');
    assert.strictEqual(fallbackReason, 'salutation not found');
});

test('falls back with confidence 0.35 when no greetings line is found', () => {
    const input = [
        'Sehr geehrte Frau Muster,',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
        '',
        'Ich arbeite seit fünf Jahren in der Softwareentwicklung.',
        '',
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    assert.strictEqual(segments.salutation, 'Sehr geehrte Frau Muster,');
    assert.strictEqual(segments.greetings, '');
    assert.strictEqual(confidence, 0.35);
    assert.strictEqual(fallbackReason, 'greetings not found');
});

test('falls back with confidence 0.2 when the greetings line precedes the salutation', () => {
    const input = [
        'Mit freundlichen Grüßen',
        'Max Mustermann',
        '',
        'Sehr geehrte Frau Muster,',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    assert.notStrictEqual(segments.salutation, '');
    assert.notStrictEqual(segments.greetings, '');
    assert.strictEqual(confidence, 0.2);
    assert.strictEqual(
        fallbackReason,
        'salutation and greetings are not in a valid order',
    );
});

test('falls back with confidence 0.45 when there is no body between salutation and greetings', () => {
    const input = [
        'Sehr geehrte Frau Muster,',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    assert.strictEqual(segments.introduction, '');
    assert.strictEqual(segments.conclusion, '');
    assert.strictEqual(confidence, 0.45);
    assert.strictEqual(
        fallbackReason,
        'body could not be split into introduction and conclusion',
    );
});

test('falls back with confidence 0.45 when a single-sentence body cannot be split into introduction and conclusion', () => {
    // Only one sentence in the sole body paragraph, so splitLastSentence has
    // nothing to split off as an introduction — the whole paragraph becomes
    // the conclusion and introduction stays empty.
    const input = [
        'Sehr geehrte Frau Muster,',
        '',
        'Ich bin sehr interessiert an der ausgeschriebenen Stelle',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    assert.strictEqual(segments.introduction, '');
    assert.strictEqual(
        segments.conclusion,
        'Ich bin sehr interessiert an der ausgeschriebenen Stelle',
    );
    assert.strictEqual(confidence, 0.45);
    assert.strictEqual(
        fallbackReason,
        'body could not be split into introduction and conclusion',
    );
});

test('falls back with confidence 0.55 for a single multi-sentence body paragraph without a main body', () => {
    const input = [
        'Sehr geehrte Frau Muster,',
        '',
        'Ich bin sehr interessiert an der Stelle. Ich freue mich auf ihre Antwort.',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    assert.strictEqual(
        segments.introduction,
        'Ich bin sehr interessiert an der Stelle.',
    );
    assert.strictEqual(segments.mainBody, '');
    assert.strictEqual(segments.conclusion, 'Ich freue mich auf ihre Antwort.');
    assert.strictEqual(confidence, 0.55);
    assert.strictEqual(
        fallbackReason,
        'single-paragraph body without main body',
    );
});

test('succeeds with confidence 0.75 for a two-paragraph body without a main body', () => {
    const input = [
        'Sehr geehrte Frau Muster,',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
        '',
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments, confidence, fallbackReason } =
        segmentCoverLetterHeuristically(input);

    assert.strictEqual(
        segments.introduction,
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
    );
    assert.strictEqual(segments.mainBody, '');
    assert.strictEqual(
        segments.conclusion,
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
    );
    assert.strictEqual(confidence, 0.75);
    assert.strictEqual(fallbackReason, undefined);
});
