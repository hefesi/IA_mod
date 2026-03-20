// Deprecation check for ai_ui.js
let threw = false;
try {
  require('../scripts/ai_ui');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_ui.js should throw deprecation error');
console.log('ai_ui deprecation check passed');
