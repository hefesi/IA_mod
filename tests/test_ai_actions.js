// Regression check for action executor module
const { executeAction } = require('../scripts/ai_actions');

function testExecuteAction() {
  // Should not throw for minimal input
  executeAction('noop', {});
}
testExecuteAction();
console.log('ai_actions regression check passed');
