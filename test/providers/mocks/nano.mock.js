/*jslint node:true, white:true, evil: true */
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
				if (!_databases[database]) {
					return process.nextTick(function () {
						callback(new Error("Database '" + database + "' not found."));
					});
				}
				delete _databases[database];
				return process.nextTick(callback);
			},
			create: function (database, callback) {
				if (verbose) { console.log("Create database '" + database + "'"); }
				_databases[database] = [];
				process.nextTick(callback);
			},
			use: function (database) {
				if (verbose) { console.log("Use database '" + database + "'"); }
				var db = {
					bulk: function (data, callback) {
						var docs = JSON.parse(JSON.stringify(data)).docs;
						docs.forEach(function (doc) {
							if (doc._id) { return; }
							doc._id = Math.round(Math.random() * 9) + 'a04d1eded7ea3c389b5680c36049a3' + Math.round(Math.random() * 9);
							doc._rev = '1-15f65339921e497348be384867bb940f';
						});
						_databases[database] = docs;
						docs.slice(0).forEach(function (doc) {
							if (!doc._deleted) { return; }
							_databases[database].splice(_databases[database].indexOf(doc), 1);
						});
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
							if (!rows) { return callback(new Error("Database '" + database + "' not found.")); }
							if (verbose) { console.log("Fetch data with params '" + JSON.stringify(params) + "'"); }

							if (params.keys && !(params.keys instanceof Array)) {
								callback("The parameters keys must be an array");
							}

							if (params.keys && params.keys.length === 1) {
								rows = rows.filter(function (row) {
									return row._id === params.keys[0];
								});
							}
							if (params.include_docs) {
								rows = rows.map(function (row) {
									return { id: row._id, rev: row._rev, doc: row };
								});
							}
							return callback(null, { rows: rows });
						});
					},
					"insert": function (data, rev, callback) {
						if (typeof rev === "function") {
							callback = rev;
							rev = undefined;
						}
						var result;
						var revParts;
						var newRev = '1-15f65339921e497348be384867bb940f';
						var clone = JSON.parse(JSON.stringify(data));

						if (data._rev) {
							revParts = data._rev.split("-");
							newRev = (parseInt(revParts[0], 10) + 1).toString() + "-" + revParts[1];
						}

						result = { ok: true,
							id: data._id || Math.round(Math.random() * 9) + 'a04d1eded7ea3c389b5680c36049a3' + Math.round(Math.random() * 9),
							rev: newRev
						};
						clone._rev = newRev;
						clone._id = clone._id || result.id;

						if (verbose) { console.log("Insert new data", clone); }

						var existingItems = _databases[database].filter(function (item) {
							return item._id === clone._id;
						});
						existingItems.forEach(function (item) {
							_databases[database].splice(_databases[database].indexOf(item), 1);
						});
						_databases[database].push(clone);
						process.nextTick(function () {
							return callback(null, result);
						});
					},
					"destroy": function (id, rev, callback) {
						process.nextTick(function () {
							var existingItems = _databases[database].filter(function (item) {
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
					},
					"view": function (designName, viewName, params, callback) {
						// Find the right view
						db.fetch({ keys: [ "_design/" + designName ] }, function (err, designs) {
							if (err) { throw err; }
							if (!designs || !designs.rows || designs.rows.length !== 1) { throw new Error('Cannot find the design'); }
							var view = designs.rows[0].views[viewName];
							var mapString = view.map;
							var mapFunc = new Function("emit=arguments[0]; return " + mapString + ";");
							var matches = _databases[database].map(function (doc) {
								var _key, _value;
								mapFunc(function (key, value) {
									_key = key;
									_value = value;
								})(doc);
								return { key: _key, value: _value };
							}).filter(function (emitted) {
									return emitted.key === params.keys[0];
								}).map(function (result) {
									return result.value;
								});
							var body = { rows: matches };
							return callback(err, body);
						});
					}
				};
				return db;
			}
		}
	};
}

module.exports = nanoMock;
module.exports.__servers = _servers;
