// Deprecation check for ai_actions.js (call-time throw contract)
const mod = require('../scripts/ai_actions');

// Test executeAction
let threw = false;
try {
  mod.executeAction();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_actions.executeAction should throw deprecation error');

// Test executeActionDecision
threw = false;
try {
  mod.executeActionDecision('test', {}, {});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_actions.executeActionDecision should throw deprecation error');

// Test runDirectAction
threw = false;
try {
  mod.runDirectAction('test', {});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_actions.runDirectAction should throw deprecation error');

// Test runActionPlan
threw = false;
try {
  mod.runActionPlan('test', {});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_actions.runActionPlan should throw deprecation error');

console.log('ai_actions deprecation check passed');
