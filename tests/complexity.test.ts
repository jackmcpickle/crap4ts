import { parse } from 'espree';
import { describe, expect, it } from 'vitest';
import { cyclomaticComplexity } from '../src/complexity.ts';

function firstFunction(code: string): any {
    const program = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    const stmt: any = program.body[0];
    if (stmt.type === 'FunctionDeclaration') return stmt;
    if (stmt.type === 'VariableDeclaration') return stmt.declarations[0].init;
    throw new Error(`unexpected fixture: ${stmt.type}`);
}

const cc = (code: string) => cyclomaticComplexity(firstFunction(code));

describe('cyclomaticComplexity', () => {
    it('is 1 for a straight-line function', () => {
        expect(cc('function f(a) { return a + 1; }')).toBe(1);
    });

    it('counts if and else-if', () => {
        expect(cc('function f(a) { if (a) return 1; else if (a > 2) return 2; return 3; }')).toBe(3);
    });

    it('counts ternaries', () => {
        expect(cc('function f(a) { return a ? 1 : 2; }')).toBe(2);
    });

    it('counts loops', () => {
        expect(cc('function f(xs) { for (const x of xs) {} for (const k in xs) {} for (;;) {} while (1) {} do {} while (0); }')).toBe(6);
    });

    it('counts non-default switch cases only', () => {
        expect(cc('function f(a) { switch (a) { case 1: return 1; case 2: return 2; default: return 0; } }')).toBe(3);
    });

    it('counts catch clauses', () => {
        expect(cc('function f() { try { g(); } catch (e) { return 1; } }')).toBe(2);
    });

    it('counts logical operators and logical assignment', () => {
        expect(cc('function f(a, b) { const c = a && b; const d = a || b; const e = a ?? b; let g = a; g ||= b; g &&= b; g ??= b; return c || d; }')).toBe(8);
    });

    it('includes nested functions in the enclosing count', () => {
        expect(cc('function f(xs) { return xs.map((x) => (x ? 1 : 0)); }')).toBe(2);
    });

    it('handles arrow function fixtures', () => {
        expect(cc('const f = (a) => (a ? 1 : 2);')).toBe(2);
    });
});
