# appengine-in-memory-taskqueue
Development replacement for the taskqueue to have an in-memory dropin wich does not rely on the docker+appengine middleware setup to function properly.

Currently, NodeJS support of Google App Engine is still in the experimental phase. You can use the [appengine experimental nodejs library](https://www.npmjs.com/package/appengine) to gain some interaction with the platform. But for using the TaskQueue a lot of appengine middleware needs to be set up so that each request contains all metadata for accessing the taskqueue. This is done by the GAE Nodejs Docker container + deploying to GAE which takes a lot of time.

To alleviate these issues this packages has been created. It contains a stub for the taskqueue which is an in-memory replacement and will execute the inserted items onto the current localhost application.

# Usage

```js
var taskqueue;
var appengine = require('appengine');
if(isDevelopmentMode) {
  taskqueue = require('appengine-in-memory-taskqueue');

  // optional; reconfigure to different settings for port / retries.
  // default = localhost:8080 no retries
  taskqueue.configure('localhost', 8181, 3);
}
else {
  // production, use the regular appengine taskqueue
  taskqueue = appengine.taskqueue;
}

//use like the default taskqueue
taskqueue.add(req, options);
```

The in-memory taskqueue is internally a simple array which is looped over to process all tasks sequentially. If no tasks are in the queue it will iterate once every 500ms to evaluate if new tasks are added to the queue.

# Dependencies

This library has dependencies on the following npm packages:

- [`q`](https://www.npmjs.com/package/q)
- [`winston`](https://www.npmjs.com/package/winston)

# Missing features?
This replacement only covers basic usage of the taskqueue and is provided as-is. Send me a [Pull Request](https://github.com/crunchie84/appengine-in-memory-taskqueue-nodejs/pulls) if you want to contribute.

Obvious missing features:

- [ ] Custom header setting
- [ ] POST/PUT body appending
- [ ] Implement 'future' tasks using etaUsec
- [ ] Multiple concurrent queues using `queueName`
