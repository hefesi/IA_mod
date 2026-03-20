// Deprecation check for ai_state.js
let threw = false;
try {
  require('../scripts/ai_state');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_state.js should throw deprecation error');
console.log('ai_state deprecation check passed');
