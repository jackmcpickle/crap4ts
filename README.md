# eslint-plugin-crap (aka crap4ts)

**CRAP** (Change Risk Anti-Pattern) metric for TypeScript/JavaScript, as an [oxlint JS plugin](https://oxc.rs/docs/guide/usage/linter/js-plugins.html).

Combines cyclomatic complexity with test coverage to flag functions that are both complex and under-tested — the riskiest code to change. A port of [crap4clj](https://github.com/unclebob/crap4clj) to the TS ecosystem.

## How it works

1. You run your tests with an lcov coverage reporter (vitest, jest, etc.), producing `coverage/lcov.info`.
2. The `crap/crap` lint rule computes cyclomatic complexity per function, looks up the function's line coverage in the lcov file, and reports any function whose CRAP score exceeds the threshold.

```
CRAP(fn) = CC² × (1 - coverage)³ + CC
```

| Score | Risk |
|-------|------|
| 1-5   | Low — clean code |
| 5-30  | Moderate — refactor or add tests |
| 30+   | High — complex and under-tested |

## Setup

Requires oxlint with JS plugin support (v1.78+). In `.oxlintrc.json`:

```json
{
  "jsPlugins": ["eslint-plugin-crap"],
  "rules": {
    "crap/crap": ["warn", { "maxCrap": 30, "lcovPath": "coverage/lcov.info" }]
  }
}
```

(oxlint strips the `eslint-plugin-` prefix, so rules are referenced as `crap/...`.)

Prefer the classic `crap4ts` name? Alias it:

```json
{
  "jsPlugins": [{ "name": "crap4ts", "specifier": "eslint-plugin-crap" }],
  "rules": {
    "crap4ts/crap": ["warn", { "maxCrap": 30 }]
  }
}
```

Make sure your test runner emits lcov. For vitest:

```ts
// vitest.config.ts
export default defineConfig({
    test: { coverage: { provider: 'v8', reporter: ['text', 'lcov'] } },
});
```

## Usage

```bash
npx vitest run --coverage   # 1. generate coverage/lcov.info
npx oxlint .                # 2. lint with CRAP scores
```

Example output:

```
src/rule.ts:33:10: warning crap(crap): 'functionName' has a CRAP score of 40.4
(complexity 13, coverage 45.5%) — max is 30. Add tests or simplify.
```

## Options

| Option | Default | Meaning |
|--------|---------|---------|
| `maxCrap` | `30` | Report functions scoring above this |
| `lcovPath` | `coverage/lcov.info` | lcov file, relative to the lint root |

## Notes

- If the lcov file is missing, or a file has no entry in it, the rule stays silent (linting shouldn't fail before coverage has been generated). Run coverage first for meaningful results.
- Functions whose line range contains no instrumented lines are skipped.
- Complexity counts: `if`, `?:`, `for`/`for-in`/`for-of`, `while`, `do-while`, non-default `case`, `catch`, `&&`/`||`/`??`, and `&&=`/`||=`/`??=`, plus 1. Nested functions count toward their enclosing function too.

## Why not ast-grep?

ast-grep rules are declarative pattern matchers — they can't count decision points, do arithmetic, or read a coverage file, so they can't compute CRAP. oxlint JS plugins run real JavaScript, so they can do all three.

## Development

```bash
pnpm build             # compile src/ to dist/ for oxlint consumers
pnpm test              # unit + RuleTester tests
pnpm coverage          # regenerate lcov
pnpm lint              # build, then dogfood the rule on this repo
```
