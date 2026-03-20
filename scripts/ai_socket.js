// Socket transport logic extracted from ai.js
// Handles RL socket connection, queue, background worker, and send logic

var rlSocket = {
  sock: null,
  out: null,
  lastConnectTick: -9999,
  lastErrorTick: -9999,
  queue: null,  // ConcurrentLinkedQueue initialized on first use
  queueSize: new AtomicInteger(0),
  backgroundThread: null,
  stopRequested: false,
  threadLock: new java.lang.Object(),
  sendRetryCount: 0,
  sendDropCount: 0,
  lastSendErrorTick: -9999
};

function rlSocketConnected() {
  return rlSocket.sock != null && rlSocket.out != null;
}

function rlSocketEnsureQueue() {
  if (rlSocket.queue == null) {
    rlSocket.queue = new ConcurrentLinkedQueue();
  }
  if (rlSocket.queueSize == null) {
    rlSocket.queueSize = new AtomicInteger(0);
  }
}

function rlSocketPollQueue() {
  if (rlSocket.queue == null) return null;
  var line = rlSocket.queue.poll();
  if (line != null && rlSocket.queueSize != null) {
    var remaining = rlSocket.queueSize.decrementAndGet();
    if (remaining < 0) rlSocket.queueSize.set(0);
  }
  return line;
}

function rlSocketQueue(line) {
  if (!config.rlSocketEnabled) return;
  rlSocketEnsureQueue();
  if (config.rlSocketQueueMax != null && config.rlSocketQueueMax > 0 && rlSocket.queueSize.get() >= config.rlSocketQueueMax) {
    rlSocketPollQueue();
    rlSocket.sendDropCount++;
  }
  rlSocket.queue.add(line);
  rlSocket.queueSize.incrementAndGet();
  rlSocketEnsureBackground();
}

// ... (other socket functions: connect, background worker, flush, etc.)

module.exports = {
  rlSocket,
  rlSocketConnected,
  rlSocketEnsureQueue,
  rlSocketPollQueue,
  rlSocketQueue
};
