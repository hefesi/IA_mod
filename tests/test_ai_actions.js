// Deprecation check for ai_actions.js (call-time throw contract)
let threw = false;
try {
  const mod = require('../scripts/ai_actions');
  mod.executeAction();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_actions.js should throw deprecation error on function call');
console.log('ai_actions deprecation check passed');
