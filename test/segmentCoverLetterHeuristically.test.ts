import { test } from 'node:test';
import assert from 'node:assert';
// Static import is safe here (unlike test/index.test.ts): this module only has
// type-only imports, so it never evaluates src/llm.ts and needs no API key.
import { segmentCoverLetterHeuristically } from '../src/coverLetterSegmentation/segmentCoverLetterHeuristically.js';

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

    const { segments } = segmentCoverLetterHeuristically(input);

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

    const { segments } = segmentCoverLetterHeuristically(input);

    assert.strictEqual(segments.subject, 'Betreff: Bewerbung als Entwicklerin');
    assert.strictEqual(segments.salutation, 'Sehr geehrte Frau Muster,');
    assert.strictEqual(
        segments.introduction,
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
    );
});

test('falls back to the leading-lines bound when there is no salutation', () => {
    const input = [
        'Betreff: Bewerbung als Entwicklerin',
        '',
        'hiermit bewerbe ich mich auf die ausgeschriebene Stelle als Entwicklerin.',
        '',
        'Über eine Einladung zum Gespräch freue ich mich sehr.',
        '',
        'Mit freundlichen Grüßen',
        'Max Mustermann',
    ].join('\n');

    const { segments } = segmentCoverLetterHeuristically(input);

    assert.strictEqual(segments.subject, 'Betreff: Bewerbung als Entwicklerin');
    assert.strictEqual(segments.salutation, '');
});
