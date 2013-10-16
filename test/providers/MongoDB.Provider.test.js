/*jslint node:true, white:true */
"use strict";

/*!
 * crafity-storage - Crafity MongoDB Provider Tests
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Galina Slavova
 * Copyright(c) 2013 Bart Riemens
 * MIT Licensed
 */

/**
 * Load Test dependencies.
 */

/* Load JSTest and asserts lib */
var jstest = require('crafity-jstest').createContext('MongoDB Provider Tests');
var assert = jstest.assert;
var db = require("./data/mongo.database");

/* The main code to verify */
var MongoDB = require('../../lib/providers/mongoDB.Provider');

/* The base provider is load to verify the prototype chain */
var Provider = require('../../lib/providers/Provider');

/* The special property __proto__ as a string constant */
var PROTO_PROPERY = "__proto__";

/* A default configuration used by most of the tests */
var config = {
	"name": "Test",
	"url": "mongodb://localhost/crafity-test",
	"collection": "tests"
};

/**
 * Create a new configuration with a random database name
 * @returns {*} A configuration object
 */
function createConfig() {
	var testConfig = JSON.parse(JSON.stringify(config));
//	testConfig.database = "db" + Math.floor(Math.random() * 100000).toString();
	return testConfig;
}

function createDatabase(config, callback) {
	db.create(config, callback);
}

/**
 * Run all the tests
 */
jstest.run({
	"Instantiate the MongoDB provider and test all the argument combinations": function () {
		var mongoDB;

		/* Check if the provider verifies all the arguments as expected */
		assert.expectError(function () {
			mongoDB = new MongoDB();
		}, "Expected a MongoDB configuration");
		assert.expectError(function () {
			mongoDB = new MongoDB({});
		}, "Expected a url in the MongoDB configuration");
		assert.expectError(function () {
			mongoDB = new MongoDB({url: "url"});
		}, "Expected a name in the MongoDB configuration");
		assert.expectError(function () {
			mongoDB = new MongoDB({url: "url", name: "name" });
		}, "Expected a collection name in the MongoDB configuration");

		/* Check if all the public properties are set as expected */
		mongoDB = new MongoDB(config);
		assert.areEqual("MongoDB Provider", mongoDB.type, "Expected another provider name");
		assert.areEqual("Test", mongoDB.name, "Expected another name");
		assert.areEqual("mongodb://localhost/crafity-test", mongoDB.url, "Expected another database name");
		assert.areEqual("tests", mongoDB.collection, "Expected another collection name");
	},

	"Instantiate the MongoDB provider and check if it has the Generic Provider as its prototype": function () {
		var mongoDB = new MongoDB(config);
		assert.isInstanceOf(Provider, mongoDB[PROTO_PROPERY], "Expected the Generic Provider to be the prototype");
	},

	"Test if isConnected is false initially": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.isFalse(mongoDB.isConnected(), "Expected the connection to be closed.");
	},

	"Test if the connect function checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		// arrange
		assert.expectError(function () {
			mongoDB.connect("Missing callback argument.");
		}, "Argument 'callback' must be of type Function");

		assert.expectError(function () {
			mongoDB.connect("other");
		}, "Argument 'callback' must be of type Function");

	},

	"Test if connect provides a legitimate connection": function (test) {
		test.async(1000);

		var mongoDB = new MongoDB(createConfig());

		assert.isFalse(mongoDB.isConnected(), "Expected the connection to be closed.");

		mongoDB.connect(function (err, connection) {
			if (err) {
				console.log("err", err);
			}
			assert.hasNoValue(err, "Expected error to be null or undefined.");
			assert.hasValue(connection, "Expected the connection to be defined.");
			assert.isTrue(mongoDB.isConnected(), "Expected the connection to be opened.");

			test.complete();
		});
	},

	"Test if the connect function returns a valid connection after calling it twice": function (test) {
		test.async(3000);

		var mongoDB = new MongoDB(createConfig());

		var steps = [
			function Connect_First_Time(next) {
				mongoDB.connect(next);
			},
			function Connect_Second_Time_And_Assert_Conneciton_Exists(next, prevErr, connection) {
				if (prevErr) {
					console.log("err", prevErr);
				}

				assert.hasNoValue(prevErr, "Expected error to be null or undefined.");
				assert.hasValue(connection, "Expected the connection to be defined.");
				assert.isTrue(mongoDB.isConnected(), "Expected the connection to be opened.");

				mongoDB.connect(next);
			},
			function Assert_Connection_Exists(next, prevErr, connection) {
				if (prevErr) {
					console.log("prevErr", prevErr);
				}

				assert.hasNoValue(prevErr, "Expected error to be null or undefined.");
				assert.hasValue(connection, "Expected the connection to be defined.");
				assert.isTrue(mongoDB.isConnected(), "Expected the connection to be opened.");

				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});

	},

	"Test if the disconnect function checks all its arguments properly": function (test) {
		test.async(3000);

		var mongoDB = new MongoDB(createConfig());

		var steps = [
			function Disconnect(next) {
				mongoDB.disconnect(next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, "Expected to throw an error.");
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});
//		// arrange
//		assert.expectError(function () {
//			mongoDB.disconnect();
//		}, "Missing callback argument");
//
//		assert.expectError(function () {
//			mongoDB.disconnect("other");
//		}, "Argument 'callback' must be of type Function");

	},

	"Test if calling disconnect without a prior connect call throws an error": function (test) {
		test.async(3500);

		var mongoDB = new MongoDB(createConfig());

		var steps = [

			function Disconnect_From_DataSource(next) {
				mongoDB.disconnect(next);
			},
			function Assert_Error(next, err) {
				assert.hasValue(err, "Expected to throw an error.");
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});
	},

	"Test if calling disconnect with a prior connect call results in a valid connection": function (test) {
		test.async(3100);

		var mongoDB = new MongoDB(createConfig());

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Disconnect_From_DataSource(next, err) {
				assert.hasNoValue(err, "Expected the error to be null of undefined.");
				assert.isTrue(mongoDB.isConnected(), "Expected the connection to be opened.");

				mongoDB.disconnect(next);
			},
			function Assert_No_Connection(next, err) {
				assert.hasNoValue(err, "Expected the error to be null of undefined.");
				assert.isFalse(mongoDB.isConnected(), "Expected the connection to be closed.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});
	},

	"Test if save function check all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.expectError(function () {
			mongoDB.save();
		}, "Missing 'data' argument.");

		assert.expectError(function () {
			mongoDB.save({});
		}, "Missing 'callback' argument.");

		assert.expectError(function () {
			mongoDB.save({}, "nocallback");
		}, "Argument 'callback' must be of type Function");
	},

	"Test if create function checks all its arguments": function () {
		var mongoDB = new MongoDB(config);

		assert.expectError(function () {
			mongoDB.create();
		}, "Missing 'callback' argument.");

		assert.expectError(function () {
			mongoDB.create({}, "nocallback");
		}, "Argument 'callback' must be of type Function.");
	},

	"Test if create function creates a database with specific name and schema": function (test) {
		test.async(2000);

		var config = createConfig();
		config.schema = {name: String};

		var mongoDB = new MongoDB(config);

		var steps = [

			function Create_Database(next) {
				mongoDB.create(next);
			},
			function Assert_Created_Database(next) {
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});
	}

//	"Test if calling save on a new document the document is inserted": function (test) {
//		test.async(2500);
//
//		var mongoDB = new MongoDB(createConfig());
//		var steps = [
//
//			// 1. recreate database
//			function Save_New_Document(next) {
//				mongoDB.save({ "name": "Galina" }, next);
//			},
//			function Assert_(next, err, savedData) {
//				if (err) { throw err; }
//				assert.hasValue(savedData, "Expected the saved savedData to be returned");
//				assert.hasValue(savedData._id, "Expected a new _id property");
//				next();
//			}];
//
//		test.steps(steps).on("complete", function (err) {
//			test.complete(err);
//		});
//	}

});

/**
 * Return the test context
 * @type {exports.createContext|*}
 */
module.exports = jstest;