/*jslint node: true, bitwise: true, unparam: true, maxerr: 50, white: true, stupid: true, evil: true */
"use strict";

/*!
 * crafity-storage - Crafity MongoDB Provider
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var mongoose = require('mongoose')
  , Mongoose = mongoose.Mongoose
  ;

function MongoDB(config) {

  if (!config) {
    throw new Error("Expected a MongoDB configuration");
  }
  if (!config.url) {
    throw new Error("Expected a url in the MongoDB configuration");
  }
  if (!config.collection) {
    throw new Error("Expected a collection in the MongoDB configuration");
  }

  var self = this
    , mongooseInstance = new Mongoose()
    , internalConnection
    , EARTH_RADIUS = 6378000; // in meters

  this.name = config.name;
  this.type = "MongoDB";

  this.connect = function connect(callback) {

    if (internalConnection) {
      process.nextTick(function () {
        callback(null, internalConnection);
      });
    }
    else {
      mongooseInstance.connect(config.url);
      mongooseInstance.connection.once('open', function (err) {
        if (err) { return callback(err); }

        internalConnection = mongooseInstance.connection;
        callback(null, internalConnection);
      });
    }
  };

  /**
   * Get a document by the tehcnical ObjectId.
   * @param id
   * @param callback
   */
  this.getById = function getById(id, callback) {
    self.connect(function (err, connection) {
      if (err) { return callback(err); }
      connection.db.collection(config.collection, function (err, collection) {
        collection.findOne({ "_id": id }, function (err, result) {
          callback(err, result);
        });
      });
    });
  };

  /**
   * Get a specific document by name index
   * @param name
   * @param callback
   */
  this.getByName = function getByName(name, callback) {
    return self.getByKey({ name: name}, callback);
  };

  /**
   * Get a specific document, having a filter on field.
   * @param filter
   * @param callback
   */
  this.getByKey = function getByKey(filter, callback) {
    if (!filter) { throw new Error("Argument filter cannot be null or undefined!"); }
    self.connect(function (err, connection) {
      if (err) { return callback(err); }
      return connection.db.collection(config.collection, function (err, collection) {
        collection.find(filter).toArray(function (err, result) {
          callback(err, result);
        });
      });
    });
  };

  /**
   * Save method is a whole document replacement, which is not advisable due to
   * efficiency reasons. Use update method instead.
   * @param object
   * @param callback
   */
  this.save = function save(key, value, callback) {
    if (!key) { throw new Error("Argument key is missing."); }
    if (!value) { throw new Error("Argument value is missing."); }
    if (!callback) { throw new Error("Argument callback is missing."); }
    self.connect(function (err, connection) {

      if (err) { return callback(err); }

      connection.db.collection(config.collection, function (err, collection) {
        collection.save(value, {safe: true}, function (err, result) {
          callback(err, result);
        });
      });
    });
  };

//	/**
//	 * Save method is a whole document replacement, which is not advisable due to
//	 * efficiency reasons. Use update method instead.
//	 * @param object
//	 * @param callback
//	 */
//	this.save = function save(object, callback) {
//		self.connect(function (err, connection) {
//
//			if (err) { return callback(err); }
//
//			connection.db.collection(config.collection, function (err, collection) {
//				collection.save(object, {safe: true}, function (err, result) {
//					callback(err, result);
//				});
//			});
//		});
//	};

  /**
   * Update method helps updating specific fields of the document. It has a built in
   * insert function and should be used instead of save.
   * @param parameters
   * @param callback
   */
  this.update = function update(parameters, callback) {

    if (!parameters || (parameters instanceof Function && !callback)) {
      throw new Error("Cannot execute udate without options.");
    }
    if (!parameters.selector) {
      throw new Error("Cannot execute update without a selector.");
    }
    if (!parameters.updateValues) {
      throw new Error("Cannot execute update without one or more update values.");
    }
    if (!parameters.options) {
      parameters.options = { safe: true };
    }

    var selector = parameters.selector
      , updateValues = { $set: parameters.updateValues }
      , options = parameters.options;

    self.connect(function (err, connection) {
      if (err) { return callback(err); }

      connection.db.collection(config.collection, function (err, collection) {
        collection.update(selector, updateValues, options, function (err, result) {

          callback(err, result);
        });
      });
    });
  };

  /**
   * Remove a document from collection by given selector.
   * @param selector
   * @param callback
   */
  this.remove = function remove(selector, callback) {

    self.connect(function (err, connection) {
      if (err) { return callback(err); }

      connection.db.collection(config.collection, function (err, collection) {
        collection.remove(selector, function (err, result) {
          callback(err, result);
        });
      });

    });
  };

  /**
   * Get all documents in the collection.
   * returnLimit parameter is optional and means: return returnLimit documents or nothing
   * if the produced result count is less that returnLimit.
   * @param returnLimit
   * @param callback
   */
  this.getAll = function getAll(sort, returnLimit, callback) {
    if (sort instanceof Function && !returnLimit && !callback) {
      callback = sort;
      sort = undefined;
      returnLimit = undefined;
    } else if (typeof sort === 'number' && returnLimit instanceof Function) {
      callback = returnLimit;
      returnLimit = sort;
      sort = undefined;
    } else if (typeof sort === 'object' && returnLimit instanceof Function) {
      callback = returnLimit;
      returnLimit = undefined;
    } else if (typeof sort === 'object' && typeof returnLimit === 'number' && callback instanceof Function) {
      sort = 'object';
    } else {
      throw new Error("Invalid arguments");
    }

    self.connect(function (err, connection) {
      if (err) { return callback(err); }

      return connection.db.collection(config.collection, function (err, collection) {
        var find = collection.find();

        if (sort) { find = find.sort(sort); }
        if (returnLimit) { find = find.limit(returnLimit); }

        find.toArray(function (err, result) {
          callback(err, result);
        });

      });

    });
  };

  /**
   *  Get all documents in the collection filtered by a given query.
   * If no filter query has been passed then throw an error. Use method getAll instead.
   * returnLimit parameter is optional and means: return returnLimit documents or nothing
   * if the produced result count is less that returnLimit.
   * @param filter
   * @param returnLimit
   * @param callback
   * @return {*}
   */
  this.getAllWithFilter = function getAll(filter, returnLimit, callback) {
    if (!filter || filter instanceof Function) {
      return callback(new Error("No filter query was provided in method getAllWithFilter."));
    }
    if (!returnLimit || returnLimit instanceof Function) {
      callback = returnLimit;
      returnLimit = null;
    }

    self.connect(function (err, connection) {
      if (err) { return callback(err); }

      connection.db.collection(config.collection, function (err, collection) {

        if (returnLimit) {
          collection.find(filter).limit(returnLimit).toArray(function (err, result) {
            return callback(err, result);
          });
        } else {
          collection.find(filter).toArray(function (err, result) {
            return callback(err, result);
          });
        }

      });
    });
  };

  /**
   * Execute a geo search query with options.
   * @example
   * geoSearch([ 4.32244, 52.2323 ], function callback() { });
   * geoSearch({ 
	 *   locationCenter: [ 4.32244, 52.2323 ],
	 *   query: {},
	 *   maximumResults: 10,
	 *   maximumRange: 100 // in KM
	 * }, function callback() { });
   * @param {Object|Array} options A geo location or multiple options
   * @param {Function} callback A callback function
   */
  this.geoSearch = function geoSearch(options, callback) {

    if (options instanceof Array) {
      options = { locationCenter: options };
    }

    if (!options.locationCenter) {
      throw new Error("Cannot execute geoSearch without locationCenter");
    }

    var filter = {
      geoNear: config.collection,
      near: options.locationCenter,
      spherical: true
    };

    if (options.query) {
      filter.query = options.query;
    }

    if (options.maximumResults) {
      filter.num = options.maximumResults;
    }

    if (options.maximumRange) {
      filter.maxDistance = options.maximumRange / EARTH_RADIUS; // to radians
    }

    self.connect(function (err, connection) {
      if (err) { return callback(err); }

      connection.db.executeDbCommand(filter, function (err, res) {

        if (err) { return callback(err); }
        if (res.documents[0].errmsg) { return callback(new Error(res.documents[0].errmsg)); }

        //res.documents[0].results = [];
        var candidates = res.documents[0].results.map(function (element) {

          if ((element.dis * EARTH_RADIUS) / 1000 < 1) {
            element.distance = Math.round(element.dis * EARTH_RADIUS) + " m";
          }
          else {
            element.distance = Math.round((element.dis * EARTH_RADIUS) / 1000) + " km";
          }

          return element;
        });

        return callback(null, candidates);
      });
    });
  };

  this.disconnect = function disconnect(callback) {
    if (internalConnection) {
      internalConnection = undefined;
    }
    mongooseInstance.disconnect(callback);
  };

  this.dispose = function dispose(callback) {
    // Close connection...
    self.disconnect(callback);
    // Clean up other stuff!
  };
}

module.exports = MongoDB;
module.exports.MongoDB = MongoDB; 
