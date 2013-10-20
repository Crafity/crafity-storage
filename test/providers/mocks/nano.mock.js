/*jslint node:true, white:true, evil: true */
"use strict";

var _servers = { "http://test:test@localhost:5984/": {} };

/* Console output */
var verbose = false;

function nanoMock(url) {
	function isServerUnavailable(callback) {
		if (url.split("@")[1] !== "localhost:5984/") {
			process.nextTick(function () {
				callback(new Error("Server '" + url + "' not found."));
			});
			return true;
		}
		if (url.indexOf("/test:test@") === -1) {
			process.nextTick(function () {
				callback(new Error("Name or password is incorrect."));
			});
			return true;
		}
		return false;
	}

	var _databases = _servers[url];
	return {
		db: {
			destroy: function (database, callback) {
				if (isServerUnavailable(callback)) { return null; }
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
				if (isServerUnavailable(callback)) { return; }
				if (verbose) { console.log("Create database '" + database + "'"); }
				_databases[database] = [];
				_databases[database].history = [];
				process.nextTick(callback);
			},
			use: function (database) {
				if (verbose) { console.log("Use database '" + database + "'"); }
				function isDatabaseUnavailable(callback) {
					if (!_databases[database]) {
						process.nextTick(function () {
							callback(new Error("Database '" + database + "' not found."));
						});
						return true;
					}
					return false;
				}

				var db = {
					bulk: function (data, callback) {
						if (isServerUnavailable(callback)) { return; }
						if (isDatabaseUnavailable(callback)) { return; }
						var docs = JSON.parse(JSON.stringify(data)).docs;
						docs.forEach(function (doc) {
							if (doc._id) { return; }
							doc._id = Math.round(Math.random() * 9) + 'a04d1eded7ea3c389b5680c36049a3' + Math.round(Math.random() * 9);
							doc._rev = '1-15f65339921e497348be384867bb940f';
						});
						_databases[database] = docs;
						_databases[database].history = [];
						
						docs.slice(0).forEach(function (doc) {
							if (!doc._deleted) { return; }
							_databases[database].splice(_databases[database].indexOf(doc), 1);
						});
						if (verbose) { console.log("Bulk load data '" + JSON.stringify(data) + "'"); }
						process.nextTick(function () {
							callback(null, JSON.parse(JSON.stringify(docs)).map(function (doc) {
								return { id: doc._id, rev: doc._rev };
							}));
						});
					},
					"list": function (params, callback) {
						if (isServerUnavailable(callback)) { return; }
						if (isDatabaseUnavailable(callback)) { return; }
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
						if (isServerUnavailable(callback)) { return; }
						if (isDatabaseUnavailable(callback)) { return; }
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
					"get": function (id, params, callback) {
						if (isServerUnavailable(callback)) { return; }
						if (isDatabaseUnavailable(callback)) { return; }
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

							//if (params.keys && params.keys.length === 1) {
							rows = rows.filter(function (row) {
								if (params && params.rev) {
									return row._id === id && row._rev === params.rev;
								}
								return row._id === id;
							});
							if (rows.length === 0) {
								rows = _databases[database].history.filter(function (row) {
									if (params && params.rev) {
										return row._id === id && row._rev === params.rev;
									}
									return row._id === id;
								});
							}
							if (rows.length === 1) {
								return callback(null, rows[0]);
							}
							var err = new Error("Unexpected error");
							err.status_code = 404;
							return callback(err);
						});
					},
					"insert": function (data, rev, callback) {
						if (isServerUnavailable(callback)) { return; }
						if (isDatabaseUnavailable(callback)) { return; }
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

						var randomInt = function () { return Math.round(Math.random() * 9); };
						result = { ok: true,
							id: data._id || randomInt() + 'a0' + randomInt()  + 'd1eded' + randomInt()  + 'ea3c389b5680c36049a3' + randomInt(),
							rev: newRev
						};
						clone._rev = newRev;
						clone._id = clone._id || result.id;

						if (verbose) { console.log("Insert new data", clone); }

						var existingItems = _databases[database].filter(function (item) {
							return item._id === clone._id;
						});
						_databases[database].history = _databases[database].history.concat(existingItems);
						existingItems.forEach(function (item) {
							_databases[database].splice(_databases[database].indexOf(item), 1);
						});
						_databases[database].push(clone);
						process.nextTick(function () {
							return callback(null, result);
						});
					},
					"destroy": function (id, rev, callback) {
						if (isServerUnavailable(callback)) { return; }
						if (isDatabaseUnavailable(callback)) { return; }
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
						if (isServerUnavailable(callback)) { return; }
						if (isDatabaseUnavailable(callback)) { return; }
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
								if (params.include_docs) {
									return { id: doc._id, key: _key, value: _value, doc: doc };
								}								
								return { id: doc._id, key: _key, value: _value };
							}).filter(function (emitted) {
									return emitted.key === params.keys[0];
								});
							var body = { rows: matches };
							body.total_rows = _databases[database].length;
							body.offset = 0;
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
