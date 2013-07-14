/*jslint node: true, bitwise: true, unparam: true, maxerr: 50, white: true, stupid: true, evil: true */
"use strict";

/*!
 * crafity-storage - Crafity Filesystem Provider
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('crafity-filesystem')
  , core = require('crafity-core')
  , uuid = require('node-uuid')
  , objects = core.objects;

function FileSystem(config) {

  if (!config) {
    throw new Error("Expected a FileSystem configuration");
  }

  if (!config.directory) {
    throw new Error("Expected a directory in the FileSystem configuration");
  }

  this.name = config.name;
  this.type = "FileSystem";

  if (!/\/$/.test(config.url)) {
    config.directory += "/";
  }

  var self = this;

  this.connect = function (callback) {
    process.nextTick(function () {
      callback(null, null);
    });
  };

  this.disconnect = function (callback) {
    process.nextTick(function () {
      callback(null, null);
    });
  };

  this.dispose = function (callback) {
    // Clean up stuff!
    process.nextTick(function () {
      if (callback) { callback(null, null); }
    });
  };

  this.save = function save(item, callback) {
    if (!item) { throw new Error("Can not save null or undefined"); }
    if (!item._id) { item._id = uuid.v1(); }
    fs.writeFile(fs.combine(config.directory, item._id + ".json"), JSON.stringify(item), function (err) {
      callback(err, !err && item);
    });
  };

//	function fetch(doc_names, params, callback) {
//		if (typeof params === "function") {
//			callback = params;
//			params = {};
//		}
//		params.include_docs = true;
//		return nano.relax({db: config.database, path: "_all_docs", method: "POST", params: params, body: doc_names}, callback);
//	}
//
//	this.getByKeys = function getByKey(keys, callback) {
//		fetch({ "keys": keys }, callback);
//	};
//
  this.getByName = function getByName(name, callback) {
    return self.getByKey(name, callback);
  };

  this.getByKey = function getByKey(key, callback) {

    if (!callback) { callback = new Function(); }
    if (!key) { return callback(new Error("Argument key is null or undefined")); }

    try {
      fs.readFile(fs.combine(config.directory, key + ".json"), function (err, data) {
        callback(err, !err && JSON.parse(data.toString()));
      });

    } catch (err) {
      callback(err, null);
    }
  };

//	this.getById = function getById(id, callback) {
//		if (!id) { return callback(new Error("Can not get one null or undefined"), null); }
//		couch.request('GET', '/' + config.database + '/' + id + "?include_docs=true", callback);
//	};
//
//	this.getSpecificOne = function getSpecificOne(criteria, callback) {
//		if (!criteria) { return callback(new Error("Can not get one null or undefined")); }
//		couch.view(
//			'/' + config.database + '/_design/' + config.design + '/_view/' + config.view,
//			criteria,
//			function (err, result) {
//				if (err) {
//					callback(err);
//				} else if (result.error) {
//					callback(new Error(result.error + ": " + result.reason), undefined);
//				} else if (result.rows.length === 0) {
//					callback(null, undefined);
//				} else if (result.rows.length === 1) {
//					callback(null, result.rows[0]);
//				} else if (result.rows.length > 1) {
//					callback(new Error("Got more than one result back from the server. " + JSON.stringify(result)));
//				}
//			}
//		);
//	};
//
//	this.getMany = function (criteria, callback) {
//		if (!criteria.include_docs) {
//			criteria.include_docs = true;
//		}
//		couch.view(
//			'/' + config.database + '/_design/' + config.design + '/_view/' + config.view,
//			criteria,
//			function (err, result) {
//				if (err) {
//					callback(err);
//				} else if (result.error) {
//					callback(new Error(result.error + ": " + result.reason), undefined);
//				} else if (result.rows.length === 0) {
//					callback(null, undefined);
//				} else if (result.rows.length > 0) {
//					callback(null, result.rows.map(function (row) {
//						return row;
//					}));
//				}
//			}
//		);
//	};
//
//	this.getAll = function (callback) {
//		return couch.request('GET', '/' + config.database + '/_all_docs' + "?include_docs=true", function (err, result) {
//			if (err) {return callback(err); }
//			callback(null, result.rows.map(function (row) {
//				return row.doc;
//			}));
//		});
//	};

  this.remove = function (item, callback) {
    if (!item) {
      throw new Error("Can not remove null or undefined");
    }
    fs.unlink(fs.combine(config.directory, (item._id || item).toString() + ".json"), function (err) {
      item.deleted = true;
      if (callback) { callback(err, !err && item); }
    });
  };

//	this.view = function (view, criteria, callback) {
//		return couch.view(
//			'/' + config.database + '/_design/' + config.design + '/_view/' + view,
//			criteria, callback);
//	};
}

module.exports = FileSystem;
module.exports.FileSystem = FileSystem;
