/*jslint node: true, bitwise: true, unparam: true, maxerr: 50, white: true, stupid: true, evil: true */
"use strict";

/*!
 * crafity-storage - Crafity Storage
 * Copyright(c) 2013 Crafity
 * Copyright(c) 2013 Bart Riemens
 * Copyright(c) 2013 Galina Slavova
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var core = require('crafity-core')
  , objects = core.objects;

/**
 * The Storage Service constructor
 * @param [config] The configuration to use
 * @constructor
 */
module.exports = function StorageService(config) {

  var self = this
    , configuration = config || {};

  this.getProviderConstructor = function getProviderConstructor(config) {
    if (typeof config === "string") {
      config = configuration && configuration.providers && configuration.providers[config];
    }
    if (!config) {
      throw new Error("Argument config is required");
    }
    var providerPath = __dirname + "/" + (configuration.providersPath || "providers") + "/" + config.type
      , ProviderConstructor;

    try {
      ProviderConstructor = require(providerPath);
    } catch (providerError) {
      throw new Error("Cannot find provider '" + config.type + "' in the following location '" + providerPath + "'");
    }

    return ProviderConstructor;
  };

  this.getProvider = function getProvider(config) {
    if (typeof config === "string") {
      config = configuration && configuration.providers && configuration.providers[config];
    }
    if (!config) {
      throw new Error("Argument config is required");
    }
    var providerPath = __dirname + "/" + (configuration.providersPath || "providers") + "/" + config.type
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
      , connectionConfig = configuration.connections[config.connection]
      , RepositoryConstructor
      , repository
      , provider;

    connectionConfig.name = config.connection;
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
      }
      throw err;
    }

    return repository;
  };

  this.loadRepositories = function loadRepositories(config, callback) {

    if (config instanceof Function && !callback) {
      callback = config;
      config = configuration;
    }
    callback = callback || new Function();

    configuration = objects.extend(config || configuration || {}, configuration);
    configuration.repositories = config && (config.repositories || {});
    configuration.repositoriesPath = config && (config.repositoriesPath || ".");
    configuration.providersPath = config && (config.providersPath || ".");

    var repositories = {};

    if (!Object.keys(configuration.repositories).length) {
      return process.nextTick(function () {
        return callback(new Error("There are no repositories configured"));
      });
    }

    try {
      repositories = objects.map(configuration.repositories, self.loadRepository);

      return process.nextTick(function () {
        return callback(null, repositories);
      });
    } catch (err) {
      return process.nextTick(function () {
        return callback(err);
      });
    }
  };
};

module.exports.StorageService = module.exports;
