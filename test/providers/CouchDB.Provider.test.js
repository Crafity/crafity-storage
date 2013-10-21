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
	design: "testDesign",
	view: "testView"
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
		assert.areEqual("testDesign", couchDB.design, "Expected another provider name");
		assert.areEqual("testView", couchDB.view, "Expected another provider name");
		assert.isSame(config, couchDB.config, "Expected exactly the same configuration");
	},
	"Instantiate the CouchDB provider and check if it has the Generic Provider as its prototype": function () {
		var couchDB = new CouchDB(config, nano);
		assert.isInstanceOf(Provider, couchDB[PROTO_PROPERY], "Expected the Generic Provider to be the prototype");
	},

	"Test CouchDB provider using a non existing server": function (test) {
		test.async(1000);

		var config = createConfig();
		config.url = "http://nonexistingserver";
		var couchDB = new CouchDB(config, nano);

		couchDB.findAll(function (err) {
			assert.hasValue(err, "Expected an error");
			assert.areEqual("Server 'http://nonexistingserver/' not found.", err.message, "Expected another error message");
			couchDB.recreate(function (err) {
				test.complete();
			});
		});
	},
	"Test CouchDB provider using a non existing database": function (test) {
		test.async(1000);

		var config = createConfig();
		config.database = "whatdatabase";
		var couchDB = new CouchDB(config, nano);

		couchDB.findAll(function (err) {
			assert.hasValue(err, "Expected an error");
			assert.areEqual("Database 'whatdatabase' not found.", err.message, "Expected another error message");
			test.complete();
		});
	},
	"Test CouchDB provider using a non existing user and password": function (test) {
		test.async(1000);

		var config = createConfig();
		config.url = "http://who:what@localhost:5984";
		var couchDB = new CouchDB(config, nano);

		couchDB.findAll(function (err) {
			assert.hasValue(err, "Expected an error");
			assert.areEqual("Name or password is incorrect.", err.message, "Expected another error message");
			test.complete();
		});
	},

	"Test the create function to see if it creates the database": function (test) {
		test.async(1000);

		var couchDB = new CouchDB(createConfig(), nano);

		var steps = [
			function Proof_There_Is_No_Database(next) {
				couchDB.findById("123", next);
			},
			function Create_The_Database(next, err, result) {
				assert.hasValue(err, "expected an error");
				assert.areEqual("Database '" + couchDB.database + "' not found.", err.message, "expected an error message");
				couchDB.create(next);
			},
			function Verify_The_Database_Is_There(next) {
				couchDB.findById("123", next);
			},
			function Assert(next, err) {
				assert.hasValue(err, "expected an error");
				assert.areEqual("Item with id '123' does not exist", err.message, "expected an error message");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});
	},
	"Test the drop function to see if it deletes the database": function (test) {
		test.async(1000);

		var couchDB = new CouchDB(createConfig(), nano);

		var steps = [
			function Create_The_Database(next, err, result) {
				couchDB.create(next);
			},
			function Verify_The_Database_Is_There(next, err) {
				if (err) { throw err; }
				couchDB.findById("123", next);
			},
			function Drop_The_Database(next, err) {
				assert.hasValue(err, "expected an error");
				assert.areEqual("Item with id '123' does not exist", err.message, "expected an error message");
				couchDB.drop(next);
			},
			function Test_The_Database(next, err, result) {
				if (err) { throw err; }
				couchDB.findById("123", next);
			},
			function Verify_Outcome(next, err) {
				assert.hasValue(err, "expected an error");
				assert.areEqual("Database '" + couchDB.database + "' not found.", err.message, "expected an error message");
				next();
			},
			function Drop_The_Database(next) {
				couchDB.drop(next);
			},
			function (next, err) {
				assert.hasValue(err, "expected an error");
				assert.areEqual("Database '" + couchDB.database + "' not found.", err.message, "expected an error message");
				next();
			}
		];

		test.steps(steps).on("complete", test.complete);
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
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
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
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});

	},

	"Test if the findById function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);

		assert.expectError(function () {
			// The findAll function expects a key as first argument.
			//  Anything else than a number of string should throw an error.
			couchDB.findById();
		}, "Argument 'id' is required");

		assert.expectError(function () {
			// The findAll function expects a key as first argument.
			//  Anything else than a number of string should throw an error.
			couchDB.findById("id", 123, function () {
				return false;
			});
		}, "Argument 'rev' must be a string");

		assert.expectError(function () {
			// The findAll function expects a key as first argument.
			//  Anything else than a number of string should throw an error.
			couchDB.findById(function () {
				return false;
			});
		}, "Argument 'id' must be a string");

		assert.expectError(function () {
			// The findAll function expects a callback as second arguments.
			//  Anything else should throw an error.
			couchDB.findById("id", "Nonsense");
		}, "Argument 'callback' must be of type Function");
	},
	"Test the findById function using two documents and see if it returns the correct one": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{value: "123", "Hello": "World"},
			{value: "456", "Hello": "Foo"}
		];

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
			},

			function Run_The_Actual_Test(next, err, insertedData) {
				if (err) { throw err; }
				couchDB.findById(insertedData[1]._id, next);
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
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});

	},
	"Test the findById function and see if it returns the correct version if asked explicitly": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{value: "123", "Hello": "World"},
			{value: "456", "Hello": "Foo"}
		];
		var previousRev, previousId;

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
			},

			function Create_A_Second_Version_Of_A_Document(next, err, insertedData) {
				if (err) { throw err; }
				var changedDoc = insertedData[1];
				previousRev = changedDoc._rev;
				previousId = changedDoc._id;
				assert.hasValue(previousRev, "Expected a previous revision");
				changedDoc.value = "789";
				couchDB.save(changedDoc, function (err) {
					next(err, insertedData);
				});
			},

			function Run_The_Actual_Test_By_Using_The_Old_Version(next, err, insertedData) {
				if (err) { throw err; }
				couchDB.findById(insertedData[1]._id, previousRev, next);
			},

			function Verify_Test_Results(next, err, data) {
				if (err) { throw err; }
				assert.hasValue(data, "Expected data to be returned");
				assert.areEqual(testData[1].Hello, data.Hello, "Expected the same data");
				assert.areEqual(previousId, data._id, "Expected the revision");
				assert.areEqual(previousRev, data._rev, "Expected the revision");
				assert.isNotSame(testData[1], data, "Expected not the same referenced items");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});

	},
	"Test the findById function using a non-exising revision": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{value: "123", "Hello": "World"},
			{value: "456", "Hello": "Foo"}
		];
		var previousId, unknownRev = "2-2677b6e95975c6c52381322c00cc4c8e";

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
			},

			function Run_The_Actual_Test_By_Using_The_Old_Version(next, err, insertedData) {
				if (err) { throw err; }
				previousId = insertedData[1]._id;
				couchDB.findById(insertedData[1]._id, unknownRev, next);
			},

			function Verify_Test_Results(next, err, data) {
				assert.hasValue(err, "Expected an error");
				assert.areEqual("Item with id '" + previousId + "' and rev '" + unknownRev + "' does not exist", err.message, "Expected another error message");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});

	},
	"Test the findById function using a non-existing id": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{_id: "123", "Hello": "World"},
			{_id: "456", "Hello": "Foo"}
		];

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
			},

			function Run_The_Actual_Test(next, err) {
				if (err) { throw err; }
				couchDB.findById("789", next);
			},

			function Verify_Test_Results(next, err, data) {
				assert.hasValue(err, "Expected an error");
				assert.areEqual("Item with id '789' does not exist", err.message, "Expected the same data");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
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
			// The findAll function expects a callback as second arguments.
			//  Anything else should throw an error.
			couchDB.findByKey("id", "Nonsense");
		}, "Argument 'callback' must be of type Function");
	},
	"Test the findByKey function using two documents and see if it returns the correct one": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{value: "123", "Hello": "World"},
			{value: "456", "Hello": "Foo"},
			{
				"_id": "_design/testDesign",
				"language": "javascript",
				"views": {
					"testView": {
						"map": "function(doc) {\n  emit(doc.value, doc);\n}"
					}
				}
			}
		];

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
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
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});

	},
	"Test the findByKey function using two documents and see if it throws an error when both are returned": function (test) {
		test.async(9000);

		var config = createConfig();
		var couchDB = new CouchDB(config, nano);
		var testData = [
			{
				"_id": "_design/testDesign",
				"language": "javascript",
				"views": {
					"testView": {
						"map": "function(doc) {\n  emit(doc.value, doc);\n}"
					}
				}
			},
			{_id: "123", "Hello": "World", value: "xyz" },
			{_id: "456", "Hello": "Foo", value: "xyz"}
		];

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
			},

			function Run_The_Actual_Test(next, err) {
				if (err) { throw err; }
				config.design = "testDesign";
				config.view = "testView";
				couchDB = new CouchDB(config, nano);
				couchDB.findByKey("xyz", next);
			},

			function Verify_Test_Results(next, err, data) {
				assert.hasValue(err, "Expected an error");
				assert.areEqual("Found multiple items with key 'xyz'", err.message, "Expected another error message");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});

	},
	"Test the findByKey function using a non-existing key": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{value: "123", "Hello": "World"},
			{value: "456", "Hello": "Foo"},
			{value: "123", "Hello": "bar"},
			{
				"_id": "_design/testDesign",
				"language": "javascript",
				"views": {
					"testView": {
						"map": "function(doc) {\n  emit(doc.value, doc);\n}"
					}
				}
			}
		];

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
			},

			function Run_The_Actual_Test(next, err) {
				if (err) { throw err; }
				couchDB.findByKey("999", next);
			},

			function Verify_Test_Results(next, err, data) {
				assert.hasValue(err, "Expected an error");
				assert.areEqual("Item with key '999' does not exist", err.message, "Expected another error message");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				return test.complete(err);
			});
		});

	},

	"Test if the findManyByKey function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);

		assert.expectError(function () {
			// The findAll function expects a key as first argument.
			couchDB.findManyByKey();
		}, "Argument 'key' is required");

		assert.expectError(function () {
			// The findAll function expects a callback as second arguments.
			//  Anything else should throw an error.
			couchDB.findManyByKey("Key", "Nonsense");
		}, "Argument 'callback' must be of type Function");
	},
	"Test the findManyByKey function using multiple documents with the same key": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);

		var steps = [
			function (next) {
				couchDB.recreate(function () {
					couchDB.save({
						"_id": "_design/testDesign",
						"language": "javascript",
						"views": {
							"testView": {
								"map": "function(doc) {\n  emit(doc.value, doc);\n}"
							}
						}
					}, function () {
						couchDB.save({value: 123}, function () {
							couchDB.save({value: 123}, function () {
								couchDB.save({value: 456}, function () {
									var config = couchDB.config;
									config.design = "testDesign";
									config.view = "testView";
									couchDB = new CouchDB(config, nano);
									next();
								});
							});
						});
					});
				});
			},
			function (next) {
				couchDB.findManyByKey(123, next);
			},
			function (next, err, data) {
				assert.hasValue(data, "Expected data to be returned");
				assert.areEqual(2, data.length, "Expected 2 documents");
				next();
			}
		];

		test.steps(steps).on('complete', function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});
	},
	"Test the findManyByKey function using a non-existing key": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);

		var steps = [
			function (next) {
				couchDB.recreate(function () {
					couchDB.save({
						"_id": "_design/testDesign",
						"language": "javascript",
						"views": {
							"testView": {
								"map": "function(doc) {\n  emit(doc.value, doc);\n}"
							}
						}
					}, function () {
						couchDB.save({value: 123}, function () {
							couchDB.save({value: 123}, function () {
								couchDB.save({value: 456}, function () {
									var config = couchDB.config;
									config.design = "testDesign";
									config.view = "testView";
									couchDB = new CouchDB(config, nano);
									next();
								});
							});
						});
					});
				});
			},
			function (next) {
				couchDB.findManyByKey(999, next);
			},
			function (next, err, data) {
				assert.hasValue(data, "Expected data");
				assert.areEqual(0, data.length, "Expected 0 documents");
				next();
			}
		];

		test.steps(steps).on('complete', function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
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
				couchDB.recreate(next);
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
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
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
				couchDB.recreate(next);
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
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err, data);
			});
		});
	},

	"Test if the saveMany function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);
		assert.expectError(function () {
			couchDB.saveMany();
		}, "Argument 'data' is required");
		assert.expectError(function () {
			couchDB.saveMany({});
		}, "Argument 'data' must be an Array");
		assert.expectError(function () {
			couchDB.saveMany([], {});
		}, "Argument 'callback' must be of type Function");
	},
	"Test the saveMany function and see if it stores multiple documents at once": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{"Hello": "World"},
			{"Hello": "Foo"}
		];

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Run_The_Actual_Test(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
			},

			function Get_All_The_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.findAll(next);
			},

			function Verify_Test_Results(next, err, data) {
				if (err) { throw err; }
				assert.areEqual(2, data.length, "Expected 2 items");
				assert.hasValue(data[0]._id, "Expected a _id value");
				assert.hasValue(data[0]._rev, "Expected a _rev value");
				assert.hasValue(data[1]._id, "Expected a _id value");
				assert.hasValue(data[1]._rev, "Expected a _rev value");
				assert.areEqual(testData[0].Hello, data[0].Hello, "Expected the same data");
				assert.areEqual(testData[1].Hello, data[1].Hello, "Expected the same data");
				assert.isNotSame(testData, data, "Expected not the same referenced items");
				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
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
				couchDB.recreate(next);
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
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
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
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
			},

			function Run_The_Actual_Test(next, err, updatedTestData) {
				// Update the revisions of the local data...
				if (err) { throw err; }
				couchDB.remove(updatedTestData[1], next);
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
			couchDB.drop(function (deleteErr) {
				//if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});

	},

	"Test if the removeAll function checks all its arguments properly": function () {
		var couchDB = new CouchDB(createConfig(), nano);
		assert.expectError(function () {
			couchDB.removeAll();
		}, "Argument 'data' is required");
		assert.expectError(function () {
			couchDB.removeAll({});
		}, "Argument 'data' must be an Array");
		assert.expectError(function () {
			couchDB.removeAll([], {});
		}, "Argument 'data' must contain at least one item");
		assert.expectError(function () {
			couchDB.removeAll([
				{}
			], {});
		}, "Argument 'callback' must be of type Function");
	},
	"Test the removeAll function using two documents and see if it deletes both of them": function (test) {
		test.async(9000);

		var couchDB = new CouchDB(createConfig(), nano);
		var testData = [
			{"Hello": "World"},
			{"Hello": "Foo"}
		];

		var steps = [
			function Create_Test_Database(next) {
				couchDB.recreate(next);
			},

			function Insert_Test_Data(next, err) {
				if (err) { throw err; }
				couchDB.saveMany(testData, next);
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
				next(data);
			},

			function Run_The_Actual_Test(next, data) {
				couchDB.removeAll(data, next);
			},

			function Run_The_Actual_Test(next, err) {
				if (err) { throw err; }
				couchDB.findAll(next);
			},

			function Verify_Test_Results(next, err, data) {
				if (err) { throw err; }
				assert.areEqual(0, data.length, "Expected 0 items");
				next();
			}

		];

		test.steps(steps).on("complete", function (err) {
			couchDB.drop(function (deleteErr) {
				if (deleteErr) { return test.complete(deleteErr); }
				test.complete(err);
			});
		});

	}
});

/**
 * Return the test context
 * @type {exports.createContext|*}
 */
module.exports = jstest;
