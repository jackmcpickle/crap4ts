import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { crapRule } from '../src/rule.ts';

(RuleTester as any).describe = describe;
(RuleTester as any).it = it;
(RuleTester as any).itOnly = it.only;

const dir = mkdtempSync(join(tmpdir(), 'crap4ts-'));
const riskyFile = join(dir, 'risky.ts');
const okFile = join(dir, 'ok.ts');
const unknownFile = join(dir, 'unknown.ts');
const lcovPath = join(dir, 'lcov.info');

const riskyCode = [
    'function risky(a) {',
    '    if (a === 1) return 1;',
    '    if (a === 2) return 2;',
    '    if (a === 3) return 3;',
    '    if (a === 4) return 4;',
    '    if (a === 5) return 5;',
    '    return 0;',
    '}',
].join('\n');

const okCode = 'function ok(a) { return a + 1; }';

writeFileSync(
    lcovPath,
    [
        `SF:${riskyFile}`,
        ...[2, 3, 4, 5, 6, 7].map((n) => `DA:${n},0`),
        'end_of_record',
        `SF:${okFile}`,
        'DA:1,5',
        'end_of_record',
    ].join('\n'),
);

const ruleTester = new RuleTester({
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

const options = [{ maxCrap: 30, lcovPath }];

ruleTester.run('crap', crapRule as any, {
    valid: [
        // simple + fully covered → CRAP 1
        { code: okCode, filename: okFile, options },
        // file absent from lcov → skipped silently when warnMissing is off
        { code: riskyCode, filename: unknownFile, options: [{ maxCrap: 30, lcovPath, warnMissing: false }] },
        // complex but threshold not exceeded when raised
        { code: riskyCode, filename: riskyFile, options: [{ maxCrap: 50, lcovPath }] },
    ],
    invalid: [
        // CC 6, coverage 0% → CRAP 42 > 30
        {
            code: riskyCode,
            filename: riskyFile,
            options,
            errors: [
                {
                    messageId: 'tooCrappy',
                    data: { name: 'risky', crap: '42.0', cc: '6', cov: '0.0', max: '30' },
                },
            ],
        },
    ],
});
