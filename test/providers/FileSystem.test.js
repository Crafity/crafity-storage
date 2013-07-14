/*jslint node:true, white: true */
/*!
 * crafity.FileSystem.test - FileSystem tests
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Galina Slavova
 * Copyright(c) 2013 Bart Riemens
 * MIT Licensed
 */

/**
 * Test dependencies.
 */
var jstest = require('crafity-jstest')
  , core = require('crafity-core')
  , fs = require('crafity-filesystem')
  , FileSystem = require('../../lib/providers/FileSystem.js')
  , assert = jstest.assert
  , context = jstest.createContext()
  ;

(function () {
  "use strict";

  console.log("Testing 'FileSystem.js' in crafity-storage... ");

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
          new FileSystem();
          assert.fail("Expected a configuration error");
        } catch (err) {
          assert.hasValue(err, "Expected a configuration error");
          assert.areEqual("Expected a FileSystem configuration", err.message, "Expected another configuration error message");
        }
      },
      "FileSystem---> When save is called with a new document Then the new document must be saved and get a file system id": function (context) {
        context.async(3000);

        var fileSystem = new FileSystem(config)
          , document = { name: "John Doe", age: "35" };

        fileSystem.save(document, function (err, document) {
          fileSystem.remove(document, function (err) {
            context.complete(err, document);
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var document = results[0];
          assert.hasValue(document, "Expected the saved document to be returned");
          assert.hasValue(document._id, "Expected the saved document to have an _id");
        });
      },
      "FileSystem---> When getByKey is called with an existing key Then the correct document must be returned": function (context) {
        context.async(3000);

        var fileSystem = new FileSystem(config)
          , document = { name: "Jane Doe", age: "26" };

        fileSystem.save(document, function (err, savedDocument) {
          fileSystem.getByKey(savedDocument._id, function (err, document) {
            fileSystem.remove(document, function (err, document) {
              context.complete(err, savedDocument, document);
            });
          });
        });

        context.onComplete(function (err, results) {
          if (err) { throw err; }
          var savedDocument = results[0]
            , document = results[1];

          assert.hasValue(savedDocument, "Expected the saved document to be returned");
          assert.hasValue(savedDocument._id, "Expected the saved document to have an _id");

          assert.hasValue(document, "Expected the fetched document to be returned");
          assert.areEqual(savedDocument._id, document._id, "Expected the fetched document to have the same _id as the saved document");

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

  runTests();

}());
