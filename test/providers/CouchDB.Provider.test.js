/*jslint node:true, white:true, unparam: true */
"use strict";

/*!
 * crafity-storage - Crafity CouchDB Provider Tests
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Load Test dependencies.
 */

/* Load JSTest and asserts lib */
var jstest = require('crafity-jstest').createContext('CouchDB Provider Tests');
var assert = jstest.assert;

/* The main code to verify */
var CouchDB = require('../../lib/providers/CouchDB.Provider');

/**
 * Require the Nano module to check if the
 * dependency is available.
 *
 *   This driver is used when the env variable
 *   INTEGRATION is set to true, otherwise a
 *   mock for Nano is used.
 *
 *   The default is to use the Nano mock because
 *   you cannot assume couchdb is installed and
 *   running on the target machine (think of Travis).
 *
 * */
var nano = require('nano');

/**
 * In case we're not running an integration test
 * replace nano by a mock for further testing.
 */
if (!process.env.INTEGRATION) {
	nano = require('./mocks/nano.mock');
}

/* The special property __proto__ as a string constant */
var PROTO_PROPERY = "__proto__";

/* The base provider is load to verify the prototype chain */
var Provider = require('../../lib/providers/Provider');

/* A default configuration used by most of the tests */
var config = {
	name: "Test",
	url: "http://test:test@localhost:5984",
	database: "crafity-storage",
	design: "design",
	view: "view"
};

/**
 * Create a new configuration with a random database name
 * @returns {*} A configuration object
 */
function createConfig() {
	var testConfig = JSON.parse(JSON.stringify(config));
	testConfig.database = "db" + Math.floor(Math.random() * 100000).toString();
	return testConfig;
}
/**
 * Create a new database by dropping and creating a new database
 * @param couchDB A configured CouchDB instance
 * @param callback The callback to call when the DB is recreated
 */
function recreateDB(couchDB, callback) {
	nano(couchDB.url).db.destroy(couchDB.database, function (err) {
		if (err && err.error !== "not_found") {
			return callback(err);
		}
		return nano(couchDB.url).db.create(couchDB.database, callback);
	});
}
function loadData(couchDB, data, callback) {
	nano(couchDB.url).db.use(couchDB.database).bulk(data, callback);
}
function deleteDB(couchDB, callback) {
	nano(couchDB.url).db.destroy(couchDB.database, callback);
}

/**
 * Run all the tests
 */
jstest.run({
	"Instantiate the CouchDB provider and test all the argument combinations": function () {
		var couchDB;

		/* Check if the provider verifies all the arguments as expected */
		assert.expectError(function () {
			couchDB = new CouchDB();
		}, "Expected a CouchDB configuration");
		assert.expectError(function () {
			couchDB = new CouchDB({});
		}, "Expected a url in the CouchDB configuration");
		assert.expectError(function () {
			couchDB = new CouchDB({url: "url"});
		}, "Expected a database name in the CouchDB configuration");
		assert.expectError(function () {
			couchDB = new CouchDB({url: "url", database: "database" });
		}, "Expected a design document name in the CouchDB configuration");
		assert.expectError(function () {
			couchDB = new CouchDB({url: "url", database: "database", design: "database"});
		}, "Expected a view name in the CouchDB configuration");

		/* Check if all the public properties are set as expected */
		couchDB = new CouchDB(config, nano);
		assert.areEqual("CouchDB Provider", couchDB.type, "Expected another provider name");
		assert.areEqual("Test", couchDB.name, "Expected another provider name");
		assert.areEqual("http://test:test@localhost:5984/", couchDB.url, "Expected another provider name");
		assert.areEqual("crafity-storage", couchDB.database, "Expected another provider name");
		assert.areEqual("design", couchDB.design, "Expected another provider name");
		assert.areEqual("view", couchDB.view, "Expected another provider name");
	},
	"Instantiate the CouchDB provider and check if it has the Generic Provider as its prototype": function () {
		var couchDB = new CouchDB(config, nano);
		assert.isInstanceOf(Provider, couchDB[PROTO_PROPERY], "Expected the Generic Provider to be the prototype");
	},
	"Test if the findAll function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);

		assert.expectError(function () {
			// The findAll function expects a callback.
			//  Anything else should throw an error.
			couchDB.findAll("Nonsense");
		}, "Argument 'callback' must be of type Function");
	},
	"Test the findAll function using two documents and see if it returns both of them": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{"Hello": "World"},
			{"Hello": "Foo"}
		];

		var steps = [
			function Create_Test_Database(next) {
				recreateDB(couchDB, next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				loadData(couchDB, { docs: testData }, next);
			},

			function Run_The_Actual_Test(next, err) {
				if (err) { throw err; }
				couchDB.findAll(next);
			},

			function Verify_Test_Results(next, err, data) {
				if (err) { throw err; }
				assert.areEqual(2, data.length, "Expected 2 items");
				assert.areEqual(testData[0].Hello, data[0].Hello, "Expected the same data");
				assert.areEqual(testData[1].Hello, data[1].Hello, "Expected the same data");
				assert.isNotSame(testData, data, "Expected not the same referenced items");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			deleteDB(couchDB, function (deleteErr) {
				if (deleteErr) { throw deleteErr; }
				test.complete(err);
			});
		});

	},
	"Test if the findByKey function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);

		assert.expectError(function () {
			// The findAll function expects a key as first argument.
			//  Anything else than a number of string should throw an error.
			couchDB.findByKey();
		}, "Argument 'key' is required");

		assert.expectError(function () {
			// The findAll function expects a key as first argument.
			//  Anything else than a number of string should throw an error.
			couchDB.findByKey(function () {
				return false;
			});
		}, "Argument 'key' must be a string or number");

		assert.expectError(function () {
			// The findAll function expects a callback as second arguments.
			//  Anything else should throw an error.
			couchDB.findByKey("Key", "Nonsense");
		}, "Argument 'callback' must be of type Function");
	},
	"Test the findByKey function using two documents and see if it returns the correct one": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{_id: "123", "Hello": "World"},
			{_id: "456", "Hello": "Foo"}
		];

		var steps = [
			function Create_Test_Database(next) {
				recreateDB(couchDB, next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				loadData(couchDB, { docs: testData }, next);
			},

			function Run_The_Actual_Test(next, err) {
				if (err) { throw err; }
				couchDB.findByKey("456", next);
			},

			function Verify_Test_Results(next, err, data) {
				if (err) { throw err; }
				assert.hasValue(data, "Expected data to be returned");
				assert.areEqual(testData[1].Hello, data.Hello, "Expected the same data");
				assert.isNotSame(testData[1], data, "Expected not the same referenced items");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			deleteDB(couchDB, function (deleteErr) {
				if (deleteErr) { throw deleteErr; }
				test.complete(err);
			});
		});

	},
	"Test the findByKey function using a non-existing key": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{_id: "123", "Hello": "World"},
			{_id: "456", "Hello": "Foo"}
		];

		var steps = [
			function Create_Test_Database(next) {
				recreateDB(couchDB, next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				loadData(couchDB, { docs: testData }, next);
			},

			function Run_The_Actual_Test(next, err) {
				if (err) { throw err; }
				couchDB.findByKey("789", next);
			},

			function Verify_Test_Results(next, err, data) {
				assert.hasValue(err, "Expected an error");
				assert.areEqual("Item with key '789' does not exist", err.message, "Expected the same data");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			deleteDB(couchDB, function (deleteErr) {
				if (deleteErr) { throw deleteErr; }
				test.complete(err);
			});
		});

	},
	"Test if the save function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);
		assert.expectError(function () {
			couchDB.save();
		}, "Argument 'data' is required");
		assert.expectError(function () {
			couchDB.save({}, {});
		}, "Argument 'callback' must be of type Function");
	},
	"Test the save function and see if it stores a new document": function (test) {
		test.async(1000);

		var couchDB = new CouchDB(createConfig(), nano);
		var originalData = { "hello": "world" };
		var lastSavedData;

		var steps = [
			function Create_Test_Database(next) {
				recreateDB(couchDB, next);
			},
			function Save_Actual_Data(next, err) {
				if (err) { throw err; }
				couchDB.save(originalData, next);
			},
			function Verify_Test_Results(next, err, savedData) {
				lastSavedData = savedData;
				if (err) { throw err; }
				assert.hasValue(savedData, "Expected the saved savedData to be returned");
				assert.hasValue(savedData._id, "Expected a new _id property");
				assert.hasValue(savedData._rev, "Expected a new _rev property");
				assert.areEqual("world", savedData.hello, "Expected a new _id property");
				assert.isNotSame(originalData, savedData, "Expected not the same referenced items");
				next();
			},
			function Get_All_Documents_From_Database(next, err) {
				if (err) { throw err; }
				couchDB.findAll(next);
			},
			function Verify_Test_Results(next, err, items) {
				if (err) { throw err; }
				assert.hasValue(items, "Expected the saved item to be returned");
				assert.areEqual(1, items.length, "Expected one item");
				assert.areEqual(lastSavedData._id, items[0]._id, "Expected the same id");
				assert.areEqual(lastSavedData._rev, items[0]._rev, "Expected the same revision");
				assert.areEqual(lastSavedData.hello, items[0].hello, "Expected the same value for property hello");
				assert.isNotSame(lastSavedData, items[0], "Expected not the same referenced items");
				next();
			}
		];

		test.steps(steps).on("complete", function (err, data) {
			deleteDB(couchDB, function (deleteErr) {
				if (deleteErr) { throw deleteErr; }
				test.complete(err, data);
			});
		});
	},
	"Test the save function and see if it updates an existing document": function (test) {
		test.async(1000);

		var couchDB = new CouchDB(createConfig(), nano);
		var originalData = { "hello": "world" };
		var firstSavedVersion;
		var lastSavedData;

		var steps = [
			function Create_Test_Database(next) {
				recreateDB(couchDB, next);
			},
			function Save_Actual_Data(next) {
				couchDB.save(originalData, next);
			},
			function Save_Actual_Data(next, err, savedData) {
				if (err) { throw err; }
				firstSavedVersion = savedData;
				savedData = JSON.parse(JSON.stringify(savedData));
				savedData.hello = "planet";
				couchDB.save(savedData, next);
			},
			function Verify_Test_Results(next, err, savedData) {
				if (err) { throw err; }
				lastSavedData = savedData;
				assert.hasValue(savedData, "Expected the saved savedData to be returned");
				assert.hasValue(savedData._id, "Expected a new _id property");
				assert.hasValue(savedData._rev, "Expected a new _rev property");
				assert.areEqual(firstSavedVersion._id, savedData._id, "Expected a new _id property");
				assert.areNotEqual(firstSavedVersion._rev, savedData._rev, "Expected a new _id property");
				assert.areEqual("planet", savedData.hello, "Expected a new _id property");
				assert.isNotSame(originalData, savedData, "Expected not the same referenced items");
				next();
			},
			function Get_All_Documents_From_Database(next, err) {
				if (err) { throw err; }
				couchDB.findAll(next);
			},
			function Verify_Test_Results(next, err, items) {
				if (err) { throw err; }
				assert.hasValue(items, "Expected the saved item to be returned");
				assert.areEqual(1, items.length, "Expected one item");
				assert.areEqual(lastSavedData._id, items[0]._id, "Expected the same id");
				assert.areEqual(lastSavedData._rev, items[0]._rev, "Expected the same revision");
				assert.areEqual(lastSavedData.hello, items[0].hello, "Expected the same value for property hello");
				assert.isNotSame(lastSavedData, items[0], "Expected not the same referenced items");
				next();
			}
		];

		test.steps(steps).on("complete", function (err, data) {
			deleteDB(couchDB, function (deleteErr) {
				if (deleteErr) { throw deleteErr; }
				test.complete(err, data);
			});
		});
	},
	"Test if the remove function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);
		assert.expectError(function () {
			couchDB.remove();
		}, "Argument 'data' is required");
		assert.expectError(function () {
			couchDB.remove({});
		}, "Argument 'data' is missing a '_id' property");
		assert.expectError(function () {
			couchDB.remove({ _id: 123 });
		}, "Argument 'data' is missing a '_rev' property");
		assert.expectError(function () {
			couchDB.remove({_id: 123, _rev: 123}, {});
		}, "Argument 'callback' must be of type Function");
	},
	"Test if the remove function throws an error when an item does not exist": function (test) {
		test.async(1000);

		var couchDB = new CouchDB(createConfig(), nano);
		var data = { _id: 123, _rev: 456, "hello": "world" };

		var steps = [
			function Create_Test_Database(next) {
				recreateDB(couchDB, next);
			},
			function Remove_The_NonExistent_Data(next) {
				couchDB.remove(data, next);
			},
			function Verify_Test_Results(next, err, savedData) {
				assert.hasValue(err, "Expected an error to be thrown");
				assert.areEqual("Item with id '123' and rev '456' does not exist", err.message, "Expected another error message");
				next();
			}
		];

		test.steps(steps).on("complete", function (err, data) {
			deleteDB(couchDB, function (deleteErr) {
				if (deleteErr) { throw deleteErr; }
				test.complete(err, data);
			});
		});
	},
	"Test if the remove function actually removes data": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{_id: "1", _rev: "1-5302fcdc76c7875722aedaef15501ad1", "Hello": "World"},
			{_id: "2", _rev: "1-5302fcdc76c7875722aedaef15501ad2", "Hello": "Foo"},
			{_id: "3", _rev: "1-5302fcdc76c7875722aedaef15501ad3", "Hello": "Bar"}
		];

		var steps = [
			function Create_Test_Database(next) {
				recreateDB(couchDB, next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				loadData(couchDB, { docs: testData }, next);
			},

			function Run_The_Actual_Test(next, err, updatedTestData) {
				// Update the revisions of the local data...
				updatedTestData.forEach(function (updatedItem) {
					testData.forEach(function (originalItem) {
						if (originalItem._id !== updatedItem.id) { return; }
						originalItem._rev = updatedItem.rev;
					});
				});
				if (err) { throw err; }
				couchDB.remove(testData[1], next);
			},

			function Get_All_The_Data(next, err) {
				if (err) { throw err; }
				couchDB.findAll(next);
			},

			function Verify_Test_Results(next, err, data) {
				if (err) { throw err; }
				assert.areEqual(2, data.length, "Expected 2 items");
				assert.areEqual(testData[0].Hello, data[0].Hello, "Expected the same data");
				assert.areEqual(testData[2].Hello, data[1].Hello, "Expected the same data");
				assert.isNotSame(testData, data, "Expected not the same referenced items");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			deleteDB(couchDB, function (deleteErr) {
				if (deleteErr) { throw deleteErr; }
				test.complete(err);
			});
		});

	},
	"Test if the isConnected function returns true after initialisation": function () {
		var couchDB = new CouchDB(createConfig(), nano);
		
		assert.isTrue(couchDB.isConnected(), "Expected isConnected to return true by default");
	},
	"Test if the connect function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);
		
		assert.expectError(function () {
			couchDB.connect("Nonsense argument");
		}, "Argument 'callback' must be of type Function");
	},
	"Test the connect function and check if call the callback": function (test) {
		test.async(1000);
		
		var couchDB = new CouchDB(createConfig(), nano);
		
		couchDB.connect(function () {
			assert.isTrue(couchDB.isConnected(), "Expected isConnected to return true by default");
			test.complete();
		});
		
	},
	"Test if the disconnect function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);
		
		assert.expectError(function () {
			couchDB.disconnect("Nonsense argument");
		}, "Argument 'callback' must be of type Function");
	},
	"Test the disconnect function and check if call the callback": function (test) {
		test.async(1000);
		
		var couchDB = new CouchDB(createConfig(), nano);
		
		couchDB.disconnect(function () {
			assert.isTrue(couchDB.isConnected(), "Expected isConnected to return true even after disconnection");
			test.complete();
		});
		
	}
});

/**
 * Return the test context
 * @type {exports.createContext|*}
 */
module.exports = jstest;
