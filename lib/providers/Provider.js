/*jslint node:true, unparam:true, white: true */
"use strict";

/*!
 * crafity-storage - Crafity Generic Base Provider
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter;

/**
 * Data Provider base object
 * @constructor
 */
function Provider() {
	this.type = "Generic Provider";
}

/**
 * Set an event emitter as the prototype of the Provider
 * @type {Object} The Event Emitter
 */
Provider.prototype = EventEmitter.prototype;

/**
 * Connect to the underlying data store.
 * @param {Function} [callback] The function to call when connected
 * @throws {Error} Not implemented error
 */
Provider.prototype.connect = function (callback) {
	throw new Error("Not implemented");
};

/**
 * Disconnect from the underlying data store
 * @param {Function} [callback] The function to call when disconnected
 * @throws {Error} Not implemented error
 */
Provider.prototype.disconnect = function (callback) {
	throw new Error("Not implemented");
};

/**
 * Check if the provider is connected to the underlying data store.
 */
Provider.prototype.isConnected = function () {
	throw new Error("Not implemented");
};

/**
 * Creates a new database in the underlying data store
 * @param {Function} [callback] The function to call when the database is created
 * @throws {Error} Not implemented error
 */
Provider.prototype.create = function (callback) {
	throw new Error("Not implemented");
};

/**
 * Drops an existing database from the underlying data store
 * @param {Function} [callback] The function to call when the database is dropped
 * @throws {Error} Not implemented error
 */
Provider.prototype.drop = function (callback) {
	throw new Error("Not implemented");
};

	/**
	 * Create a new database by dropping and creating a new database
	 * @param callback The callback to call when the DB is recreated
	 * @throws {Error} Not implemented error
	 */
	Provider.prototype.recreate = function (callback) {
		throw new Error("Not implemented");
	};

/**
 * Dispose all the underlying resources (e.g. statefull connections)
 * @param {Function} [callback] The function to call when resources are disposed
 * @throws {Error} Not implemented error
 */
Provider.prototype.dispose = function (callback) {
	throw new Error("Not implemented");
};

/**
 * Save data to the underlying data store
 * @param {Object} data The data to save
 * @param {Function} [callback] The function to call when the data is saved
 * @throws {Error} Not implemented error
 */
Provider.prototype.save = function (data, callback) {
	throw new Error("Not implemented");
};

/**
 * Save many item to the underlying data store at the same time
 * @param {Array} data The data to store
 * @param {Function} [callback] The function to call when the data is saved
 * @throws {Error} Not implemented error
 */
Provider.prototype.saveMany = function (data, callback) {
	throw new Error("Not implemented");
};

/**
 * Remove data from the underlying data store
 * @param {Object} data The data to remove
 * @param {Function} [callback] The function to call when the data is removed
 * @throws {Error} Not implemented error
 */
Provider.prototype.remove = function (data, callback) {
	throw new Error("Not implemented");
};

/**
 * Remove many items from the underlying data store
 * @param {Array} data The data to remove
 * @param {Function} [callback] The function to call when the data is removed
 * @throws {Error} Not implemented error
 */
Provider.prototype.removeMany = function (data, callback) {
	throw new Error("Not implemented");
};

/**
 * Find data by key from the underlying data store
 * @param {Object} key The key of the data to fetch
 * @param {Function} [callback] The function to call when the data is fetched
 * @throws {Error} Not implemented error
 */
Provider.prototype.findByKey = function (key, callback) {
	throw new Error("Not implemented");
};

/**
 * Find data using a key from the underlying data store
 * @param {String|Number} key The key of the data to fetched
 * @param {Function} [callback] The function to call when the data is fetched
 * @throws {Error} Not implemented error
 */
Provider.prototype.findManyByKey = function (key, callback) {
	throw new Error("Not implemented");
};

/**
 * Find data by id in the underlying data store
 * @param {String} id The Id of the data to fetched
 * @param {String} [rev] The Id of the data to fetched
 * @param {Function} [callback] The function to call when the data is fetched
 * @throws {Error} Not implemented error
 */
Provider.prototype.findById = function (id, rev, callback) {
	throw new Error("Not implemented");
};

/**
 * Find all the data from the underlying data store
 * @param {Function} [callback] The function to call when the data is fetched
 * @throws {Error} Not implemented error
 */
Provider.prototype.findAll = function (callback) {
	throw new Error("Not implemented");
};

/**
 * Return the Generic Provider
 * @type {Function}
 */
module.exports = Provider;
