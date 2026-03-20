// Deprecation check for ai_socket.js (call-time throw contract)
let threw = false;
try {
  const mod = require('../scripts/ai_socket');
  mod.rlSocket.connect();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.js should throw deprecation error on function call');
console.log('ai_socket deprecation check passed');
