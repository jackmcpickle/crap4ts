import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';
import { crapRule } from '../src/rule.js';

describe('plugin entry point', () => {
    it('exposes the crap rule under a named plugin', () => {
        expect(plugin.meta.name).toBe('crap');
        expect(plugin.rules.crap).toBe(crapRule);
    });

    it('keeps the plugin version in sync with package.json', async () => {
        const pkg = await import('../package.json', { with: { type: 'json' } });
        expect(plugin.meta.version).toBe(pkg.default.version);
    });
});
