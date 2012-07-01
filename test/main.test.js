/*jslint node:true, bitwise: true, unparam: true, maxerr: 50, white: true, nomen: true */

/**
 * Test dependencies.
 */
var jstest = require('crafity.jstest')
	, assert = jstest.assert
	, context = jstest.createContext();

(function () {
	"use strict";

	// Print out the name of the test module
	console.log("Testing 'main.js'... ");

	/**
	 * The tests
	 */

	var tests = {
		"When attach is called on an App object Then the App must have the storage module as a property": function () {
			var storage = require('../main.js')
				, app = {};

			storage.attach(app);

			assert.areEqual(app.storage, storage, "Expected the storage module");
		},
		"When attach is called on an App object Then the App must have a databases property": function () {
			var storage = require('../main.js')
				, app = {};

			storage.attach(app);

			assert.hasValue(app.databases, "Expected a databases object");
		},
		"When attach is called on an App object with database configured Then the App must have the databases as a property": function () {
			var storage = require('../main.js')
				, app = {}
				, config = {
					"connections": {
						"connection1": {
							"provider": "couchdb",
							"url": "http://username:password@hostname:port/databasename"
						},
						"connection2": {
							"provider": "mongodb",
							"url": "mongodb://username:password@hostname:port/databasename",
							"collection": "collection1"
						},
						"connection3": {
							"provider": "mongodb",
							"url": "mongodb://username:password@hostname:port/databasename",
							"collection": "collection2"
						}
					},
					"repositories": {
						"path": "./repositories/",
						"names": [ "repo1", "repoX" ]
					}
				};

			storage.connect = function (url, database, path) {
				assert.areEqual("http:database", url, "Expected another url");
				assert.areEqual("database", database, "Expected another database");
				assert.areEqual("path:", path, "Expected another path");

				console.log("Connect is called");
				return { open: function () {
					console.log("Open is called");
					return {};
				}};
			};

			storage.attach(app, config);

			console.log("app", app);

			assert.hasValue(app.databases.test, "Expected the test databases object");
		}
	};

	/**
	 * Run the tests
	 */

	context.run(tests);

}())
