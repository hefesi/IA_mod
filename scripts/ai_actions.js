// DEPRECATED MODULE: ai_actions.js
// This file is not a reusable module. Do not import except from the monolithic runtime.
function deprecated(functionName) {
    return function() {
        throw new Error(`ai_actions.${functionName}() is deprecated and not a reusable module.`);
    };
}

module.exports = {
    executeAction: deprecated('executeAction'),
    executeActionDecision: deprecated('executeActionDecision'),
    runDirectAction: deprecated('runDirectAction'),
    runActionPlan: deprecated('runActionPlan')
};
