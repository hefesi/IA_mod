// DEPRECATED MODULE: ai_socket.js
// This file is not a reusable module. Do not import except from the monolithic runtime.
function deprecated() {
	throw new Error('ai_socket.js is deprecated and not a reusable module.');
}
const rlSocket = {
	sock: null,
	out: null,
	lastConnectTick: -9999,
	lastErrorTick: -9999,
	queue: null,
	queueSize: null,
	backgroundThread: null,
	stopRequested: false,
	threadLock: null,
	sendRetryCount: 0,
	sendDropCount: 0,
	lastSendErrorTick: -9999,
	connect: deprecated,
	flush: deprecated,
	close: deprecated
};
module.exports = {
	rlSocket,
	rlSocketConnected: deprecated,
	rlSocketEnsureQueue: deprecated,
	rlSocketPollQueue: deprecated,
	rlSocketQueue: deprecated
};
