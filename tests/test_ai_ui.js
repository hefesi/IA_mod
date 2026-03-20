// Deprecation check for ai_ui.js (call-time throw contract)
const mod = require('../scripts/ai_ui');

// Test notify
let threw = false;
try {
  mod.notify('message');
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_ui.notify should throw deprecation error');

// Test ensureHudButton
threw = false;
try {
  mod.ensureHudButton();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_ui.ensureHudButton should throw deprecation error');

// Test buildHudButton
threw = false;
try {
  mod.buildHudButton();
} catch (e) {
  threw = true;
  if (!/deprecated/.test(e.message)) throw e;
}
if (!threw) throw new Error('ai_ui.buildHudButton should throw deprecation error');

console.log('ai_ui deprecation check passed');
