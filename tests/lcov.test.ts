import { describe, expect, it } from 'vitest';
import { coverageForRange, parseLcov } from '../src/lcov.ts';

const sample = [
    'TN:',
    'SF:src/foo.ts',
    'DA:1,3',
    'DA:2,0',
    'DA:3,1',
    'DA:10,0',
    'LF:4',
    'LH:2',
    'end_of_record',
    'SF:/abs/bar.ts',
    'DA:5,7',
    'end_of_record',
].join('\n');

describe('parseLcov', () => {
    it('maps each source file to its line hit counts', () => {
        const lcov = parseLcov(sample, '/proj');
        expect(lcov.get('/proj/src/foo.ts')).toEqual(
            new Map([
                [1, 3],
                [2, 0],
                [3, 1],
                [10, 0],
            ]),
        );
    });

    it('keeps absolute SF paths as-is', () => {
        const lcov = parseLcov(sample, '/proj');
        expect(lcov.get('/abs/bar.ts')).toEqual(new Map([[5, 7]]));
    });
});

describe('coverageForRange', () => {
    const lines = parseLcov(sample, '/proj').get('/proj/src/foo.ts')!;

    it('returns percent of instrumented lines hit within the range', () => {
        // lines 1-3: hits on 1 and 3, miss on 2 → 2/3
        expect(coverageForRange(lines, 1, 3)).toBeCloseTo(66.667, 3);
    });

    it('returns null when no instrumented lines fall in the range', () => {
        expect(coverageForRange(lines, 20, 30)).toBeNull();
    });

    it('returns 0 for a fully uncovered range', () => {
        expect(coverageForRange(lines, 10, 10)).toBe(0);
    });
});
