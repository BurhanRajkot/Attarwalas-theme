let subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => {
      return cb !== callback;
    });
  };
}

// Returns each subscriber's own return value (usually undefined) so a
// publisher that needs to wait on a subscriber's async work — e.g. Buy Now
// delaying its checkout redirect until the free-gift picker's own
// /cart/add.js call has gone out — can Promise.all() the results. Existing
// callers that ignore the return value are unaffected.
function publish(eventName, data) {
  if (subscribers[eventName]) {
    return subscribers[eventName].map((callback) => callback(data));
  }
  return [];
}
