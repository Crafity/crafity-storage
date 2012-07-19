/*jslint node:true, white:true */
/*!
 * package.test - package.json tests
 * Copyright(c) 2011 Crafity
 * Copyright(c) 2012 Galina Slavova
 * Copyright(c) 2012 Bart Riemens
 * MIT Licensed
 */

/**
 * Test dependencies.
 */
var jstest = require('crafity-jstest')
	, assert = jstest.assert
	, context = jstest.createContext()
	, fs = require('crafity-filesystem')
	, main
	;

(function packageTests() {
	"use strict";

	/**
	 * The tests
	 */
	var tests = {

		'package---> The module must have main.js file': function () {
			
			main = require('../main');
			assert.isDefined(main, "Expected main to be defined");
			assert.areEqual(main, main.__proto__, "Expected main to be the standard module");
		},

		'package---> The module must have a fullname': function () {
			assert.isDefined(main.fullname, "Expected fullname to be defined");
		},

		'package---> The module must have a version number': function () {
			assert.isDefined(main.version, "Expected version number to be defined");
		},

		'package---> The module must have package.json file': function (context) {
			fs.readFileSync("./package.json");
		},

		'package---> The module must have the same name as quoted in package.json': function () {

			var data = fs.readFileSync("./package.json")
				, json = JSON.parse(data.toString());

			assert.areEqual(json.name, main.fullname, "Expected module name to be the same in both places.");

		},

		'package---> The module must have the same version as quoted in package.json': function () {

			var data = fs.readFileSync("./package.json")
				, json = JSON.parse(data.toString());

			assert.isDefined(json.version, "Expected fs to be defined");
			assert.areEqual(main.version, json.version, "Expected the same module version!");
		}

	};

	/**
	 * Run the tests
	 */
	context.run(tests);

}());
