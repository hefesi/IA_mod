// Deprecation check for ai_schema.js (call-time throw contract)
const mod = require('../scripts/ai_schema');

// Test hasBucketizedFeatures
let threw = false;
try {
  mod.hasBucketizedFeatures([]);
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_schema.hasBucketizedFeatures should throw deprecation error');

// Test applyRLMeta
threw = false;
try {
  mod.applyRLMeta({});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_schema.applyRLMeta should throw deprecation error');

console.log('ai_schema deprecation check passed');
