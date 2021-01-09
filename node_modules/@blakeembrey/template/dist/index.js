"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DATA_VAR_NAME = "data";
/**
 * Stringify a template into a function.
 */
function compile(value, displayName = "template") {
    const str = value.replace(/"|{{[^{]+}}/g, prop => {
        if (prop === '"')
            return '\\"';
        return `" + ${DATA_VAR_NAME}.${prop.slice(2, -2).trim()} + "`;
    });
    return `function ${displayName}(${DATA_VAR_NAME}) { return "${str}"; }`;
}
exports.compile = compile;
/**
 * Fast and simple string templates.
 */
function template(value, displayName) {
    const body = compile(value, displayName);
    return new Function(`return (${body});`)();
}
exports.template = template;
//# sourceMappingURL=index.js.map