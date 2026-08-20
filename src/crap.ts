/** CRAP(fn) = CC² × (1 − coverage)³ + CC, coverage given as a percentage. */
export function crapScore(complexity: number, coveragePct: number): number {
    const uncovered = 1 - coveragePct / 100;
    return complexity * complexity * uncovered ** 3 + complexity;
}
