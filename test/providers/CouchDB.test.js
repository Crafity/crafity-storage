/*jslint node: true, bitwise: true, unparam: true, maxerr: 50, white: true, stupid: true */
"use strict";

/*!
 * crafity-storage - CouchDB Provider test
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Test dependencies.
 */

var jstest = require('crafity-jstest')
  , core = require('crafity-core')
  , CouchDB = require('../../lib/providers/CouchDB.js')
  , createNano = require('nano')
  , assert = jstest.assert
  , context = jstest.createContext("CouchDB provider test")
  ;

(function () {

  var config = {
      "name": "MyCouch",
      "url": "http://test:testing@localhost:5984",
      "database": "crafitytest",
      "design": "profiles",
      "view": "profiles"
    }
    , view = {
      "_id": "_design/profiles",
      "language": "javascript",
      "views": {
        "profiles": {
          "map": "function(doc) {\n  emit(doc.name, doc);\n}"
        },
        "roles": {
          "map": "function(doc) {\n if (!doc.role) { return; }  emit(doc.role, doc);\n}"
        }
      }
    }
    , nano = createNano(config.url)
    ;

  function initDb(config, callback) {
    nano.db.destroy(config.database, function (err) {
      nano.db.create(config.database, function (err) {
        if (err) { throw err; }
        CouchDB.use(config, function (couchDB) {
          couchDB.save(view, callback);
        });
      });
    });
  }

  function destroyDb(config, callback) {
    nano.db.destroy(config.database, callback);
  }

  function runTests(err) {
    if (err) { throw err; }

    /**
     * The tests
     */
    var tests = {
      "CouchDB---> When the CouchDB provider is instaniated without any configuration Then an error must be thrown": function (context) {
        try {
          var couchDB = new CouchDB();
          assert.fail("Expected a configuration error");
          couchDB.toString();
        } catch (err) {
          assert.hasValue(err, "Expected a configuration error");
          assert.areEqual("Expected a CouchDB configuration", err.message, "Expected another configuration error message");
        }
      },
      "CouchDB---> When save is called with a new document Then the new document must be saved and get a couch id": function (context) {
        context.async(3000);

        var couchDB = new CouchDB(config)
          , document = { name: "John Doe", age: "35" };

        couchDB.save(document, function (err, savedDocument) {
          context.complete(err, savedDocument);
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var savedDocument = results[0];
          assert.hasValue(savedDocument, "Expected the saved document to be returned");
          assert.hasValue(savedDocument._id, "Expected the saved document to have an _id");
        });
      },
      "CouchDB---> When getByKey is called with an existing key Then the correct document must be returned": function (context) {
        context.async(3000);

        var couchDB = new CouchDB(config)
          , document = { name: "Jane Doe", age: "26" };

        couchDB.save(document, function (err, savedDocument) {
          couchDB.getByKey('Jane Doe', function (err, fetchedDocument) {
            context.complete(err, savedDocument, fetchedDocument);
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var savedDocument = results[0]
            , fetchedDocument = results[1];

          assert.hasValue(savedDocument, "Expected the saved document to be returned");
          assert.hasValue(savedDocument._id, "Expected the saved document to have an _id");

          assert.hasValue(fetchedDocument, "Expected the fetched document to be returned");
          assert.areEqual(savedDocument._id, fetchedDocument._id, "Expected the fetched document to have the same _id as the saved document");
        });
      },
      "CouchDB---> When getById is called with an existing id Then the correct document must be returned": function (context) {
        context.async(3000);

        var couchDB = new CouchDB(config)
          , document = { name: "Jimi Hendrix", age: "26" };

        couchDB.save(document, function (err, savedDocument) {
          couchDB.getById(document._id, function (err, fetchedDocument) {
            context.complete(err, savedDocument, fetchedDocument);
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var savedDocument = results[0]
            , fetchedDocument = results[1];

          assert.hasValue(savedDocument, "Expected the saved document to be returned");
          assert.hasValue(savedDocument._id, "Expected the saved document to have an _id");

          assert.hasValue(fetchedDocument, "Expected the fetched document to be returned");
          assert.areEqual(savedDocument._id, fetchedDocument._id, "Expected the fetched document to have the same _id as the saved document");
        });

      },
      "CouchDB---> When getSpecificOne is called with proper criteria Then the correct document must be returned": function (context) {
        context.async(3000);

        var couchDB = new CouchDB(config)
          , document = { name: "Fred Flintstone", age: "26" };

        couchDB.save(document, function (err, savedDocument) {
          couchDB.getSpecificOne({key: "Fred Flintstone", "include_docs": true }, function (err, fetchedDocument) {
            context.complete(err, savedDocument, fetchedDocument);
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var savedDocument = results[0]
            , fetchedDocument = results[1].doc;

          assert.hasValue(savedDocument, "Expected the saved document to be returned");
          assert.hasValue(savedDocument._id, "Expected the saved document to have an _id");

          assert.hasValue(fetchedDocument, "Expected the fetched document to be returned");
          assert.areEqual(savedDocument._id, fetchedDocument._id, "Expected the fetched document to have the same _id as the saved document");
        });

      },
      "CouchDB---> When getMany is called with proper criteria Then the correct documents must be returned": function (context) {
        context.async(3000);

        var config2 = JSON.parse(JSON.stringify(config));
        config2.view = "roles";

        var couchDB = new CouchDB(config2)
          , document1 = { name: "Bonnie", age: "33", role: "Criminal" }
          , document2 = { name: "Clyde", age: "34.5", role: "Criminal" };

        couchDB.save(document1, function (err, savedDocument1) {
          couchDB.save(document2, function (err, savedDocument2) {
            couchDB.getMany({startkey: "Criminal", endkey: "Criminal" }, function (err, documents) {
              context.complete(err, savedDocument1, savedDocument2, documents);
            });
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }

          var savedDocument1 = results[0]
            , savedDocument2 = results[1]
            , documents = results[2];

          assert.hasValue(documents, "Expected the fetched documents to be returned");
          assert.areEqual(savedDocument1._id, documents[0].id, "Expected the fetched document to have the same _id as the saved document");
          assert.areEqual(savedDocument2._id, documents[1].id, "Expected the fetched document to have the same _id as the saved document");
        });

      },
      "CouchDB---> When getAll is called with proper criteria Then the correct documents must be returned": function (context) {
        context.async(3000);

        var config2 = JSON.parse(JSON.stringify(config));
        config2.database = "crafityalltest";

        var couchDB = new CouchDB(config2)
          , document1 = { name: "Bonnie", age: "33", role: "Criminal" }
          , document2 = { name: "Clyde", age: "34.5", role: "Criminal" };

        initDb(config2, function () {
          couchDB.save(document1, function (err, savedDocument1) {
            couchDB.save(document2, function (err, savedDocument2) {
              couchDB.getAll(function (err, documents) {
                destroyDb(config2, function () {
                  context.complete(err, savedDocument1, savedDocument2, documents);
                });
              });
            });
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }

          var savedDocument1 = results[0]
            , savedDocument2 = results[1]
            , documents = results[2];

          assert.hasValue(documents, "Expected the fetched documents to be returned");
          assert.areEqual(2, documents.length, "Expected the two fetched documents to be returned");
          assert.areEqual(savedDocument1._id, documents[0]._id, "Expected the fetched document to have the same _id as the saved document");
          assert.areEqual(savedDocument2._id, documents[1]._id, "Expected the fetched document to have the same _id as the saved document");
        });

      }
    };

    /**
     * Run the tests
     */
    context.onComplete.subscribe(function () {
      destroyDb(config, function (err) {
        if (err) { throw err; }
      });
    });
    context.run(tests);
  }

  initDb(config, runTests);
}());
