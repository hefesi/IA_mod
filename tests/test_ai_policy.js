// Deprecation check for ai_policy.js (call-time throw contract)
const mod = require('../scripts/ai_policy');

// Test selectPolicy
let threw = false;
try {
  mod.selectPolicy();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.selectPolicy should throw deprecation error');

// Test pickPolicyOrder
threw = false;
try {
  mod.pickPolicyOrder(['action1']);
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.pickPolicyOrder should throw deprecation error');

// Test qScoresForState
threw = false;
try {
  mod.qScoresForState({});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.qScoresForState should throw deprecation error');

// Test nnScoresForState
threw = false;
try {
  mod.nnScoresForState({});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.nnScoresForState should throw deprecation error');

// Test applyCommandBias
threw = false;
try {
  mod.applyCommandBias(['action1']);
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.applyCommandBias should throw deprecation error');

// Test rankActions
threw = false;
try {
  mod.rankActions(['action1']);
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.rankActions should throw deprecation error');

// Test policyReadyActions
threw = false;
try {
  mod.policyReadyActions(['action1']);
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_policy.policyReadyActions should throw deprecation error');

console.log('ai_policy deprecation check passed');
