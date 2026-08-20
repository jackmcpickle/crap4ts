import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { cyclomaticComplexity } from './complexity.ts';
import { crapScore } from './crap.ts';
import { coverageForRange, type LcovData, parseLcov } from './lcov.ts';

const DEFAULT_MAX_CRAP = 30;
const DEFAULT_LCOV_PATH = 'coverage/lcov.info';

interface CachedLcov {
    mtimeMs: number;
    data: LcovData;
}

const lcovCache = new Map<string, CachedLcov | null>();

function loadLcov(lcovPath: string, root: string): LcovData | null {
    const abs = isAbsolute(lcovPath) ? lcovPath : resolve(root, lcovPath);
    let mtimeMs: number;
    try {
        mtimeMs = statSync(abs).mtimeMs;
    } catch {
        lcovCache.set(abs, null);
        return null;
    }
    const cached = lcovCache.get(abs);
    if (cached && cached.mtimeMs === mtimeMs) return cached.data;
    const data = parseLcov(readFileSync(abs, 'utf8'), root);
    lcovCache.set(abs, { mtimeMs, data });
    return data;
}

function functionName(node: any): string {
    if (node.id?.name) return node.id.name;
    const parent = node.parent;
    if (!parent) return '<anonymous>';
    if (parent.type === 'VariableDeclarator' && parent.id?.name) return parent.id.name;
    if ((parent.type === 'MethodDefinition' || parent.type === 'Property' || parent.type === 'PropertyDefinition') && !parent.computed) {
        return parent.key?.name ?? String(parent.key?.value ?? '<anonymous>');
    }
    if (parent.type === 'AssignmentExpression' && parent.left?.type === 'Identifier') return parent.left.name;
    return '<anonymous>';
}

export const crapRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Flag functions whose CRAP score (complexity² × (1 − coverage)³ + complexity) exceeds a threshold',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    maxCrap: { type: 'number', minimum: 0 },
                    lcovPath: { type: 'string' },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            tooCrappy:
                "'{{name}}' has a CRAP score of {{crap}} (complexity {{cc}}, coverage {{cov}}%) — max is {{max}}. Add tests or simplify.",
        },
    },
    create(context: any) {
        const options = context.options?.[0] ?? {};
        const maxCrap: number = options.maxCrap ?? DEFAULT_MAX_CRAP;
        const lcovPath: string = options.lcovPath ?? DEFAULT_LCOV_PATH;
        const cwd: string = context.cwd ?? process.cwd();

        const lcov = loadLcov(lcovPath, cwd);
        if (!lcov) return {};

        const filename = context.physicalFilename ?? context.filename;
        const fileLines = lcov.get(isAbsolute(filename) ? filename : resolve(cwd, filename));
        if (!fileLines) return {};

        function checkFunction(node: any) {
            const coverage = coverageForRange(fileLines!, node.loc.start.line, node.loc.end.line);
            if (coverage === null) return;
            const cc = cyclomaticComplexity(node);
            const crap = crapScore(cc, coverage);
            if (crap <= maxCrap) return;
            context.report({
                node: node.id ?? node,
                messageId: 'tooCrappy',
                data: {
                    name: functionName(node),
                    crap: crap.toFixed(1),
                    cc: String(cc),
                    cov: coverage.toFixed(1),
                    max: String(maxCrap),
                },
            });
        }

        return {
            FunctionDeclaration: checkFunction,
            FunctionExpression: checkFunction,
            ArrowFunctionExpression: checkFunction,
        };
    },
};
