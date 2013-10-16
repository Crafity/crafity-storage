/*jslint node:true, white:true */
"use strict";

/*!
 * crafity-storage - Crafity CouchDB Provider
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var Provider = require('./Provider');
var EventEmitter = require('events').EventEmitter;
var _nano = require('nano');

/**
 * CouchDB Provider Constructor
 * @constructor
 */
function CouchDB(config, nano) {
	if (!config) {
		throw new Error("Expected a CouchDB configuration");
	}

	if (!config.url) {
		throw new Error("Expected a url in the CouchDB configuration");
	}
	if (!config.database) {
		throw new Error("Expected a database name in the CouchDB configuration");
	}
	if (!config.design) {
		throw new Error("Expected a design document name in the CouchDB configuration");
	}
	if (!config.view) {
		throw new Error("Expected a view name in the CouchDB configuration");
	}
	if (!/\/$/.test(config.url)) {
		config.url += "/";
	}

	this.url = config.url;
	this.database = config.database;
	this.design = config.design;
	this.view = config.view;
	this.name = config.name;
	this.type = "CouchDB Provider";
	this.config = config;

	this.__nano = nano || _nano;
	this.__provider = config.provider || this.__nano(this.url).db.use(this.database);
}

/**
 * Set the generic provider as the prototype
 * @type {Provider}
 */
CouchDB.prototype = new Provider();

/**
 * Find all the data from the underlying data store
 * @param {Function} [callback] The function to call when the data is fetched
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.findAll = function (callback) {
	var self = this;
	var emitter = new EventEmitter();
	var stack = new Error().stack;

	if (callback) {
		if (!(callback instanceof Function)) {
			throw new Error("Argument 'callback' must be of type Function");
		}
		emitter.once("findAll", callback);
	}

	self.__provider.list({ include_docs: true }, function (err, body) {
		var docs;

		if (err) {
			if (err.syscall === 'getaddrinfo' && err.description === 'getaddrinfo ENOTFOUND') {
				err = new Error("Server '" + self.url + "' not found.");
			}
			if (err.reason === 'no_db_file') {
				err = new Error("Database '" + self.database + "' not found.");
			}
			if (err.reason === 'Name or password is incorrect.') {
				err = new Error('Name or password is incorrect.');
			}
			if (err.error && err.stack) {
				err.stack = err.error + ": " + err.stack + "\n" + stack.replace("Error\n", "");
			}
			emitter.emit("findAll", err);
			return self.emit("findAll", err);
		}
		docs = body.rows.map(function (result) {
			return result.doc;
		});
		emitter.emit("findAll", null, docs.slice(0));
		return self.emit("findAll", null, docs.slice(0));
	});

	return emitter;
};

/**
 * Find data using a key from the underlying data store
 * @param {String|Number} key The key of the data to fetched
 * @param {Function} [callback] The function to call when the data is fetched
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.findByKey = function (key, callback, rev) {
	if (!key) { throw new Error("Argument 'key' is required"); }
	if (typeof key !== "string" && typeof key !== "number") { throw new Error("Argument 'key' must be a string or number"); }

	var self = this;
	var emitter = new EventEmitter();
	var stack = new Error().stack;

	if (callback) {
		if (!(callback instanceof Function)) {
			throw new Error("Argument 'callback' must be of type Function");
		}
		emitter.once("findByKey", callback);
	}

	self.__provider.fetch({ keys: [key], include_docs: true }, function (err, body) {
		if (!err && body.rows.length === 0) {
			if (rev) {
				err = new Error("Item with key '" + key + "' and rev '" + rev + "' does not exist");
			} else {
				err = new Error("Item with key '" + key + "' does not exist");
			}
		}
				
		if (!err && body.rows.length > 1) {
			if (rev) {
				err = new Error("Found multiple items with key '" + key + "' and rev '" + rev + "'");
			} else {
				err = new Error("Found multiple items with key '" + key + "'");
			}
		}

		if (!err && body.rows[0].error) {
			if (rev) {
				err = new Error("Item with key '" + key + "' and rev '" + rev + "' does not exist");
			} else {
				err = new Error("Item with key '" + key + "' does not exist");
			}
		}
		
		if (!err && body.rows[0].error) {
			err = new Error(body.rows[0].error);
		}
		
		if (err) {
			if (err.syscall === 'getaddrinfo' && err.description === 'getaddrinfo ENOTFOUND') {
				err = new Error("Server '" + self.url + "' not found.");
			}
			if (err.reason === 'Name or password is incorrect.') {
				err = new Error('Name or password is incorrect.');
			}
			if (err.reason === 'no_db_file') {
				err = new Error("Database '" + self.database + "' not found.");
			}
			if (err.error && err.stack) {
				err.stack = err.error + ": " + err.stack + "\n" + stack.replace("Error\n", "");
			}
			emitter.emit("findByKey", err);
			return self.emit("findByKey", err);
		}

		emitter.emit("findByKey", null, JSON.parse(JSON.stringify(body.rows[0].doc)));
		return self.emit("findByKey", null, JSON.parse(JSON.stringify(body.rows[0].doc)));
	});

	return emitter;
};

/**
 * Store data in the underlying data store
 * @param {Object} data The data to store in underlying data store
 * @param {Function} [callback] The function to call when the data is saved
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.save = function (data, callback) {
	if (!data) { throw new Error("Argument 'data' is required"); }

	var self = this;
	var emitter = new EventEmitter();
	var stack = new Error().stack;

	if (callback) {
		if (!(callback instanceof Function)) {
			throw new Error("Argument 'callback' must be of type Function");
		}
		emitter.once("save", callback);
	}
	self.__provider.insert(data, data._id, function (err, body) {
		if (err) {
			if (err.syscall === 'getaddrinfo' && err.description === 'getaddrinfo ENOTFOUND') {
				err = new Error("Server '" + self.url + "' not found.");
			}
			if (err.reason === 'no_db_file') {
				err = new Error("Database '" + self.database + "' not found.");
			}
			if (err.reason === 'Name or password is incorrect.') {
				err = new Error('Name or password is incorrect.');
			}
			if (err.error && err.stack) {
				err.stack = err.error + ": " + err.stack + "\n" + stack.replace("Error\n", "");
			}
			emitter.emit("save", err);
			return self.emit("save", err);
		}
		if (!body.ok) {
			emitter.emit("save", new Error("Server returned not ok"));
			return self.emit("save", new Error("Server returned not ok"));
		}
		var clone = JSON.parse(JSON.stringify(data));
		clone._id = body.id;
		clone._rev = body.rev;
		emitter.emit("save", null, clone);
		return self.emit("save", null, clone);
	});

	return emitter;
};

/**
 * Remove data from the underlying data store
 * @param {Object} data The data to remove
 * @param {Function} [callback] The function to call when the data is removed
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.remove = function (data, callback) {
	if (!data) { throw new Error("Argument 'data' is required"); }
	if (!data._id) { throw new Error("Argument 'data' is missing a '_id' property"); }
	if (!data._rev) { throw new Error("Argument 'data' is missing a '_rev' property"); }

	var self = this;
	var emitter = new EventEmitter();
	var stack = new Error().stack;

	if (callback) {
		if (!(callback instanceof Function)) {
			throw new Error("Argument 'callback' must be of type Function");
		}
		emitter.once("remove", callback);
	}
	self.__provider.destroy(data._id, data._rev, function (err) {
		if (err) {
			if (err.syscall === 'getaddrinfo' && err.description === 'getaddrinfo ENOTFOUND') {
				err = new Error("Server '" + self.url + "' not found.");
			}
			if (err.reason === 'no_db_file') {
				err = new Error("Database '" + self.database + "' not found.");
			}
			if (err.reason === 'Name or password is incorrect.') {
				err = new Error('Name or password is incorrect.');
			}
			if (err.error && err.stack) {
				err.stack = err.error + ": " + err.stack + "\n" + stack.replace("Error\n", "");
			}
			if (err.status_code === 404) {
				err = new Error("Item with id '" + data._id + "' and rev '" + data._rev + "' does not exist");
			}
			emitter.emit("remove", err);
			return self.emit("remove", err);
		}
		emitter.emit("remove", null);
		return self.emit("remove", null);
	});

	return emitter;

};

/**
 * Connect to the underlying data store
 * @param {Function} [callback] The function to call when connected
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.connect = function (callback) {
	var self = this;
	var emitter = new EventEmitter();

	if (callback) {
		if (!(callback instanceof Function)) {
			throw new Error("Argument 'callback' must be of type Function");
		}
		emitter.once("connect", callback);
	}
	
	process.nextTick(function () {
		emitter.emit("connect", null, self);
		return self.emit("connect", null, self);
	});
	
	return callback;
};

/**
 * Disconnect from the underlying data store
 * @param {Function} [callback] The function to call when disconnected
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.disconnect = function (callback) {
	var self = this;
	var emitter = new EventEmitter();

	if (callback) {
		if (!(callback instanceof Function)) {
			throw new Error("Argument 'callback' must be of type Function");
		}
		emitter.once("disconnect", callback);
	}
	
	process.nextTick(function () {
		emitter.emit("disconnect", null, self);
		return self.emit("disconnect", null, self);
	});
	
	return callback;
};

/**
 * Check if the provider is connected to the underlying data store
 * @returns {boolean}
 */
CouchDB.prototype.isConnected = function () {
	return true;
};

/**
 * Return the CouchDB Provider
 * @type {Function}
 */
module.exports = CouchDB;
