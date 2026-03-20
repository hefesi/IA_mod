// DEPRECATED MODULE: ai_policy.js
// This file is not a reusable module. Do not import except from the monolithic runtime.
function deprecated(functionName) {
    return function() {
        throw new Error(`ai_policy.${functionName}() is deprecated and not a reusable module.`);
    };
}

module.exports = {
    selectPolicy: deprecated('selectPolicy'),
    pickPolicyOrder: deprecated('pickPolicyOrder'),
    qScoresForState: deprecated('qScoresForState'),
    nnScoresForState: deprecated('nnScoresForState'),
    applyCommandBias: deprecated('applyCommandBias'),
    rankActions: deprecated('rankActions'),
    policyReadyActions: deprecated('policyReadyActions')
};
