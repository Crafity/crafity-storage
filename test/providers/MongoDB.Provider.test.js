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
var MongoDB = require('../../lib/providers/MongoDB.Provider');

/* The base provider is load to verify the prototype chain */
var Provider = require('../../lib/providers/Provider');

/* The special property __proto__ as a string constant */
var PROTO_PROPERY = "__proto__";

/* A default configuration used by most of the tests */
var config = {
	"name": "Test",
	"url": "mongodb://localhost:27017/crafity-test",
	"collection": "tests"
};

var expected_no_error = "Expected the error to be null of undefined.";
var expected_error = "Expected error to have a value.";
var expected_connection = "Expected open connection.";
var expected_no_connection = "Expected the connection to be closed.";

/**
 * Create a new configuration with a random database name
 * @returns {*} A configuration object
 */
function createConfig() {
	var testConfig = JSON.parse(JSON.stringify(config));
	testConfig.url += Math.floor(Math.random() * 100000).toString();
	return testConfig;
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
		assert.areEqual("mongodb://localhost:27017/crafity-test", mongoDB.url, "Expected another database name");
		assert.areEqual("Test", mongoDB.name, "Expected another name");
		assert.areEqual("tests", mongoDB.collection, "Expected another collection name");
		assert.isSame(config, mongoDB.config, "Expected exactly the same configuration");
//		assert.hasValue(mongoDB.schema, "Expected schema to exist");
	},

	"Instantiate the MongoDB provider and check if it has the Generic Provider as its prototype": function () {
		var mongoDB = new MongoDB(config);
		assert.isInstanceOf(Provider, mongoDB[PROTO_PROPERY], "Expected the Generic Provider to be the prototype");
	},

	"Test if isConnected is false initially": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.isFalse(mongoDB.isConnected(), "Expected the connection to be closed.");
	},

	"Test if the CONNECT function checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.expectError(function () {
			mongoDB.connect();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.connect("other");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if CONNECT provides a legitimate connection": function (test) {
		test.async(900);

		var mongoDB = new MongoDB(createConfig());

		var steps = [
			function Connect_To_Database(next) {
				assert.isFalse(mongoDB.isConnected(), "Expected the connection to be closed.");
				mongoDB.connect(next);
			},
			function Assert_Connection_Is_Alive(next, err) {
				assert.hasNoValue(err, "Expected error to be null or undefined.");
				assert.isTrue(mongoDB.isConnected(), "Expected the connection to be opened.");

				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			mongoDB.disconnect(function () {
				test.complete(err);
			});
		});
	},

	"Test if the CONNECT function returns a valid connection after calling it twice": function (test) {
		test.async(1000);

		var mongoDB = new MongoDB(createConfig());

		var steps = [
			function Connect_First_Time(next) {
				assert.isFalse(mongoDB.isConnected(), expected_no_connection);
				mongoDB.connect(next);
			},
			function Connect_Second_Time_And_Assert_Conneciton_Exists(next, err) {
				assert.hasNoValue(err, expected_no_error);
				assert.isTrue(mongoDB.isConnected(), expected_connection);

				mongoDB.connect(next);
			},
			function Assert_Connection_Exists(next, err) {
				assert.hasNoValue(err, expected_no_error);
				assert.isTrue(mongoDB.isConnected(), expected_connection);

				next();
			}
		];

		test.steps(steps).on("complete", function (err) {
			mongoDB.disconnect(function () {
				test.complete(err);
			});
		});

	},

	"Test if the DISCONNECT function checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.expectError(function () {
			mongoDB.disconnect();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.disconnect("nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling DISCONNECT without a prior connect call throws an error": function (test) {
		test.async(1000);

		var mongoDB = new MongoDB(createConfig());

		var steps = [

			function Disconnect_From_DataSource(next) {
				mongoDB.disconnect(next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, "Expected to throw an error after disconnecting without prior connect.");
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});
	},

	"Test if calling DISCONNECT with a prior connect call results in a closed connection": function (test) {
		test.async(1000);

		var mongoDB = new MongoDB(createConfig());

		var steps = [
			function Connect_To_DataSource(next) {
				assert.isFalse(mongoDB.isConnected(), "Expected the database conneciton to be closed.");
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

	"Test if CREATE function checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.expectError(function () {
			mongoDB.create();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.create("nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling CREATE without a prior connect will result in an error": function (test) {
		test.async(2300);

		var dbName = "crafity-special-test-1";
		config.url = "mongodb://localhost:27017/" + dbName;
		var mongoDB = new MongoDB(config);

		var steps = [

			function Create(next) {
				mongoDB.create(next);
			},
			function Assert_Error_For_Closed_Connection(next, err) {
				assert.areEqual(err.message, mongoDB.no_connection_err);

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});
	},

	"Test if CREATE function creates a database with a specific name and returns the name": function (test) {
		test.async(2000);

		var dbName = "crafity-special-test-2";
		config.url = "mongodb://localhost:27017/" + dbName;
		var mongoDB = new MongoDB(config);

		//! assert that the existing database list from server does not contain this dbName

		var steps = [
			function Connect_to_DataSource(next) {
				mongoDB.connect(next);
			},
			function Create_DataSource(next) {
				assert.isTrue(mongoDB.isConnected(), "Expected the database conneciton to be open.");
				mongoDB.create(next);
			},
			function Assert_Return_databaseName(next, err, databaseNameResult) {
				assert.hasNoValue(err, expected_no_error);
				assert.isSame(dbName, databaseNameResult, "Expected database names to be exactly the same.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			mongoDB.disconnect(function () {
				test.complete(err);
			});
		});

	},

	"Test if DROP function checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.expectError(function () {
			mongoDB.drop();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.drop("nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling DROP of a database without open connection results in an error": function (test) {
		test.async(1000);

		var mongoDB = new MongoDB(createConfig());

		var steps = [

			function Drop_Database(next) {
				mongoDB.drop(next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, expected_error);
				assert.areEqual(err.message, mongoDB.no_connection_err);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});
	},

	"Test if SAVE function checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.expectError(function () {
			mongoDB.save();
		}, mongoDB.missing_data_err);

		assert.expectError(function () {
			mongoDB.save({});
		}, mongoDB.missing_callback_err);

		assert.expectError(function () {
			mongoDB.save({}, "nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling SAVE without a prior connect will result in an error": function (test) {
		test.async(900);
		var mongoDB = new MongoDB(createConfig());

		var testData = {
			name: "test item",
			timeStamp: Date.now()
		};

		var steps = [

			function Save(next) {
				mongoDB.save(testData, next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, expected_error);
				assert.areEqual(err.message, mongoDB.no_connection_err);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			mongoDB.disconnect(function () {
				test.complete(err);
			});
		});
	},

	"Test if calling SAVE of a nonexisting document will result in the saved document": function (test) {
		test.async(2500);
		var mongoDB = new MongoDB(createConfig());

		var testDocument = {
			name: "test item",
			timeStamp: Date.now()
		};

//		console.log("testDocument", testDocument);

		var steps = [

			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Drop_Database(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.drop(next);
			},
			function Assert_No_error_And_Save_Data(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.save(testDocument, next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err, savedDocument) {
//				console.log("savedDocument", savedDocument);
				assert.hasNoValue(err, expected_no_error);
				assert.areEqual(testDocument, savedDocument, "Expected the referenced items to be the same.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			mongoDB.drop(function () {
				mongoDB.disconnect(function () {
					test.complete(err);
				});
			});
		});
	},

	"Test if calling SAVE of an existing document will result in modified document": function (test) {
		test.async(2500);
		var mongoDB = new MongoDB(createConfig());

		var testDocument = {
			name: "test item",
			timeStamp: Date.now()
		};
//		console.log("testDocument", testDocument);

		var steps = [

			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Drop_Database(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.drop(next);
			},
			function Assert_No_error_And_Save_Data(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.save(testDocument, next);
			},
			function Assert_No_error_And_Save_Data(next, err, savedDocument) {
				assert.hasNoValue(err, expected_no_error);
				assert.areEqual(testDocument, savedDocument, "Expected the referenced items to be the same.");

				savedDocument.name = "test modified";
				mongoDB.save(testDocument, next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err, updatedResult) {
//				console.log("updatedResult =", updatedResult);
				assert.hasNoValue(err, expected_no_error);
				assert.areEqual(1, updatedResult, "Expected the the document to be modified succefully.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			mongoDB.drop(function () {
				mongoDB.disconnect(function () {
					test.complete(err);
				});
			});
		});
	},

	"Test if calling DROP on an existing database results in actual dropping of the database": function (test) {
		test.async(2000);
		var config = createConfig();
		var mongoDB = new MongoDB(config);

		var steps = [

			function Connect_To_Database(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Drop_Database(next, err) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.drop(next);
			},
			function Assert_No_Error_And_NoListed_Database(next, err, done) {
				assert.hasNoValue(err, expected_no_error);
				assert.isTrue(done, "Expected the drop database result to be true.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			mongoDB.disconnect(function () {
				test.complete(err);
			});
		});
	},

	"Test if calling DROP database twice results in just one actual dropping of the database": function (test) {
		test.async(3000);

		var config = createConfig();
		var mongoDB = new MongoDB(config);

		var steps = [

			function Connect_To_Database(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Drop_Database(next, err) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.drop(next);
			},
			function Assert_No_Error_And_NoListed_Database(next, err, done) {
				assert.hasNoValue(err, expected_no_error);
				assert.isTrue(done, "Expected the drop database result to be true.");

				mongoDB.drop(next);
			},
			function Assert_No_Error_And_NoListed_Database(next, err, done) {
				assert.hasNoValue(err, expected_no_error);
				assert.isTrue(done, "Expected the drop database result to be true.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			mongoDB.disconnect(function () {
				test.complete(err);
			});
		});
	},

	"Test if findByKey function checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.expectError(function () {
			mongoDB.findByKey();
		}, mongoDB.missing_key_err);

		assert.expectError(function () {
			mongoDB.findByKey({});
		}, mongoDB.missing_callback_err);

		assert.expectError(function () {
			mongoDB.findByKey({}, "nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling findByKey without prior connection results in an error": function (test) {
		test.async(1000);

		var mongoDB = new MongoDB(createConfig());

		var steps = [
			function FindByKey_Query(next) {
				mongoDB.findByKey({name: "test"}, next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, expected_error);
				assert.areEqual(err.message, mongoDB.no_connection_err);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			test.complete(err);
		});
	},

	"Test if calling findByKey for an existing document results in the document": function (test) {
		test.async(3000);

		var mongoDB = new MongoDB(createConfig());

		var steps = [
			function Connect_To_Database(next) {
				mongoDB.connect(next);
			},
			function Insert_Document(next, err) {
				assert.hasNoValue(err, expected_error);

				mongoDB.save({"name": "test"}, next);
			},
			function Assert_No_Error_And_FindByKey_Query(next, err, savedDocument) {
				console.log("savedDocument = ", savedDocument);
				assert.hasNoValue(err, expected_error);

				mongoDB.findByKey({"name": "test"}, next);
			},
			function Assert_No_Error_And_Found_Document(next, err, foundDocument) {
				console.log("foundDocument = ", foundDocument);
				
				assert.hasNoValue(err, expected_no_error);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			mongoDB.drop(function () {
				mongoDB.disconnect(function () {
					test.complete(err);
				});
			});
		});
	},

	"Test if findAll function checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig());

		assert.expectError(function () {
			mongoDB.findAll();
		}, mongoDB.missing_callback_err);

		assert.expectError(function () {
			mongoDB.findAll("nocallback");
		}, mongoDB.callback_not_a_function_err);
	}
});

/**
 * Return the test context
 * @type {exports.createContext|*}
 */
module.exports = jstest;


