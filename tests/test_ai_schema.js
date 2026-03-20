// Deprecation check for ai_schema.js
let threw = false;
try {
  require('../scripts/ai_schema');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_schema.js should throw deprecation error');
console.log('ai_schema deprecation check passed');
