const activity = new Map(); // sesionId (string) -> lastSeen (ms)

module.exports = {
  touch:   (id) => activity.set(String(id), Date.now()),
  remove:  (id) => activity.delete(String(id)),
  isStale: (id, maxAgeMs) => {
    const seen = activity.get(String(id));
    return !seen || (Date.now() - seen) > maxAgeMs;
  }
};
