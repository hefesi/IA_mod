// Deprecation check for ai_policy.js
let threw = false;
try {
  require('../scripts/ai_policy');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.js should throw deprecation error');
console.log('ai_policy deprecation check passed');
