// Deprecation check for ai_socket.js
let threw = false;
try {
  require('../scripts/ai_socket');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_socket.js should throw deprecation error');
console.log('ai_socket deprecation check passed');
