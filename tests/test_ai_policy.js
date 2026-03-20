// Regression check for policy selection module
const { selectPolicy } = require('../scripts/ai_policy');

function testSelectPolicy() {
  // Should not throw for minimal input
  selectPolicy({});
}
testSelectPolicy();
console.log('ai_policy regression check passed');
