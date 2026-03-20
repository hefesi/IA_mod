// DEPRECATED MODULE: ai_socket.js
// This file is not a reusable module. Do not import except from the monolithic runtime.
function deprecated(functionName) {
    return function() {
        throw new Error(`ai_socket.${functionName}() is deprecated and not a reusable module.`);
    };
}

function deprecatedMethod(objectName, methodName) {
    return function() {
        throw new Error(`ai_socket.${objectName}.${methodName}() is deprecated and not a reusable module.`);
    };
}

module.exports = {
    rlSocket: {
        connect: deprecatedMethod('rlSocket', 'connect'),
        flush: deprecatedMethod('rlSocket', 'flush'),
        close: deprecatedMethod('rlSocket', 'close')
    },
    rlSocketConnected: deprecated('rlSocketConnected'),
    rlSocketEnsureQueue: deprecated('rlSocketEnsureQueue'),
    rlSocketPollQueue: deprecated('rlSocketPollQueue'),
    rlSocketQueue: deprecated('rlSocketQueue'),
    rlSocketConnect: deprecated('rlSocketConnect'),
    rlSocketClose: deprecated('rlSocketClose'),
    rlSocketSend: deprecated('rlSocketSend'),
    rlSocketEnsureBackground: deprecated('rlSocketEnsureBackground'),
    rlSocketBackgroundWorker: deprecated('rlSocketBackgroundWorker'),
    rlSocketStopBackgroundThread: deprecated('rlSocketStopBackgroundThread'),
    rlSocketLogStats: deprecated('rlSocketLogStats'),
    rlSocketFlush: deprecated('rlSocketFlush')
};
