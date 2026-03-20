// Regression check for UI/chat controls module
const { notify } = require('../scripts/ai_ui');

function testNotify() {
  // Should not throw for minimal input
  notify('test', null);
}
testNotify();
console.log('ai_ui regression check passed');
