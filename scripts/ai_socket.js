// DEPRECATED MODULE: ai_socket.js
// This file is not a reusable module. Do not import except from the monolithic runtime.
function deprecated() {
    throw new Error('ai_socket.js is deprecated and not a reusable module.');
}
module.exports = {
    rlSocket: {
        connect: deprecated,
        flush: deprecated,
        close: deprecated
    },
    rlSocketConnected: deprecated,
    rlSocketEnsureQueue: deprecated,
    rlSocketPollQueue: deprecated,
    rlSocketQueue: deprecated
};
