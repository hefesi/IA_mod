// DEPRECATED MODULE: ai_ui.js
// This file is not a reusable module. Do not import except from the monolithic runtime.
function deprecated(functionName) {
    return function() {
        throw new Error(`ai_ui.${functionName}() is deprecated and not a reusable module.`);
    };
}

module.exports = {
    notify: deprecated('notify'),
    ensureHudButton: deprecated('ensureHudButton'),
    buildHudButton: deprecated('buildHudButton')
};
