// DEPRECATED MODULE: ai_state.js
// This file is not a reusable module. Do not import except from the monolithic runtime.
function deprecated(functionName) {
    return function() {
        throw new Error(`ai_state.${functionName}() is deprecated and not a reusable module.`);
    };
}

module.exports = {
    snapshotState: deprecated('snapshotState'),
    emitTransition: deprecated('emitTransition'),
    emitMicroTransition: deprecated('emitMicroTransition'),
    emitSocketEvent: deprecated('emitSocketEvent'),
    safeTeamName: deprecated('safeTeamName')
};
