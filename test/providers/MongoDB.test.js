/*jslint node:true, white: true */
/*!
 * crafity.process.test - Filesystem tests
 * Copyright(c) 2011 Crafity
 * Copyright(c) 2012 Galina Slavova
 * Copyright(c) 2012 Bart Riemens
 * MIT Licensed
 */

/**
 * Test dependencies.
 */
var jstest = require('crafity-jstest')
  , MongoDB = require('../../lib/providers/MongoDB.js')
  , assert = jstest.assert
  , context = jstest.createContext()
  , db = require("./data/mongo.database")
  ;

(function () {
  "use strict";

  console.log("Testing 'MongoDB.js' in crafity-storage... ");

  var config = {
    "name": "Test",
    "url": "mongodb://localhost/crafity-test",
    "collection": "tests"
  }, tests;

  function runTests(err) {
    if (err) { throw err; }

    /**
     * The tests
     */
    tests = {

      "MongoDB---> When the MongoDB provider is instaniated Then it must be initialized properly": function () {
        var mongoDB = new MongoDB(config);
        assert.areEqual(config.name, mongoDB.name, "Expected another name");
      },

      "MongoDB---> When calling REMOVE on an existing record Then the record must be removed": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config)
          , unsavedDocument = { name: "TEST" };

        mongoDB.save(unsavedDocument, function (err, savedDocument) {
          if (err) { throw err; }

          mongoDB.remove({ _id: savedDocument._id }, function (err, resultAfterRemoving) {

            console.log("resultAfterRemoving", resultAfterRemoving);
            mongoDB.getById(savedDocument._id, function (err, removedRecord) {
              context.complete(err, removedRecord);
            });
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var removedRecord = results[0];
          assert.hasNoValue(removedRecord, "Expected the fetched object to have NO VALUE");

        });
      },

      "MongoDB---> When calling getAll Then it must return all records": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config);

        mongoDB.getAll(function (err, result) {
          context.complete(err, result);
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          assert.hasValue(results, "Expected a result");
          var records = results[0];
          assert.hasValue(records, "Expected a result");
          assert.areEqual(3, records.length, "Expected another amount of records to be returned");
        });
      },

      "MongoDB---> When calling geoSearch is instaniated Then it must be initialized properly": function (context) {
        context.async(3000);
        var mongoDB = new MongoDB(config);

        mongoDB.geoSearch([43, 32], function () {
          context.complete.apply(context, arguments);
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
//				assert.hasNoValue(err, "Did not expect an error to be thrown!");
        });
      },

      "MongoDB---> When the calling geoSearch provider is instaniated Then it must be initialized properly": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config);

        var options = {
          locationCenter: [43, 32],
          maximumResults: 10,
          maximumRange: 100000
        };

        mongoDB.geoSearch(options, function () {
          context.complete.apply(context, arguments);
        });

        context.onComplete(function (err, geoSearchResults) {
          if (err) { throw err; }
//				console.log("geoSearchResults", geoSearchResults);
          assert.hasNoValue(err, "Did not expect an error to be thrown!");
          assert.hasValue(geoSearchResults, "Expected results from geoSearch to be returned.")
        });
      },

      "MongoDB---> When calling save on one record in a collection Then the record must be saved and returned with a new _id": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config)
          , galina = {
            name: "Galina",
            lonLat: [ 4.639153, 52.386599 ],
            timeStamp: new Date(),
            lonLatHome: [ 26.510772, 42.483769 ], // Yambol
            tags: [ "director", "owner", "software engineer", "photographer", "dev", "Haarlem" ],
            couchId: "e0da1821236056f4d01749118c004e7b"
          };

        assert.hasNoValue(galina._id, "Expected the unsaved object not to have an _id");

        mongoDB.save(galina, function () {
          context.complete.apply(context, arguments);
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var insertedGalina = results[0];
          assert.hasValue(insertedGalina, "Expected the saved object to be returned");
          assert.hasValue(insertedGalina._id, "Expected the saved object to have an _id");
        });
      },

      "MongoDB---> When calling save on an existing record (unique key violation) in a collection Then an error must be thrown": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config);

        var galina = {
          name: "Galina",
          lonLat: [ 4.639153, 52.386599 ],
          timeStamp: new Date(),
          lonLatHome: [ 26.510772, 42.483769 ], // Yambol
          tags: [ "director", "owner", "software engineer", "photographer", "dev", "Haarlem" ],
          couchId: "e0da1821236056f4d01749118c004e7a"
        };

        mongoDB.save(galina, function () {
          context.complete.apply(context, arguments);
        });

        context.onComplete(function (err, results) {
          assert.hasValue(err, "Expected the saved object to be returned");
          assert.areEqual("E11000 duplicate key error index: crafity-test.tests.$couchId_1  dup key: { : \"e0da1821236056f4d01749118c004e7a\" }", err.message, "Expected another error message");
        });
      },

      "MongoDB---> When calling save on an existing record in a collection Then the record must be saved and returned": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config)
          , couchId = "e0da1821236056f4d01749118c004e7a"
          , id;

        mongoDB.getByKey({couchId: couchId}, function (err, fetchedRecords) {
          id = fetchedRecords[0]._id;

          var galina = {
            _id: id,
            name: "Galina Slavova",
            lonLat: [ 4.639153, 52.386599 ],
            timeStamp: new Date(),
            lonLatHome: [ 26.510772, 42.483769 ], // Yambol
            tags: [ "director", "owner", "software engineer", "photographer", "dev", "Haarlem" ],
            couchId: "e0da1821236056f4d01749118c004e7a"
          };

          mongoDB.save(galina, function (err, updateCount) {
            mongoDB.getById(id, function (err, fetchedGalina) {
              context.complete(err, updateCount, fetchedGalina);
            });
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var updateCount = results[0]
            , fetchedGalina = results[1];

          assert.areEqual(1, updateCount, "Expected one record to be updated");

          assert.hasValue(fetchedGalina, "Expected the fetched object to be returned");
          assert.areEqual("Galina Slavova", fetchedGalina.name, "Expected the fetched object to have another name");
          assert.areEqual(id, fetchedGalina._id, "Expected the fetched object to have an _id");

        });
      },

      "MongoDB---> When calling update on an existing record Then the record must be updated and 1 returned": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config)
          , couchId = "e0da1821236056f4d01749118c004e7a"
          , recordBeforeUpdate
          , id;

        mongoDB.getByKey({couchId: couchId}, function (err, fetchedRecords) {
          recordBeforeUpdate = fetchedRecords[0];
          id = recordBeforeUpdate._id;

//				console.log("recordBeforeUpdate", recordBeforeUpdate);
          var updateParameters = {
            selector: { couchId: couchId },
            updateValues: { tags: ["gardener"] },
            options: { safe: true }
          };

          mongoDB.update(updateParameters, function (err, updateCount) {
            mongoDB.getById(id, function (err, fetchedGalina) {
              context.complete(err, updateCount, fetchedGalina);
            });
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var updateCount = results[0]
            , fetchedGalina = results[1];

          assert.areEqual(1, updateCount, "Expected one record to be updated");

          assert.hasValue(fetchedGalina, "Expected the fetched object to be returned");
          assert.areEqual(["gardener"], fetchedGalina.tags, "Expected the fetched object to have different tags");
          assert.areEqual(id, fetchedGalina._id, "Expected the fetched object to have an _id");

        });
      },

      "MongoDB---> When calling getByKey on an existing record in a collection Then the record must be returned": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config);

        var couchId = "e0da1821236056f4d01749118c004e7a"
          , filter = { "couchId": couchId }
          ;

        mongoDB.getByKey(filter, function (err, fetchedRecord) {
          context.complete(err, fetchedRecord);
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }

          var fetchedRecords = results[0];
          assert.areEqual(1, fetchedRecords.length, "Expected one record to be returned");

          var fetchedRecord = fetchedRecords[0];
          assert.hasValue(fetchedRecord, "Expected the fetched object to be returned");
          assert.hasValue(fetchedRecord._id, "Expected the fetched object to have an _id");
          assert.areEqual(couchId, fetchedRecord.couchId, "Expected the fetched object to have a couchId");

        });
      },

      "MongoDB---> When calling getById on an existing record in a collection Then the record must be returned": function (context) {
        context.async(3000);

        var mongoDB = new MongoDB(config)
          , couchId = "e0da1821236056f4d01749118c004e7a";

        mongoDB.getByKey({couchId: couchId}, function (err, fetchedRecords) {
          mongoDB.getById(fetchedRecords[0]._id, function (err, fetchedRecord) {
            context.complete(err, fetchedRecord);
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var fetchedRecord = results[0];

          assert.hasValue(fetchedRecord, "Expected the fetched object to be returned");
          assert.hasValue(fetchedRecord._id, "Expected the fetched object to have an _id");
          assert.areEqual(couchId, fetchedRecord.couchId, "Expected the fetched object to have the same couchId");

        });
      }

    };

    /**
     * Run the tests
     */
    context.onComplete.subscribe(function () {
      destroyDb(config, function (err) {
        if (err) { throw err; }
        setTimeout(function () {
          process.exit(0);
        }, 10);
      });
    });
    context.run(tests);

  }

  function initDb(config, callback) {
    db.create(config, callback);
  }

  function destroyDb(config, callback) {
    db.drop(config, callback);
  }

  initDb(config, runTests);

}());
