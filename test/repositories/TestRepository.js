/*jslint node: true, bitwise: true, unparam: true, maxerr: 50, white: true, stupid: true */
"use strict";

/*!
 * crafity-storage - Dummy Test Repository
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

module.exports = function TestRepository(name, provider) {

  var self = this;

  this.provider = provider;
  this.name = name;

  var getCollection = function (callback) {

    self.provider.connect(function (err, conn) {
      if (err) { return callback(err); }

      conn.db.collection(self.name, function (err, collection) {
        if (err) { return callback(err, undefined); }

        if (!collection) { throw new Error("No such collection " + self.name + "!"); }
        
        return callback(null, collection);
      });

    });

  };

  this.getAllCandidates = function (callback) {

    getCollection(function (err, collection) {
      if (err) { return callback(err); }

      try {
        return collection.find().toArray(function (err, candidates) {
          callback(null, candidates);
        });
      } catch (err2) {
        return callback(err2);
      }
    });

  };

};
