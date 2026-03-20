// Deprecation check for ai_state.js (call-time throw contract)
let threw = false;
try {
  const mod = require('../scripts/ai_state');
  mod.snapshotState();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_state.js should throw deprecation error on function call');
console.log('ai_state deprecation check passed');
