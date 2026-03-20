// DEPRECATED MODULE: ai_schema.js
// This file is not a reusable module. Do not import except from the monolithic runtime.
function deprecated(functionName) {
    return function() {
        throw new Error(`ai_schema.${functionName}() is deprecated and not a reusable module.`);
    };
}

module.exports = {
    hasBucketizedFeatures: deprecated('hasBucketizedFeatures'),
    applyRLMeta: deprecated('applyRLMeta')
};
