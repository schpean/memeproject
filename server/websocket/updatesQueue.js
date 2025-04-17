class UpdatesQueue {
  constructor(maxSize = 100) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  add(update) {
    // Add timestamp to the update
    const timestampedUpdate = {
      ...update,
      timestamp: Date.now()
    };
    
    // Add to queue and trim if necessary
    this.queue.push(timestampedUpdate);
    if (this.queue.length > this.maxSize) {
      this.queue.shift(); // Remove oldest update
    }
  }

  getUpdatesSince(timestamp) {
    return this.queue.filter(update => update.timestamp > timestamp);
  }

  getAllUpdates() {
    return this.queue;
  }

  clear() {
    this.queue = [];
  }
}

module.exports = new UpdatesQueue(); 