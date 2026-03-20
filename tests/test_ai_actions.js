// Deprecation check for ai_actions.js
let threw = false;
try {
  require('../scripts/ai_actions');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_actions.js should throw deprecation error');
console.log('ai_actions deprecation check passed');
