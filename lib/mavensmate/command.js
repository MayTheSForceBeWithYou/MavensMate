'use strict';

var _ = require('lodash');

/**
 * Base command class
 * @param {Array} args
 * @param {Array[0]} - client instance (object)
 * @param {Array[1]} - payload for the command (object)
 * @param {Array[2]} - callback for the command, will be executed in this.respond for non-command line clients (function)
 */
var BaseCommand = function(args) {
	this.client = args[0];
	this.payload = args[1];
	this._callback = args[2];
};

/**
 * Sets unique identifier for the command for tracking purposes
 * @param {String} id - unique id (via uuid)
 */
BaseCommand.prototype.setId = function(id) {
	this._id = id;
};

/**
 * Returns the command id
 * @return {String} - unique id of the command
 */
BaseCommand.prototype.getId = function() {
	return this._id;
};

/**
 * Sets the project running this command (optional)
 * @param {Object} project - project instance
 */
BaseCommand.prototype.setProject = function(project) {
	this._project = project;
};

/**
 * Returns the project running this command (optional)
 * @return {Object} - project instance
 */
BaseCommand.prototype.getProject = function() {
	return this._project;
};

/**
 * Responses to the client that executed the command
 * @param  {Object|String} res   - response from the command
 * @param  {Boolean} success - whether the command was successfull (TODO: do we need this?)
 * @param  {Error} error   - error instance (for failed commands)
 * @return {String|Object|STDOUT}         - depends on the configuration of the client (more documentation needed here)
 */
BaseCommand.prototype.respond = function(res, success, error) {
	// if we're headless, we need to properly format the response with JSON
	// otherwise we can just log the result
	var self = this;
	var response;
	if (!self.client.isCommandLine()) {
	  // this is a standard response to a consuming client
	  // response should be deserialized into a valid JSON string
	  response = {};
	  success = success === undefined ? true : success;
	  response.result = res;
	  if (!success && error !== undefined) {
	    response.result = error.message;
	    response.stack = error.stack;
	  }
	  if (_.isFunction(self._callback)) {
	  	if (success) {
	  		self._callback(null, response);
	  	} else {
	  		self._callback(error);
	  	}
	  } else {
	  	return response;
	  }
	} else if (self.client.isHeadless() && !self.client.isDebugging()) {
	  // this is a standard response to a consuming client
	  // response should be deserialized into a valid JSON string
	  response = {};
	  if (success === undefined) {
	    success = true;
	  }
	  if (_.isArray(res)) {
	    response.result = res;
	    response.success = success;
	  } else if (typeof res === 'object') {
	    response.result = res;
	    if (!_.has(res, 'success')) {
	      response.success = success;
	    }
	  } else if (_.isString(res)) {
	    response.result = res;
	    response.success = success;
	  }
	  if (!success && error !== undefined) {
	  	response.success = false;
	    response.result = error.message;
	    response.stack = error.stack;
	    console.error(JSON.stringify(response));
	    process.exit(1);
	  } else {
	    console.log(JSON.stringify(response));
	    process.exit(0);
	  }
	} else {
	  self.client.logger.debug(res);
	  if (!success && error !== undefined && error.stack !== undefined) {
	    var endOfLine = require('os').EOL;
	    console.error(endOfLine+'Promise Trace -->');
	    var stackLines = error.stack.split(endOfLine);
	    var errors = stackLines[0];
	    _.each(errors.split('Error: '), function(e) {
	      console.error(e);
	    });
	    stackLines.shift();
	    console.error(endOfLine+'Stack Trace -->');
	    console.error(stackLines.join(endOfLine));
	    process.exit(1);
	  }
	  process.exit(0);
	}
};

/**
 * Whether the command is requesting a UI
 * @return {Boolean}
 */
BaseCommand.prototype.isUICommand = function() {
  return (this.payload && this.payload.args) ? this.payload.args.ui : false;
};

module.exports = BaseCommand;