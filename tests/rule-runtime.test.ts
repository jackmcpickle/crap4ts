import { mkdirSync, mkdtempSync, realpathSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { crapRule } from '../src/rule.js';

function lint(code: string, filename: string, options: object, cwd?: string): Linter.LintMessage[] {
    // flat-config Linter only applies config to files under its cwd
    const linter = new Linter({ cwd: cwd ?? dirname(filename) });
    return linter.verify(
        code,
        {
            files: ['**/*.ts'],
            plugins: { crap: { rules: { crap: crapRule as any } } },
            rules: { 'crap/crap': ['error', options] },
            languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        },
        filename,
    );
}

function makeDir(): string {
    // realpath: macOS tmpdir is a symlink, which breaks flat-config path matching
    return realpathSync(mkdtempSync(join(tmpdir(), 'crap4ts-runtime-')));
}

/** lcov record marking the given lines of `file` as uncovered. */
function uncoveredLcov(file: string, lines: number[]): string {
    return [`SF:${file}`, ...lines.map((n) => `DA:${n},0`), 'end_of_record'].join('\n');
}

describe('crap rule runtime behaviour', () => {
    it('is a no-op when the lcov file does not exist', () => {
        const dir = makeDir();
        const file = join(dir, 'a.ts');
        const messages = lint('function f(a) { return a ? 1 : 2; }', file, {
            maxCrap: 0,
            lcovPath: join(dir, 'missing-lcov.info'),
        });
        expect(messages).toEqual([]);
    });

    it('resolves the default lcov path against cwd', () => {
        const dir = makeDir();
        const file = join(dir, 'a.ts');
        mkdirSync(join(dir, 'coverage'));
        writeFileSync(join(dir, 'coverage', 'lcov.info'), uncoveredLcov(file, [1]));
        const messages = lint('function f(a) { return a ? 1 : 2; }', file, { maxCrap: 0 }, dir);
        expect(messages).toHaveLength(1);
        expect(messages[0].messageId).toBe('tooCrappy');
    });

    it('re-reads the lcov file when its mtime changes', () => {
        const dir = makeDir();
        const file = join(dir, 'a.ts');
        const lcovPath = join(dir, 'lcov.info');
        const code = 'function f(a) { return a ? 1 : 2; }';
        const options = { maxCrap: 0, lcovPath };

        writeFileSync(lcovPath, uncoveredLcov(file, [1]));
        utimesSync(lcovPath, new Date(1000000), new Date(1000000));
        expect(lint(code, file, options)).toHaveLength(1);

        // full coverage now → CRAP = CC = 2, but maxCrap 0 still flags; use maxCrap 5 to pass
        writeFileSync(lcovPath, [`SF:${file}`, 'DA:1,9', 'end_of_record'].join('\n'));
        utimesSync(lcovPath, new Date(2000000), new Date(2000000));
        expect(lint(code, file, { maxCrap: 5, lcovPath })).toEqual([]);
    });

    it('serves cached data while the mtime is unchanged', () => {
        const dir = makeDir();
        const file = join(dir, 'a.ts');
        const lcovPath = join(dir, 'lcov.info');
        const code = 'function f(a) { return a ? 1 : 2; }';
        const stamp = new Date(3000000);

        writeFileSync(lcovPath, uncoveredLcov(file, [1]));
        utimesSync(lcovPath, stamp, stamp);
        expect(lint(code, file, { maxCrap: 0, lcovPath })).toHaveLength(1);

        // content changes to fully covered, but mtime is pinned → stale cache stays in effect
        writeFileSync(lcovPath, [`SF:${file}`, 'DA:1,9', 'end_of_record'].join('\n'));
        utimesSync(lcovPath, stamp, stamp);
        expect(lint(code, file, { maxCrap: 5, lcovPath })).toHaveLength(1);
    });

    it('skips functions with no instrumented lines in their range', () => {
        const dir = makeDir();
        const file = join(dir, 'a.ts');
        const lcovPath = join(dir, 'lcov.info');
        // instrumented line 50 is outside the one-line function
        writeFileSync(lcovPath, uncoveredLcov(file, [50]));
        const messages = lint('function f(a) { return a ? 1 : 2; }', file, { maxCrap: 0, lcovPath });
        expect(messages).toEqual([]);
    });
});

describe('crap rule function naming', () => {
    function reportedNames(code: string, lineCount: number): string[] {
        const dir = makeDir();
        const file = join(dir, 'a.ts');
        const lcovPath = join(dir, 'lcov.info');
        const lines = Array.from({ length: lineCount }, (_, i) => i + 1);
        writeFileSync(lcovPath, uncoveredLcov(file, lines));
        const messages = lint(code, file, { maxCrap: 0, lcovPath });
        return messages.map((m) => /'([^']*)'/.exec(m.message)![1]);
    }

    it('names arrow functions after the variable they are assigned to', () => {
        expect(reportedNames('const fetchUser = (a) => a;', 1)).toEqual(['fetchUser']);
    });

    it('names class methods after the method key', () => {
        const code = ['class Api {', '    load(a) { return a; }', '}'].join('\n');
        expect(reportedNames(code, 3)).toEqual(['load']);
    });

    it('names object properties after the property key, including string keys', () => {
        const code = ['const api = {', '    load(a) { return a; },', "    'do-thing': function (a) { return a; },", '};'].join('\n');
        expect(reportedNames(code, 4)).toEqual(['load', 'do-thing']);
    });

    it('names functions assigned to an existing identifier', () => {
        expect(reportedNames('let g; g = function (a) { return a; };', 1)).toEqual(['g']);
    });

    it('falls back to <anonymous> for unnamed callbacks and computed keys', () => {
        const code = ['[1].map(function (a) { return a; });', 'const k = "x";', 'const o = { [k](a) { return a; } };'].join('\n');
        expect(reportedNames(code, 3)).toEqual(['<anonymous>', '<anonymous>']);
    });
});
