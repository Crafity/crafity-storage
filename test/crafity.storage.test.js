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
  , Storage = require('../lib/crafity.storage.js').Storage
  , core = require('crafity-core')
  , objects = core.objects
  , assert = jstest.assert
  , context = jstest.createContext()
  ;

(function () {
  "use strict";

// Print out the name of the test module
  console.log("Testing 'crafity.storage.js' in crafity-storage... ");

  var config = {
    "repositoriesPath": "test/repositories",
    "providersPath": "../lib/providers",
    "connections": {
      "Profiles": {
        "type": "CouchDB",
        "url": "http://test:tester@127.0.0.1:5984",
        "database": "test",
        "design": "profiles",
        "view": "profiles"
      },
      "Geo": {
        "type": "MongoDB",
        "url": "mongodb://test:tester@localhost/crafity-test",
        "collection": "storage-test"
      }
    },
    "repositories": {
      "TestRepository": {
        "connection": "Geo"
      }
    }
  };

  /**
   * The tests
   */
  var tests = {

    "storage---> When loading repositories with no configuration Then an error must be thrown": function (context) {
      context.async(3000);

      var storage = new Storage();

      storage.loadRepositories(function (err, repositories) {
        context.complete(err, repositories);
      });

      context.onComplete(function (err) {
        assert.isInstanceOf(Error, err, "Expected an Error");
        assert.areEqual("There are no repositories configured", err.message, "Expected an error message");
      });
    },

    "storage---> When loading repositories is called with a missing repo Then an error must be thrown": function (context) {

      context.async(3000);

      var customConfig = objects.clone(config);
      customConfig.repositories.MissingRepository = {
        "connection": "Geo"
      };

      var storage = new Storage(customConfig);

      storage.loadRepositories(customConfig, function (err, repositories) {
        context.complete(err, repositories);
      });

      context.onComplete(function (err) {
        assert.isInstanceOf(Error, err, "Expected an Error");
        assert.areEqual("Cannot find repository 'MissingRepository' in the following location '" + process.cwd() + "/test/repositories/MissingRepository'", err.message, "Expected an error message");
      });
    },

    "storage---> When an existing repository is specified Then loadRepositories must return it": function (context) {
      context.async(3000);

      var storage = new Storage(config);

      storage.loadRepositories(config, function (err, repositories) {
        context.complete(err, repositories);
      });

      context.onComplete(function (err, results) {
        assert.hasNoValue(err, "Did not expect an error");
        assert.areEqual(1, results.length, "Expected at exactly one result");
        assert.hasValue(results[0], "Expected a list of repositories");
        assert.hasValue(results[0].TestRepository, "Expected a test repository");
        assert.areEqual("TestRepository", results[0].TestRepository.name, "Expected a specific repository");
      });

    },

    "storage---> When loading an repository that is not a constructor Then an error must be thrown": function (context) {

      context.async(3000);

      var customConfig = objects.clone(config);
      customConfig.repositories.InvalidRepository = {
        "connection": "Profiles"
      };

      var storage = new Storage(customConfig);

      storage.loadRepositories(customConfig, function (err, repositories) {
        context.complete(err, repositories);
      });

      context.onComplete(function (err) {
        assert.isInstanceOf(Error, err, "Expected an Error");
        assert.areEqual("The repository 'InvalidRepository' does not have a constructor.", err.message, "Expected an error message");
      });
    },

    "storage---> When a repository is said to use a specific provider Then loadRepositories must return the repository with the correct provider": function (context) {
      context.async(3000);

      var storage = new Storage(config);

      storage.loadRepositories(config, function (err, repositories) {
        context.complete(err, repositories);
      });

      context.onComplete(function (err, results) {
        assert.hasNoValue(err, "Did not expect an error");
        assert.areEqual(1, results.length, "Expected at exactly one result");
        var repositories = results[0];

        assert.hasValue(repositories, "Expected a list of repositories");
        assert.hasValue(repositories.TestRepository, "Expected a test repository");
        assert.hasValue(repositories.TestRepository.provider, "Expected a specific provider to be set");
        assert.areEqual("MongoDB", repositories.TestRepository.provider.type, "Expected a specific provider type");
        assert.areEqual("Geo", repositories.TestRepository.provider.name, "Expected a specific provider name");
      });

    },

    "storage---> When getProvider is called with a CouchDB provider Then it should return the correct provider": function () {

      var storage = new Storage(config)
        , provider = storage.getProvider(config.connections.Profiles);

      assert.hasValue(provider, "Expected a provider");
      assert.areEqual("CouchDB", provider.type, "Expected a provider of type CouchDB");
    },

    "storage---> When getProvider is called with a MongoDB provider Then it should return the correct provider": function () {

      var storage = new Storage(config)
        , provider = storage.getProvider(config.connections.Geo);

      assert.hasValue(provider, "Expected a provider");
      assert.areEqual("MongoDB", provider.type, "Expected a provider of type MongoDB");
    }

  };

  /**
   * Run the tests
   */
  context.run(tests);

}());
