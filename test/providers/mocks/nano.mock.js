/*jslint node:true, white:true */
"use strict";

var _servers = { "http://test:test@localhost:5984/": {} };

/* Console output */
var verbose = false;

function nanoMock(url) {
	if (!_servers[url]) {
		throw new Error("Server not found: '" + url + "'");
	}
	var _databases = _servers[url];
	return {
		db: {
			destroy: function (database, callback) {
				if (verbose) { console.log("Destroy database '" + database + "'"); }
				delete _databases[database];
				process.nextTick(callback);
			},
			create: function (database, callback) {
				if (verbose) { console.log("Create database '" + database + "'"); }
				_databases[database] = [];
				process.nextTick(callback);
			},
			use: function (database) {
				if (verbose) { console.log("Use database '" + database + "'"); }
				return {
					bulk: function (data, callback) {
						_databases[database] = JSON.parse(JSON.stringify(data)).docs;
						if (verbose) { console.log("Bulk load data '" + JSON.stringify(data) + "'"); }
						process.nextTick(function () {
							callback(null, JSON.parse(JSON.stringify(data.docs)));
						});
					},
					"list": function (params, callback) {
						if (typeof params === "function") {
							callback = params;
							params = {};
						}
						process.nextTick(function () {
							var rows = _databases[database];
							if (verbose) { console.log("List all data"); }
							if (params.include_docs) {
								rows = rows.map(function (row) {
									return { id: row._id, rev: row._rev, doc: row };
								});
							}
							callback(null, { rows: rows });
						});
					},
					"fetch": function (params, callback) {
						if (typeof params === "function") {
							callback = params;
							params = {};
						}
						process.nextTick(function () {
							var rows = _databases[database];
							if (verbose) { console.log("Fetch data with params '" + JSON.stringify(params) + "'"); }
							if (params.include_docs) {
								rows = rows.map(function (row) {
									return { id: row._id, rev: row._rev, doc: row };
								});
							}
							if (params.keys && params.keys.length === 1) {
								rows = rows.filter(function(row) {
									return row.id === params.keys[0];
								});
							}
							callback(null, { rows: rows });
						});
					},
					"insert": function (data, rev, callback) {
						if (typeof rev === "function") {
							callback = rev;
							rev = undefined;
						}
						process.nextTick(function () {
							var result;
							var revParts;
							var newRev = '1-15f65339921e497348be384867bb940f';
							var clone = JSON.parse(JSON.stringify(data));

							if (data._rev) {
								revParts = data._rev.split("-");
								newRev = (parseInt(revParts[0], 10) + 1).toString() + "-" + revParts[1];
							}
							result = { ok: true,
								id: data._id || '3a04d1eded7ea3c389b5680c36049a3a',
								rev: newRev
							};
							clone._rev = newRev;
							clone._id = clone._id || result.id;
							
							if (verbose) { console.log("Insert new data", clone); }
							
							var existingItems = _databases[database].filter(function(item) {
								return item._id === clone._id;
							});
							existingItems.forEach(function (item) {
								_databases[database].splice(_databases[database].indexOf(item), 1);
							});
							_databases[database].push(clone);
							callback(null, result);
						});
					},
					"destroy": function (id, rev, callback) {
						process.nextTick(function () {
							var existingItems = _databases[database].filter(function(item) {
								return item._id === id && item._rev === rev;
							});
							existingItems.forEach(function (item) {
								_databases[database].splice(_databases[database].indexOf(item), 1);
							});
							if (existingItems.length === 0) {
								callback(new Error("Item with id '" + id + "' and rev '" + rev + "' does not exist"));
							}
							callback(null, id, rev);
						});
					}
				};
			}
		}
	};
}

module.exports = nanoMock;
module.exports.__servers = _servers;
