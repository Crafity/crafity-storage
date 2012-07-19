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
	, MongoDB = require('../lib/providers/MongoDB.js')
	, Candidates = require('../test/repositories/candidates.js')
	, assert = jstest.assert
	, context = jstest.createContext()
	, db = require("./providers/data/mongo.database")
	;

(function () {
	"use strict";

	console.log("Testing 'candidates.test.js' in crafity-storage... ");

	var config = {
			name: "candidates",
			"connection": {
				"name": "Geo",
				"url": "mongodb://localhost/candidates-test",
				"collection": "candidates"
			}
		}
		;

	function runTests(err) {
		if (err) { throw err; }

		/**
		 * The tests
		 */
		var tests = {

			"candidates---> When calling saveCandidate on a non-existing cadidate Then the saved candidate must be returned": function (context) {
				context.async(3000);

				var repository = new Candidates(config.name, new MongoDB(config.connection))
					, newCandidate = {
						name: "Bonnie Kaizer",
						lonLat: [4.642537, 52.382426 ],
						timeStamp: new Date(),
						tags: [ "director", "owner", "photographer", "dev", "Haarlem" ],
						couchId: "0efd063f8ae64c5cdaa7bf5641020000"
					};

				repository.saveCandidate(newCandidate, function (err, candidate) {
					context.complete(err, candidate);
				});

				context.onComplete(function (err, results) {
					if (err) { throw err; }

					var savedCandidate = results[0];

					assert.hasValue(savedCandidate, "Expected the inserted candidate to be returned.");

				});
			},

			"candidates---> When calling saveCandidates on a non-existing cadidate Then the saved candidate must be returned": function (context) {
				context.async(3000);

				var repository = new Candidates(config.name, new MongoDB(config.connection))
					, newCandidates = [
						{
							name: "Noa Gina",
							lonLat: [4.642537, 52.382426 ],
							timeStamp: new Date(),
							tags: [ "artist", "photographer", "singer" ],
							couchId: "0efd063f8ae64c5cdaa7bf5641020001"
						},
						{
							name: "Agent Mulder",
							lonLat: [ 5.290549, 52.056598 ],
							timeStamp: new Date(),
							tags: [ "friend", "dev" ],
							couchId: "e90ef2741577d7bbe8663ac48904b00c"
						},
						{
							name: "Groningse Vent",
							lonLat: [ 6.566502, 53.219384 ],
							timeStamp: new Date(),
							tags: [ "city", "Groningen", "photographer" ],
							couchId: "e90ef2741577d7bbe8663ac48900ed36"
						}
					];

				repository.saveCandidate(newCandidates, function (err, candidate) {
					context.complete(err, candidate);
				});

				context.onComplete(function (err, results) {
					if (err) { throw err; }

					var savedCandidates = results[0];
//				console.log("savedCandidates", savedCandidates);

					assert.hasValue(savedCandidates, "Expected the inserted candidate to be returned.");

				});
			},

			"candidates---> When calling getAllCandidates Then the all candidates must be returned": function (context) {
				context.async(3000);

				var repository = new Candidates(config.name, new MongoDB(config.connection));

				repository.getAllCandidates(function (err, candidates) {

					context.complete(err, candidates);
				});

				context.onComplete(function (err, results) {
					if (err) { throw err; }
					var candidates = results[0];

					assert.hasValue(candidates, "Expected the fetched candidates to be returned");
					assert.areEqual(7, candidates.length, "Expected 7 fetched candidates");

				});
			},

			"candidates---> When calling updateCandidateTags on an existing candidate Then the candidate must be updated and 1 returned": function (context) {
				context.async(3000);

				var repository = new Candidates(config.name, new MongoDB(config.connection))
					, couchId = "6ef4c7aebd221ef1f6079533db000010"
					, id;

				repository.getCandidateByCouchId(couchId, function (err, candidate) {
					id = candidate._id;

					candidate.tags = ["gardener", "tree lover"];

					repository.updateCandidateTags(candidate, function (err, updateCount) {
						repository.getCandidateById(id, function (err, fetchedGalina) {

							context.complete(err, updateCount, fetchedGalina);
						});
					});
				});

				context.onComplete(function (err, results) {
					if (err) { throw err; }
					var updateCount = results[0]
						, fetchedGalina = results[1];

					assert.areEqual(1, updateCount, "Expected one record to be updated");

					assert.hasValue(fetchedGalina, "Expected the fetched object to be returned");
					assert.areEqual(["gardener", "tree lover"], fetchedGalina.tags, "Expected the fetched object to have different tags");
					assert.areEqual(id, fetchedGalina._id, "Expected the fetched object to have an _id");

				});
			},

			"candidates---> When calling getAllNearbyCandidatesWithTag on an existing candidate Then a collection of one or more candidates must be returned": function (context) {
				context.async(3000);

				var repository = new Candidates(config.name, new MongoDB(config.connection))
					, location = [ 4.895168, 52.370216 ] // A'dam
					, searchTag = "photographer";

				repository.getAllNearbyCandidatesWithTag(location, searchTag, null, null, function (err, candidates) {
					context.complete(err, candidates);
				});

				context.onComplete(function (err, results) {
					if (err) { throw err; }

					var neighbours = results[0];
//				console.log("neighbours", neighbours);		
					assert.hasValue(neighbours, "Expected the candidates to be returned");

				});
			},
			
			"candidates---> When calling getAllNearbyCandidatesWithTagExcludingKeys on an existing candidate Then a collection of one or more candidates must be returned": function (context) {

				context.async(3000);

				var repository = new Candidates(config.name, new MongoDB(config.connection))
					, location = [ 4.895168, 52.370216 ] // A'dam
					, searchTag = "photographer"
					, keyArray = ["0efd063f8ae64c5cdaa7bf5641020000", "0efd063f8ae64c5cdaa7bf5641020001"];
				

				repository.getAllNearbyCandidatesWithTagExcludingKeys(location, searchTag, keyArray, null, null, function (err, candidates) {
					context.complete(err, candidates);
				});

				context.onComplete(function (err, results) {
					if (err) { throw err; }

					var neighbours = results[0];
				console.log("neighbours", neighbours);		
					assert.hasValue(neighbours, "Expected the candidates to be returned");

				});
			}
		};

		/**
		 * Run the tests
		 */
		context.onComplete.subscribe(function () {
			destroyDb(config.connection, function (err) {
				if (err) { throw err; }
				setTimeout(function () {
					process.exit(0);
				}, 10);
			});
		});
		context.run(tests);
	}

	function initDb(config, callback) {
		db.create(config, callback);
	}

	function destroyDb(config, callback) {
		db.drop(config, callback);
	}

	initDb(config.connection, runTests);

}());

