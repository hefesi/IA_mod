// Deprecation check for ai_policy.js (call-time throw contract)
let threw = false;
try {
  const mod = require('../scripts/ai_policy');
  mod.selectPolicy();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.js should throw deprecation error on function call');
console.log('ai_policy deprecation check passed');
