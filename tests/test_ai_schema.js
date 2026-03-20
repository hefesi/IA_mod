// Deprecation check for ai_schema.js (call-time throw contract)
let threw = false;
try {
  const mod = require('../scripts/ai_schema');
  mod.hasBucketizedFeatures();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_schema.js should throw deprecation error on function call');
console.log('ai_schema deprecation check passed');
