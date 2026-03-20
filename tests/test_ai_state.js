// Deprecation check for ai_state.js (call-time throw contract)
const mod = require('../scripts/ai_state');

// Test snapshotState
let threw = false;
try {
  mod.snapshotState({}, {}, [], {});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_state.snapshotState should throw deprecation error');

// Test emitTransition
threw = false;
try {
  mod.emitTransition({}, 'action', {}, {});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_state.emitTransition should throw deprecation error');

// Test emitMicroTransition
threw = false;
try {
  mod.emitMicroTransition({}, 'policy', 'decision', {}, {});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_state.emitMicroTransition should throw deprecation error');

// Test emitSocketEvent
threw = false;
try {
  mod.emitSocketEvent('event', {});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_state.emitSocketEvent should throw deprecation error');

// Test safeTeamName
threw = false;
try {
  mod.safeTeamName({});
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_state.safeTeamName should throw deprecation error');

console.log('ai_state deprecation check passed');
