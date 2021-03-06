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
//var db = require("./data/mongo.database");

/**
 * Require the native mongoDB module to check if the
 * dependency is available.
 *
 *   This driver is used when the env variable
 *   INTEGRATION is set to true, otherwise a
 *   mock for mongoDB is used.
 *
 *   The default is to use the mongoDB mock because
 *   you cannot assume mongodb is installed and
 *   running on the target machine where these test are running (think of Travis).
 *
 * */
var _mongoDB = require("mongodb");

/**
 * In case we are not running an integration test
 * replace mongoDB by a mock for further testing.
 */
if (!process.env.INTEGRATION) {
	_mongoDB = require('./mocks/mongodb.mock');
}

/* The main code to verify */
var MongoDB = require('../../lib/providers/MongoDB.Provider');

/* The base provider is load to verify the prototype chain */
var Provider = require('../../lib/providers/Provider');

/* The special property __proto__ as a string constant */
var PROTO_PROPERY = "__proto__";

/* A default configuration used by most of the tests */
var config = {
	"name": "Test",
	"url": "mongodb://localhost:27017/crafity-test-",
	"collection": "tests"
};

var expected_no_error = "Expected the error to be null of undefined.";
var expected_error = "Expected error to have a value.";
var expected_connection = "Expected open connection.";
var expected_no_connection = "Expected the connection to be closed.";

var dummyObjectID = "52701be3a424179f3500000c";
var newTestDocument = {"name": "test document"};

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
 * Run all tests
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
		var testConfig = createConfig();
		mongoDB = new MongoDB(testConfig, _mongoDB);

		assert.areEqual("MongoDB Provider", mongoDB.type, "Expected another provider name");
		assert.areEqual(testConfig.url, mongoDB.url, "Expected another database name");
		assert.areEqual("Test", mongoDB.name, "Expected another name");
		assert.areEqual("tests", mongoDB.collectionName, "Expected another collection name");
		assert.isSame(testConfig, mongoDB.config, "Expected exactly the same configuration");
	},

	"Instantiate the MongoDB provider and check if it has the Generic Provider as its prototype": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		assert.isInstanceOf(Provider, mongoDB[PROTO_PROPERY], "Expected the Generic Provider to be the prototype");
	},

	"Test if isConnected is false initially": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.isFalse(mongoDB.isConnected(), "Expected the connection to be closed.");
	},

	"Test if function CONNECT checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.connect();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.connect("other");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if function CONNECT provides a legitimate connection": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

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
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if function CONNECT returns a valid connection after calling it twice": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_First_Time(next) {
				assert.isFalse(mongoDB.isConnected(), expected_no_connection);
				mongoDB.connect(next);
			},
			function Assert_Conneciton_Exists_Connect_Second_Time(next, err) {
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
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if function DISCONNECT checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.disconnect();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.disconnect("nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling DISCONNECT without a prior open connect call throws an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [

			function Disconnect_From_DataSource(next) {
				mongoDB.disconnect(next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, "Expected to throw an error after disconnecting without prior connect.");
				assert.areEqual(mongoDB.no_connection_err, err.message, "Expected same error messages.");
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if calling DISCONNECT with a prior open connect call results in a closed connection": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

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
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if function CREATE checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.create();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.create("nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling CREATE without a prior connect will result in an error": function (test) {
		test.async(9000);

		var dbName = "crafity-test-1";
		config.url = "mongodb://localhost:27017/" + dbName;
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [

			function Create(next) {
				mongoDB.create(next);
			},
			function Assert_Error_For_Closed_Connection(next, err) {
				assert.areEqual(err.message, mongoDB.no_connection_err);

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if function CREATE creates a database with a specific name and returns the name": function (test) {
		test.async(9000);

		var testConfig = createConfig();
		var mongoDB = new MongoDB(testConfig, _mongoDB);

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
				assert.isSame(mongoDB.dbName, databaseNameResult, "Expected database names to be exactly the same.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if function RECREATE checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.recreate();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.create("nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling RECREATE without a prior connect will result in an error": function (test) {
		test.async(9000);

		var dbName = "crafity-test-1";
		config.url = "mongodb://localhost:27017/" + dbName;
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [

			function Recreate_Database(next) {
				mongoDB.recreate(next);
			},
			function Assert_Error_For_Closed_Connection(next, err) {
				assert.areEqual(err.message, mongoDB.no_connection_err);

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if function RECREATE drops and creates a database with a specific name and returns the name": function (test) {
		test.async(9000);

		var testConfig = createConfig();
		var mongoDB = new MongoDB(testConfig, _mongoDB);
		var testDocument = {"name": "Insert this document before recreating database " + testConfig.url};

		var steps = [
			function Connect_to_DataSource(next) {
				mongoDB.connect(next);
			},
			function Insert_A_Document(next, err) {
				assert.isTrue(mongoDB.isConnected(), "Expected the database conneciton to be open.");
				assert.hasNoValue(err, expected_no_error);

				mongoDB.save(testDocument, next);
			},
			function Assert_InstertedDocument_And_Recreate_DataSource(next, err, insertedDocument) {
				assert.hasNoValue(err, expected_no_error);
				assert.hasValue(insertedDocument._id, "Expected inserted document to have a value.");

				testDocument._id = insertedDocument._id;

				mongoDB.recreate(next);
			},
			function Assert_Recreated_database(next, err) {
				assert.hasNoValue(err, expected_no_error);
				assert.isSame(testConfig.url, mongoDB.url, "Expected database names to be exactly the same.");

				mongoDB.findById(testDocument._id, next);
			},
			function Assert_No_Document_Found(next, err, foundDocument) {
				assert.hasValue(err, expected_error);
				assert.hasNoValue(foundDocument, "Expected no document to be found.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				console.log("unit test DROPPED  ", config.url);
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if function DROP checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.drop();
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.drop("nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling DROP of a database without a prior open connection results in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

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
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if calling DROP on an existing database results in actual dropping of the database": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [

			function Connect_To_Database(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Drop_Database(next, err) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.drop(next);
			},
			function Assert_No_Error_And_NoListed_Database(next, err) {
				assert.hasNoValue(err, expected_no_error);

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if calling DROP database twice results in just one actual dropping of the database": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_To_Database(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Drop_Database(next, err) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.drop(next);
			},
			function Assert_No_Error_And_Drop_Database_Second_Time(next, err) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.drop(next);
			},
			function Assert_No_Error_And_NoListed_Database(next, err) {
				assert.hasValue(err, expected_error);

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if function SAVE checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

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

	"Test if calling SAVE without a prior open connect will result in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var testData = {
			name: "test item",
			timeStamp: Date.now()
		};

		var steps = [
			function Save_Document(next) {
				mongoDB.save(testData, next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, expected_error);
				assert.areEqual(err.message, mongoDB.no_connection_err);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if calling SAVE on a nonexisting document will result in the inserted document with a technical _id": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var testDocument = {
			name: "test item",
			timeStamp: Date.now()
		};

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_error_And_Save_Document(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.save(testDocument, next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err, savedDocument) {
				assert.hasNoValue(err, expected_no_error);
				assert.hasNoValue(testDocument._id, "Expected the testDocument to have no _id.");
				assert.hasValue(savedDocument._id, "Expected the savedDocument to have an _id.");
				assert.areEqual(testDocument.name, savedDocument.name, "Expected the document before and after insert to have a name property.");
				assert.areEqual(testDocument.timeStamp, savedDocument.timeStamp, "Expected the document before and after insert to have timeStamp property.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if calling SAVE on an existing document will result in a modified document": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var testDocument = {
			name: "test item",
			timeStamp: Date.now()
		};
		var insertedDocument = null;

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_error_And_Save_Data(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.save(testDocument, next);
			},
			function Assert_No_error_And_Save_Data(next, err, savedDocument) {
				insertedDocument = savedDocument;

				assert.hasNoValue(err, expected_no_error);
				assert.hasNoValue(err, expected_no_error);
				assert.hasNoValue(testDocument._id, "Expected the testDocument to have no _id.");
				assert.hasValue(savedDocument._id, "Expected the savedDocument to have an _id.");
				assert.areEqual(testDocument.name, savedDocument.name, "Expected the document before and after insert to have a name property.");
				assert.areEqual(testDocument.timeStamp, savedDocument.timeStamp, "Expected the document before and after insert to have timeStamp property.");

				insertedDocument.name = "test modified";
				mongoDB.save(insertedDocument, next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err, updatedDocument) {
				assert.hasNoValue(err, expected_no_error);
				assert.isNotSame(insertedDocument, updatedDocument, "Expected the document before and after update not to be of the same reference.");
				assert.areEqual(insertedDocument, updatedDocument, "Expected that the document before and after update to have the same properties.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if function saveMany checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

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

	"Test if calling saveMany without a prior open connect will result in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var testData = [
			{name: "test item 1", timeStamp: Date.now()},
			{name: "test item 2", timeStamp: Date.now()}
		];

		var steps = [
			function Save_Documents(next) {
				mongoDB.save(testData, next);
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

	"Test if calling saveMany on nonexisting documents will result in the inserted documents with a technical _id": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var testData = [
			{name: "test item 1", timeStamp: Date.now()},
			{name: "test item 2", timeStamp: Date.now()},
			{name: "test item 3", timeStamp: Date.now()}
		];

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_error_And_Save_Data(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.saveMany(testData, next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err, documentList) {
				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, documentList, "Expected to return array of documents.");
				assert.areEqual(3, documentList.length, "Expected to return array of 3 documents.");

				documentList.forEach(function (doc) {
					assert.hasValue(doc._id, "Expected a newly created document _id.");
				});
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if calling saveMany on existing documents will result in the modified documents": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var insertedDocuments = null;

		var testData = [
			{name: "test item 1", timeStamp: Date.now()},
			{name: "test item 2", timeStamp: Date.now()},
			{name: "test item 3", timeStamp: Date.now()}
		];

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Insert_Data(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.saveMany(testData, next);
			},
			function Assert_No_Error_And_Update_Documents(next, err, documentList) {
				insertedDocuments = documentList;

				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, insertedDocuments, "Expected to return array of documents.");
				assert.areEqual(3, insertedDocuments.length, "Expected to return array of 3 documents.");

				insertedDocuments.forEach(function (doc) {
					assert.hasValue(doc._id, "Expected a newly created document _id.");
				});

				insertedDocuments.forEach(function (doc) {
					doc.name = "modified item ";
				});

				mongoDB.saveMany(insertedDocuments, next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err, documentList) {
				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, documentList, "Expected to return array of documents.");
				assert.areEqual(3, documentList.length, "Expected to return array of 3 documents.");

				assert.isNotSame(insertedDocuments[0], documentList[0], "Expected the document before and after update not to be of the same reference.");
				assert.areEqual(insertedDocuments[0].name, documentList[0].name, "Expected that the document name before and after update to have the same values.");

				next();
			}

		];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if function REMOVE checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.remove();
		}, mongoDB.missing_data_err);

		assert.expectError(function () {
			mongoDB.remove("not an object");
		}, mongoDB.callback_not_an_Object_err);

		assert.expectError(function () {
			mongoDB.remove({"name": "test"});
		}, mongoDB.missing_data_id_err);

		assert.expectError(function () {
			mongoDB.remove({"_id": 123, "name": "test"});
		}, mongoDB.missing_callback_err);

		assert.expectError(function () {
			mongoDB.remove({"_id": 123, "name": "test"}, "nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling REMOVE without a prior open connect will result in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [

			function Remove_a_Document(next) {
				mongoDB.remove({"_id": 123, "name": "test"}, next);
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

	"Test if calling REMOVE on a document by giving an invalid _id will result in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_error_And_Save_Data(next, err) {
				assert.hasNoValue(err, expected_no_error);

				assert.expectError(function () {
					mongoDB.remove({ "_id": "52701be3a42x0xx", "name": "test item 1"}, next);
				}, "Error: the provided _id is not a valid one. It must be a single String of 12 bytes or a string of 24 hex characters.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if calling REMOVE on a nonexisting document will result in silence and no error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_error_And_Remove_Document(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.remove({ "_id": dummyObjectID, "name": "test item 1"}, next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err) {
				assert.hasNoValue(err, expected_no_error);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if calling REMOVE on an existing document will result in actual removal": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var testData = [
			{name: "test item 1", timeStamp: Date.now()},
			{name: "test item 2", timeStamp: Date.now()},
			{name: "test item 3", timeStamp: Date.now()}
		];
		var insertedDocuments = null;

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Insert_Documents(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.saveMany(testData, next);
			},
			function Assert_No_Error_And_Update_Documents(next, err, documentList) {
				insertedDocuments = documentList;

				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, insertedDocuments, "Expected to return array of documents.");
				assert.areEqual(3, insertedDocuments.length, "Expected to return array of 3 documents.");

				insertedDocuments.forEach(function (doc) {
					assert.hasValue(doc._id, "Expected a newly created document _id.");
				});

				console.log("\ndata to be REMOVED...", insertedDocuments[0]);
				mongoDB.remove(insertedDocuments[0], next);
			},
			function Assert_No_error_And_Find_All(next, err) { //}, result) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.findAll(next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err, foundDocuments) {
				console.log("Found document after removal....... ", foundDocuments);
				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, foundDocuments, "Expected to return array of documents.");
				assert.areEqual(2, foundDocuments.length, "Expected to return array of 2 documents.");

				foundDocuments.forEach(function (doc) {
					assert.areNotEqual("test item 1", doc.name, "Expected the name of this document not to be equal to 'test item 1'");
				});

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	
	"Test if function removeMany checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.removeMany();
		}, mongoDB.missing_data_err);
		assert.expectError(function () {
			mongoDB.removeMany("not an Array");
		}, mongoDB.callback_not_an_Array_err);
		assert.expectError(function () {
			mongoDB.removeMany([
				{"name": "test1"}
			]);
		}, mongoDB.missing_data_id_err);
		assert.expectError(function () {
			mongoDB.removeMany([
				{"_id": "123", "name": "test"}
			]);
		}, mongoDB.missing_callback_err);
		assert.expectError(function () {
			mongoDB.removeMany([
				{"_id": 123, "name": "test"}
			], "nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling removeMany without a prior open connect will result in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Remove_Array_of__Documents(next) {
				mongoDB.removeMany([
					{"_id": 123, "name": "test"}
				], next);
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

	"Test if calling removeMany with a missing _id in document will result in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var steps = [
			function Connectl_To_Database(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Call_RemoveMany(next, err) {
				assert.hasNoValue(err, expected_no_error);

				assert.expectError(function () {
					mongoDB.removeMany([
						{"_id": "123", "name": "test 1"},
						{"name": "test 2"}
					], next);
				}, mongoDB.missing_data_id_err);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if calling removeMany with an invalid _id in document will result in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var steps = [
			function Connectl_To_Database(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_Occured_And_RemoveMany(next, err) {
				assert.hasNoValue(err, expected_no_error);
				assert.expectError(function () {
						mongoDB.removeMany([
							{"_id": "123", "name": "test 1"},
							{"_id": "1237", "name": "test 2"}
						], next);
					},
					"Error: the provided _id is not a valid one. It must be a single String of 12 bytes or a string of 24 hex characters.");
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if calling removeMany on nonexisting document will result in silence and no error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_findAll_Documents(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.findAll(next);
			},
			function Assert_No_Error_And_removeMany_Documents(next, err, foundDocuments) {
				assert.hasNoValue(err, expected_no_error);
				console.log("foundDocuments", foundDocuments);
				assert.areEqual(0, foundDocuments.length, "Expected foundDocuments to have no length.");

				mongoDB.removeMany([
					{"_id": dummyObjectID, "name": "test item 1"},
					{"_id": dummyObjectID, "name": "test item 2"}
				], next);
			},
			function Assert_No_Error_And_findAll_Documents(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.findAll(next);
			},
			function Assert_No_Error(next, err, foundDocuments) {
				assert.hasNoValue(err, expected_no_error);
				assert.areEqual(0, foundDocuments.length, "Expected foundDocuments to have no length.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				test.complete(err);
			});
		});
	},

	"Test if calling removeMany on existing document will result in actual removal": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var testData = [
			{name: "test item 1"},
			{name: "test item 2"},
			{name: "test item 3"}
		];
		var insertedDocuments = null;

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Insert_Documents(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.saveMany(testData, next);
			},
			function Assert_No_Error_And_Update_Documents(next, err, documentList) {
				insertedDocuments = documentList;

				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, insertedDocuments, "Expected to return array of documents.");
				assert.areEqual(3, insertedDocuments.length, "Expected to return array of 3 documents.");

				insertedDocuments.forEach(function (doc) {
					assert.hasValue(doc._id, "Expected a newly created document _id.");
				});

				mongoDB.removeMany([insertedDocuments[0], insertedDocuments[1]], next);
			},
			function Assert_No_error_And_Find_All(next, err) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.findAll(next);
			},
			function Assert_No_Error(next, err, foundDocuments) {
				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, foundDocuments, "Expected to return array of documents.");
				assert.areEqual(1, foundDocuments.length, "Expected to return array of 1 documents.");

				foundDocuments.forEach(function (doc) {
					assert.areNotEqual("test item 1", doc.name, "Expected the name of this document not to be equal to 'test item 1'");
					assert.areNotEqual("test item 2", doc.name, "Expected the name of this document not to be equal to 'test item 2'");
				});

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},


	"Test if function findById checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.findById();
		}, mongoDB.missing_arguments_err + 2);

		assert.expectError(function () {
			mongoDB.findById("id");
		}, mongoDB.missing_arguments_err + 2);

		assert.expectError(function () {
			mongoDB.findById({}, "callback");
		}, mongoDB.id_not_string_err);

		assert.expectError(function () {
			mongoDB.findById("id", "callback");
		}, mongoDB.invalid_ObjectID_err);

		assert.expectError(function () {
			mongoDB.findById(dummyObjectID, "not a callback Function");
		}, mongoDB.callback_not_a_function_err);

	},

	"Test if calling findById without prior open connection results in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function FindById_Query(next) {
				mongoDB.findById(dummyObjectID, next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, expected_error);
				assert.areEqual(err.message, mongoDB.no_connection_err);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if calling findById of nonexisting document _id results in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_FindById_Query(next, err) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.findById(dummyObjectID, next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, expected_error);

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if calling findById of an existing document _id results in one found document": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_Error_And_Insert_Document(next, err) {
				assert.hasNoValue(err, expected_no_error);

				mongoDB.save(newTestDocument, next);
			},
			function Assert_No_Error_And_FindById_Query(next, err, insertedDocument) {
				assert.hasNoValue(err, expected_no_error);
				assert.hasValue(insertedDocument._id, "Expected instertedDocument to have a value.");

				mongoDB.findById(insertedDocument._id, next);
			},
			function Assert_No_Error_And_FoundDocument(next, err, foundDocument) {
				assert.hasNoValue(err, expected_no_error);
				assert.hasValue(foundDocument, "Expected the found document to have a value.");
				assert.areEqual(newTestDocument.name, foundDocument.name, "Expected the found document to have the same name as the original one.");

				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if function findByKey checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

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

	"Test if calling findByKey without prior open connection results in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

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
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	
	"Test if calling findManyByKey for an existing document results in one found document": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_To_Database(next) {
				mongoDB.connect(next);
			},
			function Insert_Document(next, err) {
				assert.hasNoValue(err, expected_error);

				mongoDB.save({"name": "test"}, next);
			},
			function Assert_No_Error_And_FindByKey_Query(next, err, savedDocument) {
				assert.hasNoValue(err, expected_error);
				assert.hasValue(savedDocument, "Expected savedDocument to have value.");

				mongoDB.findByKey({"name": "test"}, next);
			},
			function Assert_No_Error_And_Found_Document(next, err, foundDocument) {
				assert.hasValue(foundDocument, "Expected foundDocument to have value.");
				assert.isInstanceOf(Object, foundDocument, "Expected foundDocument to be an Object.");

				assert.hasNoValue(err, expected_no_error);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
				test.complete(err);
			});
		});
	},

	"Test if function findManyByKey checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.findManyByKey();
		}, mongoDB.missing_key_err);

		assert.expectError(function () {
			mongoDB.findManyByKey({});
		}, mongoDB.missing_callback_err);

		assert.expectError(function () {
			mongoDB.findManyByKey({}, "nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling findManyByKey without prior open connection results in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function FindManyByKey_Query(next) {
				mongoDB.findByKey({name: "test"}, next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, expected_error);
				assert.areEqual(err.message, mongoDB.no_connection_err);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if calling findManyByKey will result in an Array of found documents": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);
		var testData = [
			{name: "test item 1", timeStamp: Date.now()},
			{name: "test item 2", timeStamp: Date.now()},
			{name: "test item 3", timeStamp: Date.now()}
		];

		var steps = [
			function Connect_To_DataSource(next) {
				mongoDB.connect(next);
			},
			function Assert_No_error_And_Save_Data(next, err) {
				assert.hasNoValue(err, expected_no_error);
				mongoDB.saveMany(testData, next);
			},
			function Assert_No_Error_And_An_Inserted_Document(next, err, documentList) {
				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, documentList, "Expected to return array of documents.");
				assert.areEqual(3, documentList.length, "Expected to return array of 3 documents.");

				documentList.forEach(function (doc) {
					assert.hasValue(doc._id, "Expected a newly created document _id.");
				});

				mongoDB.findManyByKey({ "name": /test item/}, next);

			},
			function Assert_Found_Document_Array(next, err, foundDocuments) {
				assert.hasNoValue(err, expected_no_error);
				assert.isInstanceOf(Array, foundDocuments, "Expected to return array of documents.");
				assert.areEqual(3, foundDocuments.length, "Expected to return array of 3 documents.");

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

	
	"Test if function findAll checks all its arguments properly": function () {
		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		assert.expectError(function () {
			mongoDB.findAll();
		}, mongoDB.missing_callback_err);

		assert.expectError(function () {
			mongoDB.findAll("nocallback");
		}, mongoDB.callback_not_a_function_err);
	},

	"Test if calling findAll without prior open connection results in an error": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function FindByKey_Query(next) {
				mongoDB.findAll(next);
			},
			function Assert_Error_Occured(next, err) {
				assert.hasValue(err, expected_error);
				assert.areEqual(err.message, mongoDB.no_connection_err);
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			test.complete(err);
		});
	},

	"Test if calling findAll results in an array of documents": function (test) {
		test.async(9000);

		var mongoDB = new MongoDB(createConfig(), _mongoDB);

		var steps = [
			function Connect_To_Database(next) {
				mongoDB.connect(next);
			},
			function Insert_Document(next, err) {
				assert.hasNoValue(err, expected_error);

				mongoDB.save({"name": "test 1"}, next);
			},
			function Insert_Document(next, err) {
				assert.hasNoValue(err, expected_error);

				mongoDB.save({"name": "test 2"}, next);
			},
			function FindByKey_Query(next) {
				mongoDB.findAll(next);
			},
			function Assert_Error_Occured(next, err, foundDocumentList) {
				assert.hasNoValue(err, expected_no_error);
				assert.hasValue(foundDocumentList, "Expected the foundDocumentList to have value.");
				assert.isInstanceOf(Array, foundDocumentList, "Expected the foundDocumentList to be an Array.");
				next();
			}];

		test.steps(steps).on("complete", function (err) {
			if (err) {
				throw err;
			}
			mongoDB.drop(function (err) {
				if (err) {
					throw err;
				}
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


