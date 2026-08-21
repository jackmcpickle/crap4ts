import pkg from '../package.json' with { type: 'json' };
import { crapRule } from './rule.js';

const plugin = {
    meta: {
        name: 'crap',
        version: pkg.version,
    },
    rules: {
        crap: crapRule,
    },
};

export default plugin;
