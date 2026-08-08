const MOJIBAKE_REPLACEMENTS = new Map<string, string>([
    ['Ã¤', 'ä'],
    ['Ã„', 'Ä'],
    ['Ã¶', 'ö'],
    ['Ã–', 'Ö'],
    ['Ã¼', 'ü'],
    ['Ãœ', 'Ü'],
    ['ÃŸ', 'ß'],
]);

/**
 * A function that repairs common German mojibake in a given string.
 * @param input cover letter text
 * @returns repaired cover letter text
 */
function repairCommonGermanMojibake(input: string): string {
    let repairedInput = input;

    for (const [brokenValue, replacementValue] of MOJIBAKE_REPLACEMENTS) {
        repairedInput = repairedInput.replaceAll(brokenValue, replacementValue);
    }

    return repairedInput;
}

/**
 * A function that normalizes cover letter text by repairing mojibake and formatting whitespace.
 * @param input cover letter text
 * @returns normalized cover letter text
 */
export function normalizeCoverLetterText(input: string): string {
    return repairCommonGermanMojibake(input)
        .normalize('NFC')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[\t ]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
