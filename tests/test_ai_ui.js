// Deprecation check for ai_ui.js (call-time throw contract)
let threw = false;
try {
  const mod = require('../scripts/ai_ui');
  mod.notify();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_ui.js should throw deprecation error on function call');
console.log('ai_ui deprecation check passed');
