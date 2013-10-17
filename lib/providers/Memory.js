/*jslint node: true, bitwise: true, unparam: true, maxerr: 50, white: true, stupid: true, evil: true */
"use strict";

/*!
 * crafity-storage - Crafity Memory Provider
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

module.exports = function Memory(config) {
	var self = this
		, _data = (config && config.data) || {};

	this.setData = function (data) {
		_data = data;
	};

	this.getAll = function (callback) {
		if (!callback) { throw new Error("Argument callback is missing");}
		process.nextTick(function () {
			var data = Object.keys(_data).map(function (key) {
				return _data[key];
			});
			callback(null, data);
		});
	};
	this.getByName = function getByName(name, callback) {
		if (!name) { throw new Error("Argument name is missing");}
		return self.getByKey(name, callback);
	};
	this.getByKey = function (key, callback) {
		if (!key) { throw new Error("Argument key is missing");}
		if (!callback) { throw new Error("Argument callback is missing");}
		process.nextTick(function () {
			callback(null, _data[key] ? [_data[key]] : []);
		});
	};

	this.save = function (key, value, callback) {
		if (!key) { throw new Error("Argument key is missing");}
		if (!value) { throw new Error("Argument value is missing");}
		if (!callback) { throw new Error("Argument callback is missing");}
		process.nextTick(function () {
			_data[key] = value;
			callback(null, _data[key] ? [_data[key]] : []);
		});
	};

	this.expire = function (key, timeout) {
		return false;
	};

	this.remove = function (key, callback) {
		if (!key) { throw new Error("Argument key is missing");}
		if (!callback) { throw new Error("Argument callback is missing");}
		var value = _data[key];
		delete _data[key];
		process.nextTick(function () {
			callback(null, [value]);
		});
	};

};
