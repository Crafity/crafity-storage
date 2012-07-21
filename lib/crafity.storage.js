/*jslint node:true, white: true */
/*!
 * crafity-storage - Storage Provider
 * Copyright(c) 2012 Crafity
 * Copyright(c) 2012 Bart Riemens
 * Copyright(c) 2012 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var core = require('crafity-core')
	, objects = core.objects;

/**
 * The Storage constructor
 * @param config The configuration to use
 * @constructor
 */
function Storage(config) {
	"use strict";
	var self = this
		, configuration = config || {};

	this.getProvider = function getProvider(config) {
		var providerPath = __dirname + "/" + (configuration.providersPath || "provider") + "/" + config.type
			, ProviderConstructor;

		try {
			ProviderConstructor = require(providerPath);
		} catch (providerError) {
			throw new Error("Cannot find provider '" + config.type + "' in the following location '" + providerPath + "'");
		}

		return new ProviderConstructor(config);
	};

	this.loadRepository = function loadRepository(config, name) {

		if (!name) {
			throw new Error("Repository name is missing");
		}
		if (!config) {
			throw new Error("Configuration for repository '" + name + "' is missing");
		}
		if (!config.connection) {
			throw new Error("Configuration for repository '" + name + "' is missing a provider name");
		}
		if (!configuration.connections) {
			throw new Error("No connections specified in the configuration");
		}
		if (!configuration.connections[config.connection]) {
			throw new Error("Specified connection '" + config.connection + "' for repository '" + name + "' is not specified");
		}
		var repositoryPath = process.cwd() + "/" + configuration.repositoriesPath + "/" + name
			, connectionName = config.connection
			, connectionConfig = configuration.connections[connectionName]
			, RepositoryConstructor
			, repository
			, provider;

		connectionConfig.name = connectionName;
		provider = self.getProvider(connectionConfig);

		try {
			RepositoryConstructor = require(repositoryPath);
		} catch (repositoryError) {
			throw new Error("Cannot find repository '" + name + "' in the following location '" + repositoryPath + "'");
		}

		try {
			repository = new RepositoryConstructor(name, provider);
		} catch (err) {
			if (err instanceof Error && err.message === "object is not a function") {
				throw new Error("The repository '" + name + "' does not have a constructor.");
			} else {
				throw err;
			}
		}

		return repository;
	};

	this.loadRepositories = function loadRepositories(config, callback) {

		if (config instanceof Function && !callback) {
			callback = config;
			config = configuration;
		}

		configuration = objects.extend(config || configuration || {}, configuration);
		configuration.repositories = config.repositories || {};
		configuration.repositoriesPath = config.repositoriesPath || ".";
		configuration.providersPath = config.providersPath || ".";

		var repositories = {};

		try {
			if (!Object.keys(configuration.repositories).length) {
				throw new Error("There are no repositories configured");
			}

			repositories = objects.map(configuration.repositories, self.loadRepository);

			return process.nextTick(function () {
				callback(null, repositories);
			});

		} catch (err) {
			return process.nextTick(function () {
				callback(err);
			});
		}
	};
}

module.exports = new Storage(null);
module.exports.Storage = Storage;
