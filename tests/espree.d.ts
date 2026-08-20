declare module 'espree' {
    export function parse(code: string, options?: { ecmaVersion?: number | 'latest'; sourceType?: string; loc?: boolean }): any;
}
