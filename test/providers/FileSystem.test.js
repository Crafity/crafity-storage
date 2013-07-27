/*jslint node: true, bitwise: true, unparam: true, maxerr: 50, white: true, stupid: true */
"use strict";

/*!
 * crafity-storage - MongoDB Provider test
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
  , FileSystem = require('../../lib/providers/FileSystem.js')
  , assert = jstest.assert
  , context = jstest.createContext("Filesystem provider tests")
  ;

(function () {

  var config = {
      "name": "MyFileSystem",
      "directory": "./test/providers/fsdb"
    }
    ;

  function runTests(err) {
    if (err) { throw err; }

    /**
     * The tests
     */
    var tests = {
      "FileSystem---> When the FileSystem provider is instaniated without any configuration Then an error must be thrown": function (context) {
        try {
          var filesystem = new FileSystem();
          assert.fail("Expected a configuration error");
          filesystem.toString();
          
        } catch (err) {
          assert.hasValue(err, "Expected a configuration error");
          assert.areEqual("Expected a FileSystem configuration", err.message, "Expected another configuration error message");
        }
      },
      "FileSystem---> When save is called with a new document Then the new document must be saved and get a file system id": function (context) {
        context.async(3000);

        var fileSystem = new FileSystem(config)
          , document = { name: "John Doe", age: "35" };

        fileSystem.save(document, function (err, savedDocument) {
          if (err) { throw err; }
          assert.hasValue(savedDocument, "Expected the saved document to be returned");
          fileSystem.remove(savedDocument, function (err) {
            context.complete(err, savedDocument);
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var savedDocument = results[0];
          assert.hasValue(savedDocument, "Expected the saved document to be returned");
          assert.hasValue(savedDocument._id, "Expected the saved document to have an _id");
        });
      },
      "FileSystem---> When getByKey is called with an existing key Then the correct document must be returned": function (context) {
        context.async(3000);

        var fileSystem = new FileSystem(config)
          , document = { name: "Jane Doe", age: "26" };

        fileSystem.save(document, function (err, savedDocument) {
          if (err) { throw err; }
          assert.hasValue(savedDocument, "Expected the saved document to be returned");
          fileSystem.getByKey(savedDocument._id, function (err, fetchedDocument) {
            if (err) { throw err; }
            assert.hasValue(fetchedDocument, "Expected the saved document to be returned");
            fileSystem.remove(fetchedDocument, function (err, fetchedDocument) {
              context.complete(err, savedDocument, fetchedDocument);
            });
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
      }
    };

    /**
     * Run the tests
     */
    context.onComplete.subscribe(function () {
      // destroyDb(config, function (err) {
      //   if (err) { throw err; }
      // });
      return false;
    });
    context.run(tests);
  }

  runTests();

}());
