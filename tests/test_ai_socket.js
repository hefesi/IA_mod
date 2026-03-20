// Deprecation check for ai_socket.js (call-time throw contract)
const mod = require('../scripts/ai_socket');

// Test rlSocket.connect
let threw = false;
try {
  mod.rlSocket.connect();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocket.connect should throw deprecation error');

// Test rlSocket.flush
threw = false;
try {
  mod.rlSocket.flush();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocket.flush should throw deprecation error');

// Test rlSocket.close
threw = false;
try {
  mod.rlSocket.close();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocket.close should throw deprecation error');

// Test rlSocketConnected
threw = false;
try {
  mod.rlSocketConnected();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketConnected should throw deprecation error');

// Test rlSocketEnsureQueue
threw = false;
try {
  mod.rlSocketEnsureQueue();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketEnsureQueue should throw deprecation error');

// Test rlSocketPollQueue
threw = false;
try {
  mod.rlSocketPollQueue();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketPollQueue should throw deprecation error');

// Test rlSocketQueue
threw = false;
try {
  mod.rlSocketQueue('line');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketQueue should throw deprecation error');

// Test rlSocketConnect
threw = false;
try {
  mod.rlSocketConnect();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketConnect should throw deprecation error');

// Test rlSocketClose
threw = false;
try {
  mod.rlSocketClose();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketClose should throw deprecation error');

// Test rlSocketSend
threw = false;
try {
  mod.rlSocketSend('line');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketSend should throw deprecation error');

// Test rlSocketEnsureBackground
threw = false;
try {
  mod.rlSocketEnsureBackground();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketEnsureBackground should throw deprecation error');

// Test rlSocketBackgroundWorker
threw = false;
try {
  mod.rlSocketBackgroundWorker();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketBackgroundWorker should throw deprecation error');

// Test rlSocketStopBackgroundThread
threw = false;
try {
  mod.rlSocketStopBackgroundThread();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketStopBackgroundThread should throw deprecation error');

// Test rlSocketLogStats
threw = false;
try {
  mod.rlSocketLogStats();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketLogStats should throw deprecation error');

// Test rlSocketFlush
threw = false;
try {
  mod.rlSocketFlush();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.rlSocketFlush should throw deprecation error');

console.log('ai_socket deprecation check passed');
