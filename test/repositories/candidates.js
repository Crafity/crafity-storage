/*jslint node:true, white: true*/

module.exports = function Candidates(name, provider) {
	"use strict";

	var self = this
		, EARTH_RADIUS = 6378000; // in meters;

	this.provider = provider;
	this.name = name;

	/**
	 * Get candidate by technical id will provide the candidate document.
	 * @param couchId
	 * @param callback
	 */
	this.getCandidateById = function (id, callback) {

		if (!id) { throw new Error("No id has been given."); }

		provider.getById(id, function (err, fetchedCandidate) {
			if (err) { callback(err, null); }
			callback(null, fetchedCandidate);
		});
	};

	/**
	 * Get candidate by couchId will provide the candidate document.
	 * @param couchId
	 * @param callback
	 */
	this.getCandidateByCouchId = function (couchId, callback) {
		if (!couchId) { throw new Error("No couchId has been given."); }

		provider.getByKey({couchId: couchId}, function (err, fetchedRecords) {
			if (err) { callback(err, null); }

			callback(null, fetchedRecords[0]);
		});
	};

	/**
	 * Get all candidate documents from database.
	 * @param callback
	 */
	this.getAllCandidates = function (callback) {
		provider.getAll(callback);
	};

	/**
	 * Get nearby candidates according to search tag word.
	 * Example:
	 * a) search for max "N"
	 * b) people with tag "owner"
	 * c) inside "X" km radius of the
	 * d) given locaiton "lon-lat"
	 *
	 * @param location
	 * @param searchTag
	 * @param maxResults
	 * @param maxRangeKm
	 * @param callback
	 */
	this.getAllNearbyCandidatesWithTag = function (location, searchTag, maxResults, maxRangeKm, callback) {

		if (!location) { throw new Error("Cannot search without location center."); }
		if (!searchTag) { throw new Error("Cannot search without search tag."); }

		var options = {
			locationCenter: location,
			maximumResults: (!maxResults) ? 10 : maxResults,
			maximumRange: (!maxRangeKm) ? 100000 : maxRangeKm,
			query: { tags: { $regex: "" + searchTag} }
		};

		provider.geoSearch(options, function (err, candidates) {

			var foundCandidates = candidates.map(function (element) {

				if ((element.dis * EARTH_RADIUS) / 1000 < 1) {
					element.distance = Math.round(element.dis * EARTH_RADIUS) + " m";
				} else {
					element.distance = Math.round((element.dis * EARTH_RADIUS) / 1000) + " km";
				}

				return element;
			});
			callback(null, foundCandidates);
		});
	};	
	
	/**
	 * Get nearby candidates according to search tag word excluding keys.
	 * Example:
	 * a) search for max "N"
	 * b) people with tag "owner"
	 * c) excluding key "12sjdjf4r732gfbglh07890"
	 * d) inside "X" km radius of the
	 * e) given locaiton "lon-lat"
	 *
	 * @param location
	 * @param searchTag
	 * @param maxResults
	 * @param maxRangeKm
	 * @param callback
	 */
	this.getAllNearbyCandidatesWithTagExcludingKeys = function (location, searchTag, keyArray, maxResults, maxRangeKm, 
		callback) {

		console.log("keyArray", keyArray);
		
		if (!location) { throw new Error("Cannot search without location center."); }
		if (!searchTag) { throw new Error("Cannot search without search tag."); }

		var options = {
			locationCenter: location,
			maximumResults: (!maxResults) ? 10 : maxResults,
			maximumRange: (!maxRangeKm) ? 100000 : maxRangeKm,
			query: { tags: { $regex: "" + searchTag }, couchId : { $nin: keyArray} }
		};
		
		provider.geoSearch(options, function (err, candidates) {

			console.log("candidates", candidates);
			console.log("err", err);
			var foundCandidates = candidates.map(function (element) {

				if ((element.dis * EARTH_RADIUS) / 1000 < 1) {
					element.distance = Math.round(element.dis * EARTH_RADIUS) + " m";
				} else {
					element.distance = Math.round((element.dis * EARTH_RADIUS) / 1000) + " km";
				}

				return element;
			});
			callback(null, foundCandidates);
		});
	};

	/**
	 * The save candidate method will replace the whole candidate object as long as
	 * it doesn't violate the model restrictions (e.g. couchId must be unique)
	 * @param candidate
	 * @param callback
	 * @return {*}
	 */
	this.saveCandidate = function (candidate, callback) {

		if (!candidate) { return callback(null, null); }

		try {
			provider.save(candidate, callback);
		}
		catch (err) {
			return callback(err);
		}

//		getCollection(function (err, collection) {
//			if (err) { return callback(err); }
//
//			try {
//
//				
//
//				// args: selector, set values, options, callback
//				var query = collection.update(
//					{ couchId: candidate.couchId },
//					{ $set: {lonLat: candidate.lonLat, timeStamp: candidate.timeStamp, tags: candidate.tags } },
//					{ $upsert: true },
//					{ safe: true },
//
//					function (err, res) {
//						if (err) { return callback(err); }
//						else {
//							return callback(null, res);
//						}
//					}
//				);
//
//			}
//			catch (err) {
//				return callback(err)
//			}
//		});

	};

	/**
	 * The saveCandidates method will save a list of candidates.
	 * @param candidate
	 * @param callback
	 * @return {*}
	 */
	this.saveCandidates = function (candidates, callback) {

		if (!candidates) { return callback(null, null); }

		try {
			provider.save(candidates, callback);
		}
		catch (err) {
			return callback(err);
		}
	};

	/**
	 * The responsibility of this repository is to look after the fields that need
	 * to be updated. They must exist.
	 * @param candidate
	 * @param callback
	 * @return {*}
	 */
	this.updateCandidateTags = function (candidate, callback) {

		if (!candidate) { throw new Error("No candidate has been passed by to update."); } //return callback(null, null); }
		if (!candidate.couchId) { throw new Error("Cannot update candidate's tags if there is no key."); }
		if (!candidate.tags || candidate.tags.length === 0) { throw new Error("Cannot update candidate's tags if there are no tags."); }

		var updateParameters = {
			selector: { couchId: candidate.couchId },
			updateValues: { tags: candidate.tags }
		};

		provider.update(updateParameters, callback);

	};

};


