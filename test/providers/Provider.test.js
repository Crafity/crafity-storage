/*jslint node:true, white:true */
"use strict";

/*!
 * crafity-storage - Crafity Generic Provider Tests
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Test dependencies.
 */
var jstest = require('crafity-jstest').createContext('Generic Provider Tests');
var assert = jstest.assert;
var Provider = require('../../lib/providers/Provider');

var PROTO_PROPERY = "__proto__";
var EventEmitter = require('events').EventEmitter;

/**
 * Run all the tests
 */
jstest.run({
	
  "Instantiate the generic provider and the type property should be set to be the generic provider": function () {
    var provider = new Provider();
    assert.areEqual("Generic Provider", provider.type, "Expected another provider name");
  },
	
  "Instantiate the generic provider and check if it has the EventEmitter as prototype": function () {
    var provider = new Provider();
    var eventEmitted = false;

    /* Test the prototype of the provider */
    assert.areEqual(EventEmitter.prototype, provider[PROTO_PROPERY], "Expected an event emitter to be the prototype");
    
    /* Test the event emitter just be sure everything works fine */
    provider.on("test", function () {
      eventEmitted = true;
      return false;
    });
    provider.emit("test", function () {
      return false;
    });
    
    assert.isTrue(eventEmitted, "Expected event to be emitted properly");
  },
	
  "Test if the connect function exists and throws a Not Implemeted exception when called": function () {
    var provider = new Provider();
    var expectedErr;

    try {
      provider.connect(function () {
        return false;
      });
    } catch (err) {
      expectedErr = err;
    }

    assert.hasValue(expectedErr, "Expected an error");
    assert.areEqual("Not implemented", expectedErr.message, "Expected another error message");
  },
	
  "Test if the disconnect function exists and throws a Not Implemeted exception when called": function () {
    var provider = new Provider();
    var expectedErr;

    try {
      provider.disconnect(function () {
        return false;
      });
    } catch (err) {
      expectedErr = err;
    }

    assert.hasValue(expectedErr, "Expected an error");
    assert.areEqual("Not implemented", expectedErr.message, "Expected another error message");
  },
	
  "Test if the dispose function exists and throws a Not Implemeted exception when called": function () {
    var provider = new Provider();
    var expectedErr;

    try {
      provider.dispose(function () {
        return false;
      });
    } catch (err) {
      expectedErr = err;
    }

    assert.hasValue(expectedErr, "Expected an error");
    assert.areEqual("Not implemented", expectedErr.message, "Expected another error message");
  },
	
  "Test if the save function exists and throws a Not Implemeted exception when called": function () {
    var provider = new Provider();
    var expectedErr;

    try {
      provider.save({}, function () {
        return false;
      });
    } catch (err) {
      expectedErr = err;
    }

    assert.hasValue(expectedErr, "Expected an error");
    assert.areEqual("Not implemented", expectedErr.message, "Expected another error message");
  },
	
  "Test if the remove function exists and throws a Not Implemeted exception when called": function () {
    var provider = new Provider();
    var expectedErr;

    try {
      provider.remove({}, function () {
        return false;
      });
    } catch (err) {
      expectedErr = err;
    }

    assert.hasValue(expectedErr, "Expected an error");
    assert.areEqual("Not implemented", expectedErr.message, "Expected another error message");
  },
	
  "Test if the findByKey function exists and throws a Not Implemeted exception when called": function () {
    var provider = new Provider();
    var expectedErr;

    try {
      provider.findByKey(123, function () {
        return false;
      });
    } catch (err) {
      expectedErr = err;
    }

    assert.hasValue(expectedErr, "Expected an error");
    assert.areEqual("Not implemented", expectedErr.message, "Expected another error message");
  },
	
  "Test if the findAll function exists and throws a Not Implemeted exception when called": function () {
    var provider = new Provider();
    var expectedErr;

    try {
      provider.findAll(function () {
        return false;
      });
    } catch (err) {
      expectedErr = err;
    }

    assert.hasValue(expectedErr, "Expected an error");
    assert.areEqual("Not implemented", expectedErr.message, "Expected another error message");
  }
});

/**
 * Return the test context
 * @type {exports.createContext|*}
 */
module.exports = jstest;