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
var MongoClient = require("mongodb").MongoClient;
var format = require('util').format;

/**
 * @constructor - A MongoDB Provider Constructor.
 *
 * MongoDB Provider represents a repository for a single mongodb collection inside a specific database.
 *
 *
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

	this.config = config;
	this.type = "MongoDB Provider";
	this.url = config.url;
	this.dbName = this.url.substring(this.url.lastIndexOf("/") + 1);
	this.name = config.name;
	this.collection = config.collection;
//	this.schema = config.schema || { _id: mongoose.Schema.ObjectId }; // { id: Int, name: String }

	this._db = null;

	// make your schema strict! Ensure that if you add unknown fiels to the model it will NOT accept it. Usually it does
//	this.Model = this._mongooseProvider.model(this.collection, new mongoose.Schema(this.schema, {strict: true}));
//	this._mongooseModel = new this.Model();

	// uniform error messages
	this.callback_not_a_function_err = "Argument 'callback' must be of type Function.";
	this.no_connection_err = "There is no open connection to the dabase server. Call connect function first.";
	this.expected_closed_connection = "Expected the connection to be closed.";
	this.missing_callback_err = "Missing 'callback' argument.";
	this.missing_data_err = "Missing 'data' argument.";

}

// done
/**
 * Set the generic provider as the prototype of this object.
 * @type {Provider}
 */
MongoDB.prototype = new Provider();

///**
// * Expose this member to the prototype instance.
// * @type {exports.Schema|*}
// */
//MongoDB.ObjectId = mongoose.Schema.Types.ObjectId;

// done
/**
 * Create new data store / database.
 * @param {Function} callback Returns a callback after executing this method.
 *                            The first argument contains the Error object in case of an error, otherwise null.
 *                            The second argument contains the name of the database of type String, or null of error occured.
 *
 * Note: mongodb does not explicitly and physically create a database.
 * The database name is always mentioned in the connection url during the executuin of function connect(url)
 * On established connection there is a promise that the database exists virtually and can be used to create colleciton in it.
 */
MongoDB.prototype.create = function (callback) {
	if (!callback) {
		throw new Error(this.missing_callback_err);
	}
	if (!(callback instanceof Function)) {
		throw new Error(this.callback_not_a_function_err);
	}

	var self = this;
	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}
	return process.nextTick(function () {
		callback(null, self.dbName);
	});
};

// done
/**
 * Drop data store / database.
 * @param {Function} callback Returns a callback after executing this method.
 *                            The first argument contains the Error object in case of an error, otherwise null.
 */
MongoDB.prototype.drop = function (callback) {
	if (!callback) {
		throw new Error(this.missing_callback_err);
	}
	if (!(callback instanceof Function)) {
		throw new Error(this.callback_not_a_function_err);
	}

	var self = this;

	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	self._db.dropDatabase(function (err, done) {
//		console.log("\nDropping database %s ......", self.dbName);

		// Source: http://mongodb.github.io/node-mongodb-native/api-generated/admin.html#listdatabases
		self._db.admin().listDatabases(function (err, dbs) {
//			console.log("Listed databases = ", dbs.databases);

			var dbNames = dbs.databases.map(function (db) {
				return db.name;
			});

			if (done && dbNames.indexOf(self.dbName) === -1) {
				callback(err, done);
			} else {
				if (err) {
					callback(err);
				} else {
					callback(new Error("Dropping database %s did not succeed.", self.dbName));
				}
			}
		});

	});
};

// done
/**
 * Check if the provider is connected to the underlying data store.
 */
MongoDB.prototype.isConnected = function () {
	return this._db !== null;
};

// done
/**
 * Connect to the underlying data store.
 * @param {Function} [callback] The function to call when connected.
 *            First and only argument is of type Error if an error occured. Otherwise null.
 */
MongoDB.prototype.connect = function (callback) {
	if (!callback) {
		throw new Error(this.missing_callback_err);
	}
	if (!(callback instanceof Function)) {
		throw new Error(this.callback_not_a_function_err);
	}

	var self = this;

	MongoClient.connect(self.url, function (err, db) {
		if (err) {
			return callback(err);
		}

		self._db = db;
		callback(null);

	});
};

// done
/**
 * Disconnect from the underlying data store.
 * @param {Function} [callback] The function to call when disconnected.
 * First parameter contains an Error object, if an error occured. Otherwise null.
 */
MongoDB.prototype.disconnect = function (callback) {
	if (!callback) {
		return callback(new Error(this.missing_callback_err));
	}
	if (!(callback instanceof Function)) {
		return callback(new Error(this.callback_not_a_function_err));
	}

	var self = this;
	if (!this.isConnected()) {
		return process.nextTick(function () {
			callback(new Error("There is no live connection to the data source."));
		});
	}

	// close the current connection
	self._db.close(function (err, result) { // this result is undefined, whats the purpose of it, should ask mongodb native for nodejs
		self._db = null;

		return callback(err);
	});
};

// done
/**
 * Save data to the underlying data store.
 * @param {Object} data The data to insert or update depending on whether it already exists in the collection or not.
 * @param {Function} [callback] The function to call when the data is saved.
 *                  The first argument contains the Error object in case of an error, otherwise null.
 *                  The second argument is either of type Object - in case of insert, or type Int - in case of update.
 *
 * @example inserting data
 *
 *  var newDocument = { name: "test", timeStamp: Date.now() };
 *
 *  mongoDB.save(newDocument, function(err, savedDocument){...});
 *
 * @example updating data
 *
 *  var newDocument = { name: "test", timeStamp: Date.now() };
 *
 *  mongoDB.findOne({name: "test"}, function(err, document) {
 *	
 *		document.name = "modified";
 *  	mongoDB.save(newDocument, function(err, integerResult){...});
 *			
 *  }
 *
 */
MongoDB.prototype.save = function (data, callback) {
	if (!data) {
		throw new Error(this.missing_data_err);
	}
	if (!callback) {
		throw new Error(this.missing_callback_err);
	}
	if (!(callback instanceof Function)) {
		throw new Error(this.callback_not_a_function_err);
	}

	var self = this;

	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	// this is a hybrid operation - either insert (when there's missing _id)
	// or update of the given data document.
	self._db.collection(self.collection).save(data, function (err, result) {
//		console.log("arguments", arguments);
		callback(err, result);
	});
};

// TO BE DONE 

/**
 * Find all the data from the underlying data store
 * @param {Function} [callback] The function to call when the data is fetched
 */
MongoDB.prototype.findAll = function (callback) {
	if (!callback) {
		return callback(new Error("Missing callback argument"));
	}
	if (!(callback instanceof Function)) {
		return callback(new Error("Argument 'callback' must be of type Function"));
	}

	var self = this;
	self.connect(function (err, connection) {
		if (err) {
			return callback(err);
		}

		return connection.db.collection(self.collection, function (err, collection) {
			var find = collection.find();

			find.toArray(function (err, result) {
				callback(err, result);
			});

		});

	});
};

/**
 * Return the MongoDB Provider
 * @type {Function}
 */
module.exports = MongoDB;

//
// decimal => %d
// string => %s

// object => %s
//create - done
//drop - done
//recreate - X
//isConnected - done
//connect - done
//disconnect - done
//dispose - X
//save - done
//remove - X
//findByKey - X
//findAll - X
