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
	var process = this._createProcess("findByKey", callback, new Error().stack);

	process.success(function (update, body) {
		var docs = body.rows.map(function (result) {
			return result.doc;
		});
		update(docs.slice(0));
	});

	this.__provider.list({ include_docs: true }, process.complete);

	return process.emitter;
};

/**
 * Find data by id in the underlying data store
 * @param {String} id The Id of the data to fetched
 * @param {String} [rev] The Id of the data to fetched
 * @param {Function} [callback] The function to call when the data is fetched
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.findById = function (id, rev, callback) {
	if (!id) { throw new Error("Argument 'id' is required"); }
	if (typeof id !== "string") { throw new Error("Argument 'id' must be a string"); }

	if (!callback) {
		callback = rev;
		rev = null;
	}
	if (rev && typeof rev !== "string") { throw new Error("Argument 'rev' must be a string"); }

	var process = this._createProcess("findById", callback, new Error().stack);

	process.error(function handleError(err) {
		if (err.status_code === 404) {
			if (rev) {
				throw new Error("Item with id '" + id + "' and rev '" + rev + "' does not exist");
			}
			throw new Error("Item with id '" + id + "' does not exist");
		}
		return err;
	});

	process.success(function (update, doc) {
		return update(JSON.parse(JSON.stringify(doc)));
	});

	var params = { include_docs: true };
	if (rev) { params.rev = rev; }
	this.__provider.get(id, params, process.complete);

	return process.emitter;
};

/**
 * Find data using a key and view from the underlying data store
 * @param {Object} key The key of the data to fetched
 * @param {Function} [callback] The function to call when the data is fetched
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.findByKey = function (key, callback) {
	if (!key) { throw new Error("Argument 'key' is required"); }

	var process = this._createProcess("findByKey", callback, new Error().stack);

	process.success(function (update, body) {
		if (body.rows.length === 0) {
			throw new Error("Item with key '" + key + "' does not exist");
		}

		if (body.rows.length > 1) {
			throw new Error("Found multiple items with key '" + key + "'");
		}

		return update(JSON.parse(JSON.stringify(body.rows[0].doc)));
	});

	this.__provider.view(this.design, this.view, { keys: [key], include_docs: true }, process.complete);

	return process.emitter;
};

/**
 * Find data using a key from the underlying data store
 * @param {String|Number} key The key of the data to fetched
 * @param {Function} [callback] The function to call when the data is fetched
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.findManyByKey = function (key, callback) {
	if (!key) { throw new Error("Argument 'key' is required"); }

	var process = this._createProcess("findManyByKey", callback, new Error().stack);

	process.success(function (update, body) {
		var docs = body.rows.map(function (row) {
			return row.doc;
		});
		return update(JSON.parse(JSON.stringify(docs.slice(0))));
	});

	this.__provider.view(this.design, this.view, { keys: [key], include_docs: true }, process.complete);

	return process.emitter;
};

/**
 * Store data in the underlying data store
 * @param {Object} data The data to store in underlying data store
 * @param {Function} [callback] The function to call when the data is saved
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.save = function (data, callback) {
	if (!data) { throw new Error("Argument 'data' is required"); }

	var process = this._createProcess("save", callback, new Error().stack);

	process.success(function (update, body) {
		if (!body.ok) {
			throw new Error("Server returned not ok");
		}
		var clone = JSON.parse(JSON.stringify(data));
		clone._id = body.id;
		clone._rev = body.rev;
		return update(clone);
	});

	this.__provider.insert(data, data._id, process.complete);

	return process.emitter;
};

/**
 * Save many item to the underlying data store at the same time
 * @param {Array} data The data to store
 * @param {Function} [callback] The function to call when the data is saved
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.saveMany = function (data, callback) {
	if (!data) { throw new Error("Argument 'data' is required"); }
	if (!(data instanceof Array)) { throw new Error("Argument 'data' must be an Array"); }

	var process = this._createProcess("saveMany", callback, new Error().stack);

	process.success(function (update, updatedTestData) {
		var clone = JSON.parse(JSON.stringify(data));
		updatedTestData.forEach(function (updatedItem, index) {
			clone[index]._id = updatedItem.id;
			clone[index]._rev = updatedItem.rev;
//			clone.forEach(function (originalItem) {
//				console.log("originalItem, updatedItem", originalItem, updatedItem);
//				if (!updatedItem.ok || originalItem._id !== updatedItem.id) { return; }
//				originalItem._rev = updatedItem.rev;
//			});
		});
		update(clone);
	});

	this.__provider.bulk({ docs: data }, process.complete);

	return process.emitter;
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

	var process = this._createProcess("remove", callback, new Error().stack);

	process.error(function handleError(err) {
		if (err.status_code === 404) {
			err = new Error("Item with id '" + data._id + "' and rev '" + data._rev + "' does not exist");
		}
		return err;
	});

	this.__provider.destroy(data._id, data._rev, process.complete);

	return process.emitter;
};

CouchDB.prototype.removeAll = function (data, callback) {
	if (!data) { throw new Error("Argument 'data' is required"); }
	if (!(data instanceof Array)) { throw new Error("Argument 'data' must be an Array"); }
	if (!data.length) { throw new Error("Argument 'data' must contain at least one item"); }

	var process = this._createProcess("removeAll", callback, new Error().stack);
	var documents = data.map(function (item) {
		return { _id: item._id, _rev: item._rev, _deleted: true };
	});

	this.__provider.bulk({ docs: documents }, process.complete);

	return process.emitter;
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
 * Creates a new database in the underlying data store
 * @param {Function} [callback] The function to call when the database is created
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.create = function (callback) {
	var process = this._createProcess("create", callback, new Error().stack);

	this.__nano(this.url).db.create(this.database, process.complete);

	return process.emitter;
};

/**
 * Drops an existing database from the underlying data store
 * @param {Function} [callback] The function to call when the database is dropped
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.drop = function (callback) {
	var self = this;
	var process = this._createProcess("drop", callback, new Error().stack);

	process.error(function (err) {
		if (err.status_code === 404) {
			err = new Error("Database '" + self.database + "' not found.");
		}
		return err;
	});

	this.__nano(this.url).db.destroy(this.database, process.complete);

	return process.emitter;
};

/**
 * Create a new database by dropping and creating a new database
 * @param callback The callback to call when the DB is recreated
 * @returns {EventEmitter} Returns an event emitter
 */
CouchDB.prototype.recreate = function (callback) {
	var self = this;
	var process = this._createProcess("recreate", callback, new Error().stack);

	self.drop(function (err) {
		if (err && !(err.message === "Database '" + self.database + "' not found.")) {
			return process.complete(err);
		}
		return self.create(process.complete);
	});

	return process.emitter;
};

CouchDB.prototype._parseError = function _parseError(instance, err, stack) {
	if (!err) { return err; }
	if (err.error === 'not_found' && err.reason === "no_db_file") {
		err = new Error("Database '" + instance.database + "' not found.");
	}
	if (err.syscall === 'getaddrinfo' && err.description === 'getaddrinfo ENOTFOUND') {
		err = new Error("Server '" + instance.url + "' not found.");
	}
	if (err.reason === 'Name or password is incorrect.') {
		err = new Error('Name or password is incorrect.');
	}
	if (err.error && err.stack) {
		err.stack = err.error + ": " + err.stack + "\n" + stack.replace("Error\n", "");
	}
	return err;
};

CouchDB.prototype._createProcess = function (name, callback, stack) {
	var self = this;
	var emitter = new EventEmitter();
	var successfn;
	var errorfn;

	stack = stack || new Error().stack();

	if (callback) {
		if (!(callback instanceof Function)) {
			throw new Error("Argument 'callback' must be of type Function");
		}
		emitter.once(name, callback);
	}

	return {
		emitter: emitter,
		success: function (fn) {
			successfn = fn;
		},
		error: function (fn) {
			errorfn = fn;
		},
		complete: function (err) {
			var args = Array.prototype.slice.call(arguments);
			var update = function () {
				var updatedArgs = Array.prototype.slice.call(arguments);
				args = [args[0]].concat(updatedArgs);
			};

			err = self._parseError(self, err, stack);

			if (err && errorfn) {
				try {
					err = errorfn(err);
				} catch (errorErr) {
					err = errorErr;
				}
			}

			if (!err && successfn) {
				try {
					successfn.apply(self, [update].concat(args.slice(1)));
				} catch (successErr) {
					if (errorfn) {
						err = errorfn(successErr);
					} else {
						err = successErr;
					}
				}
			}

			var resultArray = [name, err].concat(args.slice(1));

			emitter.emit.apply(emitter, resultArray);
			self.emit.apply(self, resultArray);
		}
	};
};

/**
 * Return the CouchDB Provider
 * @type {Function}
 */
module.exports = CouchDB;
