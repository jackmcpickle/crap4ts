import { describe, expect, it } from 'vitest';
import { crapScore } from '../src/crap.ts';

describe('crapScore', () => {
    it('is CC for fully covered code', () => {
        expect(crapScore(12, 100)).toBe(12);
        expect(crapScore(1, 100)).toBe(1);
    });

    it('is CC² + CC for fully uncovered code', () => {
        expect(crapScore(5, 0)).toBe(30);
        expect(crapScore(1, 0)).toBe(2);
    });

    it('matches the formula CC² × (1 − cov)³ + CC for partial coverage', () => {
        // 12² × 0.55³ + 12 = 144 × 0.166375 + 12 = 35.958
        expect(crapScore(12, 45)).toBeCloseTo(35.958, 3);
    });
});
