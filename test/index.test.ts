import { test } from 'node:test';
import assert from 'node:assert';
import { segmentCoverLetter } from '../src/index';

test('segmentCoverLetter is exported from the package entry point as a function', () => {
    assert.strictEqual(typeof segmentCoverLetter, 'function');
});
