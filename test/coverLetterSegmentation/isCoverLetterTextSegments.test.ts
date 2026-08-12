import { describe, it, test } from 'node:test';
import assert from 'node:assert';
import { CoverLetterSegments } from '../../src/types.js';

describe('/src/coverLetterSegmentation/isCoverLetterTextSegments.ts', () => {
    const coverLetter: CoverLetterSegments = {
        subject: 'Betreff: Bewerbung als Full-Stack-Developer',
        salutation: 'Sehr geehrte Damen und Herren',
        introduction: 'Ich bin ein sehr guter Software Tester.',
        mainBody: 'Ich kann jede Software bauen.',
        conclusion: 'Bitte geben Sie mir eine Chance.',
        greetings: 'Freundliche Grüße',
    };

    it('exports isCoverLetterTextSegments()', async () => {
        const { isCoverLetterTextSegments } =
            await import('../../src/coverLetterSegmentation/isCoverLetterTextSegments.js');
        assert.strictEqual(typeof isCoverLetterTextSegments, 'function');
    });
    test('isCoverLetterTextSegments(input) returns false if input is not an object', async () => {
        const { isCoverLetterTextSegments } =
            await import('../../src/coverLetterSegmentation/isCoverLetterTextSegments.js');
        assert.strictEqual(isCoverLetterTextSegments(null), false);
        assert.strictEqual(isCoverLetterTextSegments(''), false);
        assert.strictEqual(isCoverLetterTextSegments([]), false);
        assert.strictEqual(isCoverLetterTextSegments(1), false);
    });
    test('isCoverLetterTextSegments(input) returns false if input object has unknown property', async () => {
        const { isCoverLetterTextSegments } =
            await import('../../src/coverLetterSegmentation/isCoverLetterTextSegments.js');
        assert.strictEqual(
            isCoverLetterTextSegments({
                ...coverLetter,
                extraProp: 'test',
            }),
            false,
        );
    });
    test('isCoverLetterTextSegments(input) returns false if input object has missing property', async () => {
        const { isCoverLetterTextSegments } =
            await import('../../src/coverLetterSegmentation/isCoverLetterTextSegments.js');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { mainBody, ...coverLetterWithMissingProperty } = coverLetter;
        assert.strictEqual(
            isCoverLetterTextSegments(coverLetterWithMissingProperty),
            false,
        );
    });
    test('isCoverLetterTextSegments(input) returns true if input object is a cover letter', async () => {
        const { isCoverLetterTextSegments } =
            await import('../../src/coverLetterSegmentation/isCoverLetterTextSegments.js');
        assert.strictEqual(isCoverLetterTextSegments(coverLetter), true);
    });
});
