/*jslint node:true*/

module.exports = function TestRepository(name, provider) {
  "use strict";

  var self = this;

  this.provider = provider;
  this.name = name;

  var getCollection = function (callback) {

    self.provider.connect(function (err, conn) {
      if (err) { return callback(err); }

      conn.db.collection(self.name, function (err, collection) {
        if (err) { return callback(err, undefined); }

        if (!collection) { throw Error("No such collection " + self.name + "!"); }
        else { return callback(null, collection); }
      });

    });

  };

  this.getAllCandidates = function (callback) {

    getCollection(function (err, collection) {
      if (err) { return callback(err); }

      console.log("collection", collection);
      try {
        collection.find().toArray(function (err, candidates) {
          callback(null, candidates);
        });
      }
      catch (err) {
        return callback(err)
      }
    });

  };

};
