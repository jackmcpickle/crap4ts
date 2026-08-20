import { crapRule } from './rule.ts';

const plugin = {
    meta: {
        name: 'crap',
        version: '0.1.0',
    },
    rules: {
        crap: crapRule,
    },
};

export default plugin;
