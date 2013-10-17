/*jslint node: true, bitwise: true, unparam: true, maxerr: 50, white: true, stupid: true, evil: true */
"use strict";

/*!
 * crafity-storage - Crafity Redis Provider
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var redis = require('redis');

module.exports = function Redis(config) {
	var self = this
		, client = redis.createClient();

	if (!config) {
		throw new Error("Argument config required");
	}

	client.on("error", function (err) {
		throw err;
	});

	if (config.db) { client.select(config.db, new Function()); }

	this.getAll = function (key, callback) {
		if (key instanceof Function && !callback) {
			callback = key;
			key = "*";
		}
		if (!callback) { throw new Error("Argument callback is missing");}
		client.get(key, function (err, value) {
			callback(null, value);
		});
	};
	this.getByName = function getByName(name, callback) {
		return self.getByKey(name, callback);
	};
	this.getByKey = function (key, callback) {
		if (!key) { throw new Error("Argument key is missing");}
		if (!callback) { throw new Error("Argument callback is missing");}
		client.get(key, function (err, value) {
			callback(err, !err && [ value ]);
		});
	};

	this.save = function (key, value, callback) {
		if (!key) { throw new Error("Argument key is missing");}
		if (!value) { throw new Error("Argument value is missing"); }
		if (!callback) { throw new Error("Argument callback is missing");}
		client.set(key, value, function (err, value) {
			callback(err, !err && [value]);
		});
	};

	this.remove = function (key, callback) {
		if (!key) { throw new Error("Argument item is missing");}
		if (!callback) { throw new Error("Argument callback is missing");}
		client.del(key, function (err, value) {
			callback(err, !err && [value]);
		});
	};

	this.expire = function (key, timeout) {
		client.expire(key, timeout);
	};
};
