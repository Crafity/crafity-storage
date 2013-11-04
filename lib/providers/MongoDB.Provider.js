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
var core = require('crafity-core');
var Synchronizer = core.Synchronizer;
var Provider = require('./Provider');
var EventEmitter = require('events').EventEmitter;
var mongoDB = require("mongodb");
var MongoClient = mongoDB.MongoClient;

/**
 * Clone a JavaScript object
 * @param {Object} obj The object to copy.
 *
 * @returns {Object} Returns the cloned object.
 */
function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function validateIdArgument(id) {
	if (!id) {
		throw new Error(this.missing_id_err);
	}

	if (typeof id !== "string") {
		throw new Error(this.id_not_string_err);
	}

	var objectID = null;
	try {
		objectID = mongoDB.ObjectID(id);

		return objectID;

	} catch (error) {
		throw new Error(this.invalid_ObjectID_err);
	}

}

function validateCallbackArgument(callback) {
	if (!callback) {
		throw new Error(this.missing_callback_err);
	}
	if (!(callback instanceof Function)) {
		throw new Error(this.callback_not_a_function_err);
	}
}

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
	this.missing_arguments_err = "Missing exact number of arguments: ";
	this.missing_data_err = "Missing 'data' argument.";
	this.missing_data_id_err = "Missing 'data._id' argument.";
	this.missing_id_err = "Missing 'id' argument.";
	this.id_not_string_err = "Argument 'id' must be of type string.";
	this.invalid_ObjectID_err = "Invalid ObjectID is derived from the given id argument. id must be a single String of 12 bytes or a string of 24 hex characters.";
	this.missing_key_err = "Missing 'key' argument.";
	this.missing_callback_err = "Missing 'callback' argument.";
	this.callback_not_an_Object_err = "Argument 'data' must be of type Object.";
	this.callback_not_an_Array_err = "Argument 'data' must be of type Array.";
	this.callback_not_a_function_err = "Argument 'callback' must be of type Function.";

	this.no_connection_err = "There is no open connection to the dabase server. Call connect function first.";

}

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

/**
 * Connect to the underlying data store.
 *
 * @param {Function} [callback] The function to call when connected.
 *            First and only argument is of type Error if an error occured. Otherwise null.
 */
MongoDB.prototype.connect = function (callback) {
	validateCallbackArgument.call(this, callback);
	var self = this;

	if (self.isConnected()) {
//		console.log("ALREADY CONNEcTED...!");
		return process.nextTick(function () {
			callback(null);
		});
	}

	MongoClient.connect(self.url, function (err, db) {
		if (err) {
			return callback(err);
		}

		self._db = db;
		callback(null);

	});
};

/**
 * Disconnect from the underlying data store.
 *
 * @param {Function} [callback] The function to call when disconnected.
 * First parameter contains an Error object, if an error occured. Otherwise null.
 */
MongoDB.prototype.disconnect = function (callback) {
	validateCallbackArgument.call(this, callback);

	var self = this;
	if (!this.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	// close the current connection
	self._db.close(function (err, result) { // argument result is undefined, whats the purpose of it, should ask mongodb native for nodejs
		self._db = null;
		return setTimeout(function () {
			callback(err);
		}, 200);
	});
};

/**
 * Check if the provider is connected to the underlying data store.
 *
 * @returns {Boolean} Returns true if connected and false otherwise.
 */
MongoDB.prototype.isConnected = function () {
	var self = this;

	return self._db !== null;
};

/**
 * Create new data store / database.
 * @param {Function} callback Returns a callback after executing this method.
 *                            The first argument contains the Error object in case of an error, otherwise null.
 *                            The second argument contains the name of the database of type String, or null of error occured.
 *
 * Note: mongodb does not explicitly and physically create a database.
 * The database name is always mentioned in the connection url during the executuin of function connect(url)
 * One established connection to a database is at the same time a promise that the database exists virtually
 * and can be used to create collecitons in it.
 */
MongoDB.prototype.create = function (callback) {
	validateCallbackArgument.call(this, callback);

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

/**
 * Drop data store / database.
 * @param {Function} callback Returns a callback after executing this method.
 *                            The first and only argument contains the Error object in case of an error, otherwise null.
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
		if (err) {
			return callback(err);
		}
		if (done === false) {
			/* What the ... is done??? */
			return callback(new Error("Dropping database " + self.dbName + " did not succeed."));
		}

		self._db = null;
		return callback(null);

		// Source: http://mongodb.github.io/node-mongodb-native/api-generated/admin.html#listdatabases
		// NB! Do not use the following code. It was intenationally written to do an extra check
		// that the database is actually dropped, but by reconnecting to the same database obstructed the logical dropping of the
//		database and made it show as still existing in a way. It is the particular implementation of mongodb
		
		
//		self.showAllDatabases(function (err, dbNames) {
//			if (err) {
//				return callback(err);
//			}
//
//			if (dbNames.indexOf(self.dbName) === -1) {
//				console.log("Dropped => $s is not in dbNames	....", self.dbName, dbNames);
//				this._db = null;
//
//				return setTimeout(function () {
//					callback(null);
//				}, 200);
//			}
//
////			//Execute lastError
////			self._db.lastError(function (err, result) {
////				self._db.lastError({}, {connection: self.connection}, function (err, result) {
////					return callback(new Error("Dropping database " + self.dbName + " did not succeed."));
////				});
////			});
//		});

	});
};

/**
 * Create a new database by dropping and creating a new database
 * @param callback The callback to call when the database is recreated
 */
MongoDB.prototype.recreate = function (callback) {
	validateCallbackArgument.call(this, callback);

	var self = this;
	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	self.drop(function (err) {
		if (err) {
			return callback(err);
		}

		self.connect(function (err) {
			if (err) {
				return callback(err);
			}

			return callback(null);
		});

	});

};

/**
 * Save data to the underlying data store.
 * @param {Object} data The data to insert or update depending on whether it already exists in the collection or not.
 * @param {Function} [callback] The function to call when the data is saved.
 *                  The first argument contains the Error object in case of an error, otherwise null.
 *                  The second argument is of type Object - the saved document (inserted or updated).
 *
 * @example inserting data
 *
 * var newDocument = { name: "test", timeStamp: Date.now() };
 *
 * mongoDB.save(newDocument, function(err, insertedDocument){...});
 *
 *
 *
 * @example updating data
 *
 * mongoDB.findOneByKey({name: "test"}, function(err, document) {
 *	
 *	document.name = "modified";
 * 	mongoDB.save(document, function(err, updatedDocument) {...});
 *			
 * }
 *
 */
MongoDB.prototype.save = function (data, callback) {
	if (!data) {
		throw new Error(this.missing_data_err);
	}
	validateCallbackArgument.call(this, callback);

	var self = this;
	var isInsert = !data._id;

	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	// this is a hybrid operation - either insert (when there's missing _id)
	// or update of the given data document.
	// NB! It is inneficient to use save, because it performs a whole document 
	// replacement.
	self._db.collection(self.collection).save(clone(data), function (err, result) {
		if (isInsert) {
			return callback(err, clone(result));
		}
		return callback(err, clone(data));
	});
};

/**
 * Save many item to the underlying data store at the same time
 * @param {Array} data The data to store
 * @param {Function} [callback] The function to call when the data is saved.
 *                        The first argument contains the Error object in case of an error, otherwise null.
 *                        The second argument contains the name of the saved documents of type Array.
 *
 */
MongoDB.prototype.saveMany = function (data, callback) {
	if (!data) {
		throw new Error(this.missing_data_err);
	}
	validateCallbackArgument.call(this, callback);

	var self = this;

	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	var synchronizer = new Synchronizer();

	data.forEach(function (document, index) {
		self.save(document, synchronizer.register("save" + index));
	});

	synchronizer.onfinish(function (err, result) {
		var documentList = Object.keys(result).map(function (key) {
			return result[key];
		});
//		console.log("synchronizer.onfinish => arguments", arguments);
		return callback(err, documentList);
	});
};

/**
 * Remove data from the underlying data store
 * @param {Object} data The data to remove
 * @param {Function} [callback] The function to call when the data is removed.
 *                     The first argument contains the Error object in case of an error, otherwise null.
 *
 */
MongoDB.prototype.remove = function (data, callback) {
	if (!data) {
		throw new Error(this.missing_data_err);
	}
	if (!(data instanceof Object)) {
		throw new Error(this.callback_not_an_Object_err);
	}

	if (!data._id) {
		throw new Error(this.missing_data_id_err);
	}
	validateCallbackArgument.call(this, callback);

	var self = this;

	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}
	var id = null;
	try {
		id = mongoDB.ObjectID(data._id);
	} catch (error) {
		throw new Error("Error: the provided _id is not a valid one. It must be a single String of 12 bytes or a string of 24 hex characters.");
	}

	self._db.collection(self.collection).remove({"_id": id}, function (err, result) {
		// skip the result argument as it does not give any valuable information on removal
		// should ask mongodb native why bother to do it
		callback(err);
	});
};

/**
 * Remove many items from the underlying data store
 * @param {Array} data The data / documents to remove.
 * @param {Function} [callback] The function to call when the data is removed.
 *                    The first argument contains the Error object in case of an error, otherwise null.
 *
 * Note that if even only one document lacks a technical identifier (_id) then the whole transaction
 * is rejected and no documents are to be removed.
 *
 */
MongoDB.prototype.removeMany = function (data, callback) {
	if (!data) {
		throw new Error(this.missing_data_err);
	}
	if (!(data instanceof Array)) {
		throw new Error(this.callback_not_an_Array_err);
	}

	var self = this;
	var docsWithMissingIds = data.filter(function (doc) {
		if (!doc._id) {
			return doc;
		}
	});
	if (docsWithMissingIds && docsWithMissingIds.length > 0) {
		throw new Error(self.missing_data_id_err);
	}

	validateCallbackArgument.call(this, callback);

	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	var idArray = null;
	try {
		idArray = data.filter(function (doc) {
			return mongoDB.ObjectID(doc._id);
		});

	} catch (error) {
		throw new Error("Error: the provided _id is not a valid one. It must be a single String of 12 bytes or a string of 24 hex characters.");
	}

	if (idArray.length > 0) {
		var synchronizer = new Synchronizer();

		data.forEach(function (document, index) {
			self.remove(document, synchronizer.register("removeMany" + index));
		});

		synchronizer.onfinish(function (err, result) {
			return callback(err);
		});
	} else {
		return callback(null);
	}
};

/**
 * Find data by id in the underlying data store
 * @param {String} id The Id of the data to fetched
 * @param {String} [rev] The revision number of the data to fetched -
 *        NB! The revision number is of no concern for mongodb provider implementation and will be skipped.
 * @param {Function} [callback] The function to call when the data is fetched.
 *                          The first argument contains the Error object in case of an error, otherwise null.
 *                          The second argument contains the found document of type Object.
 */
MongoDB.prototype.findById = function (id, callback) {
	if (arguments.length !== 2) {
		throw new Error(this.missing_arguments_err + 2);
	}
	var objectID = validateIdArgument.call(this, id);
	validateCallbackArgument.call(this, callback);

	var self = this;
	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	self._db.collection(self.collection)
		.find({"_id": objectID })
		.toArray(function (err, docs) {
			if (docs.length > 1) {
				callback("Error: found more than one documents with the same ObjectID: ", objectID);
			} else {
				if (!docs[0] || docs[0] === null) {
					callback("Error: No document found with ObjectID: ");
				} else {
					callback(err, docs[0]);
				}
			}
		});
};

/**
 * Find data by key from the underlying data store
 * @param {Object} key The filter key to fetch documents
 * @param {Function} [callback] The function to call when the document is fetched
 *              The first argument contains the Error object in case of an error, otherwise null.
 *              The second argument contains the found document of type Object.
 *
 */
MongoDB.prototype.findByKey = function (key, callback) {
	if (!key) {
		throw new Error(this.missing_key_err);
	}
	validateCallbackArgument.call(this, callback);

	var self = this;
	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	this._db.collection(self.collection).findOne(key, function (err, foundDocument) {
		callback(err, foundDocument);
	});
};

/**
 * Find data using a key from the underlying data store
 * @param {Object} key The filter to fetch documents
 * @param {Function} [callback] The function to call when the documents are fetched.
 *              The first argument contains the Error object in case of an error, otherwise null.
 *              The second argument contains the list found documents of type Array.
 *
 *
 * @example findManyByKey with a simple filter
 *
 * mongoDB.findManyByKey({name: "test"}, function(err, foundDocuments) {
 *	
 * 	// returns all documents with name property equal to "test"
 * }
 *
 * @example findManyByKey with more complex filter (source:  http://docs.mongodb.org/manual/tutorial/query-documents/ )
 *
 * mongoDB.findManyByKey({"name": /test item/}, function(err, foundDocuments) {
 *	
 * 	// returns all documents with name property with a value containing to "... test item ..."
 * }
 *
 */
MongoDB.prototype.findManyByKey = function (key, callback) {
	if (!key) {
		throw new Error(this.missing_key_err);
	}
	validateCallbackArgument.call(this, callback);

	var self = this;
	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	// sources: 
	// http://mongodb.github.io/node-mongodb-native/markdown-docs/queries.html?highlight=find
	// http://docs.mongodb.org/manual/tutorial/query-documents/
	self._db.collection(self.collection).find(key).toArray(callback);
};

/**
 * Find all the data from the underlying data store.
 * @param {Function} [callback] The function to call when the data is fetched.
 *              The first argument contains the Error object in case of an error, otherwise null.
 *              The second argument contains an array of all found documents of type Object.
 *
 */
MongoDB.prototype.findAll = function (callback) {
	validateCallbackArgument.call(this, callback);

	var self = this;
	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

//	var stream = self._db.collection(self.collection).find({mykey: {$ne: 2}}).stream();
//	stream.on("data", function (item) {
//		console.log("Retrieved item: ", item);
//	});
//	stream.on("end", function () {
//	});

	self._db.collection(self.collection)
		.find()
		.toArray(function (err, docs) {
			callback(err, docs);
		});
};

/**
 * This is an admin utility to query a list of all available mongodb databases.
 * @param {Function} callback The function to call when mongodb is queried.
 *                The first argument contains the Error object in case of an error, otherwise null.
 *                The second argument contains the list found documents of type Array.
 *
 */
MongoDB.prototype.showAllDatabases = function (callback) {
	validateCallbackArgument.call(this, callback);

	var self = this;

	if (!self.isConnected()) {
		return process.nextTick(function () {
			callback(new Error(self.no_connection_err));
		});
	}

	self._db.admin().listDatabases(function (err, dbs) {
		if (err) {
			return callback(err);
		}
		try {
			var dbNames = dbs.databases.map(function (db) {
				return db.name;
			});

			callback(null, dbNames);
		} catch (error) {
			callback(error);
		}

	});
};

/**
 * Return the MongoDB Provider
 * @type {Function}
 */
module.exports = MongoDB;

//dispose - X