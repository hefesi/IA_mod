// Regression check for socket transport module
const { rlSocketQueue } = require('../scripts/ai_socket');

function testQueue() {
  // Should not throw when queueing
  rlSocketQueue('test');
}
testQueue();
console.log('ai_socket regression check passed');
