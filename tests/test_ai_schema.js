// Regression check for schema/contract module
const { applyRLMeta } = require('../scripts/ai_schema');

function testApplyRLMeta() {
  const valid = applyRLMeta({
    actions: ['a', 'b'],
    features: [{ name: 'f', bins: [0, 1] }],
    norms: { f: 1 }
  });
  if (!valid) throw new Error('applyRLMeta should accept valid schema');
  const invalid = applyRLMeta({ actions: [1], features: [], norms: {} });
  if (invalid) throw new Error('applyRLMeta should reject invalid schema');
}
testApplyRLMeta();
console.log('ai_schema regression check passed');
