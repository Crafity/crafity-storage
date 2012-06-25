/*jslint bitwise: true, unparam: true, maxerr: 50, white: true, nomen: true */
/*globals couchClient, require, providers, module, exports, process */
/*!
 * crafity-storage - Abstract Storage Provider
 * Copyright(c) 2011 Crafity
 * Copyright(c) 2011 Bart Riemens
 * Copyright(c) 2011 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var couchClient = require('couch-client')
	, nano = require('nano')
	, core = require('crafity-core')
	, fs = require('crafity-filesystem')
	, objects = core.objects;

/**
 * List of loaded providers
 */

var providers = {};

/**
 * Connect to a Remote Repository Service
 * @param {String} url The url of the service to use
 */

exports.connect = function (url, database, path) {
	"use strict";

	if (providers[url]) { return providers[url]; }

	var provider = (providers[url] = {})
		, types = {};

	provider.url = url;
	provider.repositories = {};
	provider.couchClient = couchClient(url);
	provider.nano = nano(url);
	
	provider.open = function (name) {
		if (provider.repositories[name]) { return provider.repositories[name]; }
		var filePath = fs.combine(process.cwd(), path, name + ".js");
		return (provider.repositories[name] = require(filePath).init(provider));
	};

	provider.commands = {
		getOne: function (view, item, callback) {
			try {
				if (!item) {
					throw new Error("Can not get one null or undefined");
				}
				var criteria;
				if (!provider.types.validate(item)) {
					criteria = { "key": item, "include_docs": true };
				} else {
					criteria = { "key": item, "include_docs": true };
				}
				provider.couchClient.view(
					'/' + database + '/_design/' + view + '/_view/' + view,
					criteria,
					function (err, result) {
						if (err) {
							callback(err);
						} else if (result.error) {
							callback(new Error(result.error + ": " + result.reason), undefined);
						} else if (result.rows.length === 0) {
							callback(null, undefined);
						} else if (result.rows.length === 1) {
							callback(null, result.rows[0].doc);
						} else if (result.rows.length > 1) {
							callback(new Error("Got more than one result back from the server. " + JSON.stringify(result)));
						}
					}
				);
			} catch (err) { callback(err, null); }
		},
		getById: function (id, callback) {
			try {
				if (!id) {
					throw new Error("Can not get one null or undefined");
				}
				provider.couchClient.request('GET', '/' + database + '/' + id + "?include_docs=true",
					function (err, result) {
						if (err) {
							callback(err);
						} else { 
							callback(null, result);
						}
					}
				);
			} catch (err) { callback(err, null); }
		},
		getSpecificOne: function (view, criteria, callback) {
			try {
				if (!criteria) {
					throw new Error("Can not get one null or undefined");
				}
				provider.couchClient.view(
					'/' + database + '/_design/' + view + '/_view/' + view,
					criteria,
					function (err, result) {
						if (err) {
							callback(err);
						} else if (result.error) {
							callback(new Error(result.error + ": " + result.reason), undefined);
						} else if (result.rows.length === 0) {
							callback(null, undefined);
						} else if (result.rows.length === 1) {
							callback(null, result.rows[0]);
						} else if (result.rows.length > 1) {
							callback(new Error("Got more than one result back from the server. " + JSON.stringify(result)));
						}
					}
				);
			} catch (err) { callback(err, null); }
		},
		getMany: function (view, criteria, callback) {
			try {
				if (!criteria.include_docs) {
					criteria.include_docs = true;
				}
				provider.couchClient.view(
					'/' + database + '/_design/' + view + '/_view/' + view,
					criteria,
					function (err, result) {
						if (err) {
							callback(err);
						} else if (result.error) {
							callback(new Error(result.error + ": " + result.reason), undefined);
						} else if (result.rows.length === 0) {
							callback(null, undefined);
						} else if (result.rows.length > 0) {
							callback(null, result.rows.map(function (row) {
								return row;
							}));
						}
					}
				);
			} catch (err) { callback(err, null); }
		},
		getAll: function (view, callback) {
			provider.couchClient.view(
				'/' + database + '/_design/' + view + '/_view/' + view,
				{ "include_docs": true },
				function (err, result) {
					if (err) {
						callback(err);
					} else {
						callback(null, result.rows.map(function (row) {
							return row.doc;
						}));
					}
				}
			);
		},
		save: function (item, callback) {
			if (!item) {
				throw new Error("Can not save null or undefined");
			} else if (!provider.types.validate(item)) {
				throw new Error("Can not save an invalid '" + item.type + "'");
			}
			provider.couchClient.save(item, callback);
		},
		remove: function (item, callback) {
			if (!item) {
				throw new Error("Can not remove null or undefined");
			}
			if (!provider.types.validate(item)) {
				throw new Error("Can not remove an invalid '" + (item.type || typeof item) + "'");
			}
			provider.couchClient.remove(item, callback);
		},
		removeById: function (id, callback) {
			if (!id) {
				throw new Error("Argument 'id' can not be null or undefined");
			}
			provider.couchClient.remove(id, callback);
		}
	};

	provider.types = {
		register: function (typeInfo) {
			if (!typeInfo) {
				throw new Error("Type information is required");
			} else if (!typeInfo.name || !typeInfo.version || !typeInfo.view ||
				!typeInfo.create || !typeInfo.validate) {
				throw new Error("Type information is not correct. " +
					"{ name: ..., version: ..., view: ..., create: ..., validate: ... }");
			} else if (types[typeInfo.name] && types[typeInfo.name][typeInfo.version]) {
				throw new Error("Type '" + typeInfo.name + "' with version '" +
					typeInfo.version + "' is already registered.");
			}
			if (!types[typeInfo.name]) { types[typeInfo.name] = {}; }
			types[typeInfo.name][typeInfo.version] = typeInfo;
			if (typeInfo.version > (types[typeInfo.name].latestVersion || 0)) {
				types[typeInfo.name].latestVersion = typeInfo.version;
			}
		},
		create: function (typeInfo, item) {
			item = item || {};
			item.type = typeInfo.name;
			item.version = typeInfo.version;
			return item;
		},
		validate: function (item) {
			return item && item.type && item.version &&
				types[item.type] && types[item.type][item.version]
				&& types[item.type][item.version].validate(item);
		},
		get: function (name, version) {
			if (!types[name]) {
				throw new Error("Type '" + name + "' is not registered.");
			}
			version = version || types[name].latestVersion;
			if (!types[name][version]) {
				throw new Error("Type '" + name + "' with version '" +
					version + "' is not registered.");
			}
			return types[name][version];
		}
	};

	provider.create = function (type) {
		if (!type) { throw new Error("Please specify a type to create a new Storage Provider"); }
		if (typeof type === "string") {
			type = provider.types.get(type);
		} else if (type.name) {
			if (!types[type.name]) {
				provider.types.register(type);
			}
			type = provider.types.get(type.name);
		} else {
			throw new Error("Invalid type. Can not create a Storage Provider.");
		}

		return objects.extend(type.operations, {
			commands: provider.commands,
			create: function (item) {
				return type.create(provider.types.create(type, item));
			},
			getOne: function (profile, callback) {
				provider.commands.getOne(type.view, profile, callback);
			},
			getById: function (id, callback) {
				provider.commands.getById(id, callback);
			},
			getSpecificOne: function (criteria, callback) {
				provider.commands.getSpecificOne(type.view, criteria, callback);
			},
			getAll: function (callback) {
				provider.commands.getAll(type.view, callback);
			},
			getMany: function (criteria, callback) {
				provider.commands.getMany(type.view, criteria, callback);
			},
			save: provider.commands.save,
			remove: provider.commands.remove,
			removeById: provider.commands.removeById,
			couchClient: provider.couchClient,
			nano: provider.nano
		});
	};

	return provider;
};

exports.middleware = function (app) {
	"use strict";
	app.storage = module.exports;
	app.databases = {};
	if (app.config && app.config.webserver && app.config.webserver.storage) {
		objects.forEach(app.config.webserver.storage, function (server, servername) {
			if (server.url && server.path &&
				server.databases && server.databases.length) {
				server.databases.forEach(function (database) {
					app.databases[database] = exports.connect(server.url + server.database, server.database, server.path).open(database);
				});
			}
		});
	}
};
