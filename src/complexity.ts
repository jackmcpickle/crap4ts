interface AstNode {
    type: string;
    [key: string]: unknown;
}

const LOGICAL_ASSIGNMENT_OPERATORS = new Set(['&&=', '||=', '??=']);

function isDecisionPoint(node: AstNode): boolean {
    switch (node.type) {
        case 'IfStatement':
        case 'ConditionalExpression':
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'CatchClause':
        case 'LogicalExpression':
            return true;
        case 'SwitchCase':
            return node.test != null;
        case 'AssignmentExpression':
            return LOGICAL_ASSIGNMENT_OPERATORS.has(node.operator as string);
        default:
            return false;
    }
}

function countDecisionPoints(node: AstNode): number {
    let count = isDecisionPoint(node) ? 1 : 0;
    for (const [key, value] of Object.entries(node)) {
        if (key === 'parent') continue;
        if (Array.isArray(value)) {
            for (const child of value) {
                if (child && typeof child === 'object' && typeof (child as AstNode).type === 'string') {
                    count += countDecisionPoints(child as AstNode);
                }
            }
        } else if (value && typeof value === 'object' && typeof (value as AstNode).type === 'string') {
            count += countDecisionPoints(value as AstNode);
        }
    }
    return count;
}

/** Decision points in the function's subtree (nested functions included) + 1. */
export function cyclomaticComplexity(fnNode: AstNode): number {
    return countDecisionPoints(fnNode) + 1;
}
