import { test, describe } from 'node:test';
import assert from 'node:assert';
import { MOJIBAKE_REPLACEMENTS } from '../src/constants/mojibakeReplacements';
import { COVER_LETTER_CLEAN_STRING } from './constants/coverLetterCleanString';
import { COVER_LETTER_DIRTY_STRING } from './constants/coverLetterDirtyString';
import {
    normalizeCoverLetterText,
    repairCommonGermanMojibake,
} from '../src/normalize';
import { COVER_LETTER } from './constants/coverLetterSegments';

describe('/src/normalize.ts ', () => {
    test('repairCommonGermanMojibake() returns a repaired string', () => {
        let brokenString = '';
        let correctString = '';
        for (const item of MOJIBAKE_REPLACEMENTS) {
            brokenString += item[0];
            correctString += item[1];
        }
        const repairedString = repairCommonGermanMojibake(brokenString);
        assert.equal(repairedString, correctString);
    });

    test('normalizeCoverLetterText() returns a repaired and normalized cover letter text', () => {
        assert.equal(
            normalizeCoverLetterText(COVER_LETTER_DIRTY_STRING),
            COVER_LETTER_CLEAN_STRING,
        );
        assert.equal(
            normalizeCoverLetterText(COVER_LETTER),
            'Betreff: Bewerbung als Full-Stack-Developer\nSehr geehrte Damen und Herren\nIch bin ein sehr guter Software Tester.\nIch kann jede Software bauen.\nBitte geben Sie mir eine Chance.\nFreundliche Grüße',
        );
    });
});
