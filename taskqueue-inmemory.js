var q = require('q');
var winston = require('winston');
var http = require('http');


var _httpPort = 8080;
var _httpHost = 'localhost';
var _maxTaskRetries = 0;
var _taskQueueItems = [];

/**
 * Configure the in-memory taskqueue with alternate http setup
 *
 * @param {string} host the hostname to call taskitems upon [default: localhost]
 * @param {int} port on which your dev instance is started [default: 8080]
 */
exports.configure = function configure(host, port, maxTaskRetries){
  _httpHost = host || 'localhost';
  _httpPort = port || 8080;
  _maxTaskRetries = maxTaskRetries || 0;
};

/**
 * Add a task to a queue.
 *
 * The object representing the task options must satisfy the following contract.
 * It must have the following (required) properties:
 *   url : a string, the url to dispatch the task request to
 *
 * It may have the following (optional) properties:
 *   queueName : a string, the name of the queue to add the task to
                (defaults to 'default')
 *   taskName : a string, the name of the task
 *   etaUsec: a string, the ETA in microseconds as a string
 *   method: a string among 'get', 'post', 'head', 'put', 'delete'
 *          (defaults to 'post')
 *   body: a string, the body of the request (for 'post' and 'put' only)
 *   headers: an object containing a property for each desired header in the request
 *
 * @param {!Object} req node.js request object
 * @param {!Object} the task options (see above)
 * @param {!function(?Error)} callback callback
 */
exports.add = function add(req, options, callback){
  _taskQueueItems.push({
    request: req,
    options: options,
    attempt: 0
  });

  if(callback){
    callback(); //we never error thus fire the callback
  }
};


// init task queue polling
setTimeout(processTaskqueueItem, 500);

// process one item from the taskqueue array and re-schedule ourselves afterwards
function processTaskqueueItem(){
  var queueItem = _taskQueueItems.shift();
  var def = q.defer();

  if(!queueItem){
    def.resolve();
  }
  else{
    winston.debug('going to execute taskqueue item: %s:%d%s', _httpHost, _httpPort, queueItem.options.url);
    queueItem.attempt++;

    var options = {
      host: _httpHost,
      port: _httpPort,
      path: queueItem.options.url,
      method: queueItem.options.method ? queueItem.options.method.toUpperCase() : 'POST',
    };

    var req = http.request(options, function(res){
      if(res.statusCode < 200 || res.statusCode > 299){
        if(queueItem.attempt <= _maxTaskRetries){
          winston.warn('Taskqueue item returned non-2XX code. Statuscode=%s. Current attempt %d of %d', res.statusCode, queueItem.attempt, 1 + _maxTaskRetries);
          //re-add item to queue for next retry
          _taskQueueItems.push(queueItem);
        }
        else {
          winston.error('Taskqueue item returned non-2XX code. Statuscode=%s. Current attempt %d of %d', res.statusCode, queueItem.attempt, 1 + _maxTaskRetries);
        }
      }
      def.resolve();
    });

    req.on('error', function(error){
      winston.error('unexpected error while executing in-memory taskqueue item, not retrying!: '  + error);
      def.resolve();
    });

    req.end();
  }

  def.promise.finally(function(){
      //next item in the queue or wait a bit to retry
      if(_taskQueueItems.length > 0){
        setTimeout(processTaskqueueItem, 0);
      }
      else {
        winston.debug('re-scheduling next iteration of taskqueue fetching in 500ms');
        setTimeout(processTaskqueueItem, 500);
      }
  });
}
