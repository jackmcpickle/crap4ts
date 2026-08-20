import { isAbsolute, resolve } from 'node:path';

export type LineHits = Map<number, number>;
export type LcovData = Map<string, LineHits>;

/**
 * Parses lcov.info text into file → (line → hit count).
 * Relative SF: paths are resolved against `root`.
 */
export function parseLcov(text: string, root: string): LcovData {
    const files: LcovData = new Map();
    let current: LineHits | null = null;
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (line.startsWith('SF:')) {
            const path = line.slice(3);
            const abs = isAbsolute(path) ? path : resolve(root, path);
            current = files.get(abs) ?? new Map();
            files.set(abs, current);
        } else if (line.startsWith('DA:') && current) {
            const [lineNo, hits] = line.slice(3).split(',');
            current.set(Number(lineNo), Number(hits));
        } else if (line === 'end_of_record') {
            current = null;
        }
    }
    return files;
}

/**
 * Percentage of instrumented lines within [startLine, endLine] that were hit,
 * or null if no instrumented lines fall in the range.
 */
export function coverageForRange(lines: LineHits, startLine: number, endLine: number): number | null {
    let total = 0;
    let covered = 0;
    for (const [lineNo, hits] of lines) {
        if (lineNo >= startLine && lineNo <= endLine) {
            total += 1;
            if (hits > 0) covered += 1;
        }
    }
    if (total === 0) return null;
    return (covered / total) * 100;
}
