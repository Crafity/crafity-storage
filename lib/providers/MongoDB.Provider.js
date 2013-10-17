/*jslint node:true, white:true, unparam:true */
"use strict";

/*!
 * crafity-storage - Crafity MongoDB Provider
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Galina Slavova
 * Copyright(c) 2013 Bart Riemens
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var Provider = require('./Provider');
var EventEmitter = require('events').EventEmitter;
var mongoose = require('mongoose');

/**
 * @constructor - A MongoDB Provider Constructor.
 *
 * This provider represents a repository for a single mongodb collection.
 * A schema for this collection is optional.
 *
 * @example with a collection schema:
 *
 * var membersConfig =
 *  { 	
 * 			"name": "members provider",
 * 			"url": "mongodb://localhost/crafity-test", 
 * 			"collection": "members",
 * 			"schema": { name: String, age: Int }
 * 	};
 *
 * var membersProvider = new MongoDB(membersConfig);
 *
 * @example without collection schema
 * // returns 3
 * globalNS.method(5, 15);
 *
 */
function MongoDB(config) {
	if (!config) {
		throw new Error("Expected a MongoDB configuration");
	}
	if (!config.url) {
		throw new Error("Expected a url in the MongoDB configuration");
	}
	if (!config.name) {
		throw new Error("Expected a name in the MongoDB configuration");
	}
	if (!config.collection) {
		throw new Error("Expected a collection name in the MongoDB configuration");
	}

	this.type = "MongoDB Provider";
	this.url = config.url;
	this.name = config.name;
	this.collection = config.collection;

	this._mongooseProvider = new mongoose.Mongoose();
	this._connection = null;

	if (config.schema) {
		this._schema = config.schema;
		this.ObjectId = config.schema.id = mongoose.Schema.ObjectId;
		console.log("\nPrint => config.schema", config.schema);

//		var Schema = mongoose.Schema;
		// make your schema strict! Ensure that if you add unknown fiels to the model it will NOT accept it. Usually it does
		var Model = this._mongooseProvider.model(config.collection, new mongoose.Schema(config.schema, {strict: true}));
		this._mongooseModel = new Model();
	}
}

/**
 * Set the generic provider as the prototype
 * @type {Provider}
 */
MongoDB.prototype = new Provider();

/**
 * Create data store / database.
 * @param config
 * @param callback
 */
MongoDB.prototype.create = function (callback) {
	if (!callback) {
		throw new Error("Missing 'callback' argument.");
	}
	if (!(callback instanceof Function)) {
		throw new Error("Argument 'callback' must be of type Function.");
	}

	var self = this;
	this.connect(function (err) {
		if (err) {
			return callback(err);
		}

		return self._mongooseModel.save(function () {

			self._mongooseModel.collection.remove(function () {  //	Model.collection.remove(function () {

				self._mongooseModel.collection.save({}, function (err) {
					if (err) {
						return callback(err);
					}

					return self._mongooseModel.collection.remove(function () {

						
						return setTimeout(function () {
							self.disconnect(function (err) {
								if (err) {
									return callback(err);
								}
								return callback();
							});
						}, 100);
						
						
					});
				});
			});

		});

	});

//	this._mongooseProvider.connect(this.url);
//
//	this._mongooseProvider.connection.once('open', function (err) {
//		if (err) {
//			return callback(err);
//		}
//
//		return this._mongooseModel.save(function () {
//
//			this._mongooseModel.collection.remove(function () { //			Model.collection.remove(function () {
//
//				this._mongooseModel.collection.save({}, function (err) {
//					if (err) {
//						return callback(err);
//					}
//
//					return this._mongooseModel.collection.remove(function () {
//
//						return setTimeout(function () {
//							this._mongooseProvider.disconnect(function (err, res) {
//								if (err) {
//									return callback(err);
//								}
//								return callback();
//							});
//						}, 100);
//					});
//				});
//			});
//
//		});
//	});
};

/**
 * Check if the provider is connected to the underlying data store.
 */
MongoDB.prototype.isConnected = function () {
	return  this._connection !== null && this._connection.readyState === 1;
};

/**
 * Connect to the underlying data store.
 * @param {Function} [callback] The function to call when connected
 */
MongoDB.prototype.connect = function (callback) {
	if (!callback) {
		throw new Error("Missing callback argument.");
	}
	if (!(callback instanceof Function)) {
		throw new Error("Argument 'callback' must be of type Function");
	}

	var self = this; // save this context to preserve in callback functions

	// if connection is already open then return it asynchronously
	if (self.isConnected()) {
		return process.nextTick(function () {
			callback(null, self._connection);
		});
	}

	// otherwise call connect
	self._mongooseProvider.connect(self.url);
	self._mongooseProvider.connection.once('open', function (err) {
		if (err) {
			return callback(err);
		}

		self._connection = self._mongooseProvider.connection;
		callback(null, self._connection);
	});
};

/**
 * Disconnect from the underlying data store.
 * @param {Function} [callback] The function to call when disconnected
 */
MongoDB.prototype.disconnect = function (callback) {
	if (!callback) {
		return callback(new Error("Missing callback argument"));
	}
	if (!(callback instanceof Function)) {
		return callback(new Error("Argument 'callback' must be of type Function"));
	}

	var self = this;
	if (!self.isConnected()) {
		return callback(new Error("There is no live connection to the data source."));
	}

	self._mongooseProvider.disconnect(function () {
		self._connection = null;
		return callback();
	});

};

/**
 * Save data to the underlying data store
 * @param {Object} data The data to save
 * @param {Function} [callback] The function to call when the data is saved
 */
MongoDB.prototype.save = function (data, callback) {
	if (!data) {
		throw new Error("Missing 'data' argument.");
	}
	if (!callback) {
		throw new Error("Missing 'callback' argument.");
	}
	if (!(callback instanceof Function)) {
		throw new Error("Argument 'callback' must be of type Function");
	}

	var self = this;

	// Save method to mongoDB means a whole document replacement, 
	// which is not advisable due to efficiency reasons. 
	// Use update method instead.
	self.connect(function (err, connection) {
		if (err) {
			return callback(err);
		}

//		console.log("connection.db.collection", connection.db.collection);
		// using save in mongoDB means replacing the whole document and has lower performance
		// it is either an insert (if not exists) or a update (if exists) action
		connection.db.collection(self.collection, function (err, collection) {
			collection.save(data, {safe: true}, function (err, savedData) {
				console.log("savedData", savedData);
				return callback(err, savedData);
			});
		});

	});
};

/**
 * Return the MongoDB Provider
 * @type {Function}
 */
module.exports = MongoDB;