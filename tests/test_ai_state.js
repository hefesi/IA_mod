// Regression check for state snapshot module
const { snapshotState } = require('../scripts/ai_state');

function testSnapshot() {
  // Should not throw for minimal input
  snapshotState(null, null, 0, null);
}
testSnapshot();
console.log('ai_state regression check passed');
