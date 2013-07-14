/*jslint node:true, white:true */

var couchClient = require('couch-client')
  , connectNano = require('nano')
  , core = require('crafity-core')
  , fs = require('crafity-filesystem')
  , objects = core.objects;

function CouchDB(config) {
  "use strict";

  if (!config) {
    throw new Error("Expected a CouchDB configuration");
  }

  if (!config.url) {
    throw new Error("Expected a url in the CouchDB configuration");
  }
  if (!config.database) {
    throw new Error("Expected a database name in the CouchDB configuration");
  }
  if (!config.design) {
    throw new Error("Expected a design document name in the CouchDB configuration");
  }
  if (!config.view) {
    throw new Error("Expected a view name in the CouchDB configuration");
  }

  this.name = config.name;
  this.type = "CouchDB";

  if (!/\/$/.test(config.url)) {
    config.url += "/";
  }

  var self = this
    , nano = connectNano(config.url)
    , couch = couchClient(config.url + config.database);

  nano.db.use(config.database);

  this.connect = function (callback) {
    process.nextTick(function () {
      callback(null, null);
    });
  };

  this.disconnect = function (callback) {
    process.nextTick(function () {
      callback(null, null);
    });
  };

  this.dispose = function (callback) {
    // Clean up stuff!
    process.nextTick(function () {
      callback && callback(null, null);
    });
  };

  this.save = function save(item, callback) {
    if (!item) { throw new Error("Can not save null or undefined"); }
    couch.save(item, callback);
  };

  function fetch(doc_names, params, callback) {
    if (typeof params === "function") {
      callback = params;
      params = {};
    }
    params.include_docs = true;
    return nano.relax({db: config.database, path: "_all_docs", method: "POST", params: params, body: doc_names}, callback);
  }

  this.getByName = function getByName(name, callback) {
    return self.getByKey(name, callback);
  };

  this.getByKeys = function getByKey(keys, callback) {
    fetch({ "keys": keys }, callback);
  };

  this.getByKey = function getByKey(key, callback) {

    if (!callback) { callback = new Function(); }
    if (!key) { return callback(new Error("Argument key is null or undefined")); }

    try {

      var criteria = { "key": key, "include_docs": true };

      couch.view(
        '/' + config.database + '/_design/' + config.design + '/_view/' + config.view,
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
    } catch (err) {
      callback(err, null);
    }
  };

  this.getById = function getById(id, callback) {
    if (!id) { return callback(new Error("Can not get one null or undefined"), null); }
    couch.request('GET', '/' + config.database + '/' + id + "?include_docs=true", callback);
  };

  this.getSpecificOne = function getSpecificOne(criteria, callback) {
    if (!criteria) { return callback(new Error("Can not get one null or undefined")); }
    couch.view(
      '/' + config.database + '/_design/' + config.design + '/_view/' + config.view,
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
  };

  this.getMany = function (criteria, callback) {
    if (!criteria.include_docs) {
      criteria.include_docs = true;
    }
    couch.view(
      '/' + config.database + '/_design/' + config.design + '/_view/' + config.view,
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
  };

  this.getAll = function (callback) {
    return couch.request('GET', '/' + config.database + '/_all_docs' + "?include_docs=true", function (err, result) {
      if (err) {return callback(err); }
      callback(null, result.rows.map(function (row) {
        return row.doc;
      }));
    });
  };

  this.remove = function (item, callback) {
    if (!item) {
      throw new Error("Can not remove null or undefined");
    }
    couch.remove(item, callback);
  };

  this.view = function (view, criteria, callback) {
    return couch.view(
      '/' + config.database + '/_design/' + config.design + '/_view/' + view,
      criteria, callback);
  };
}

CouchDB.use = function (config, useFn) {
  "use strict";
  var couchDB = new CouchDB(config)
    , result = useFn.call(couchDB, couchDB);
  couchDB.dispose();
  return result;
};

module.exports = CouchDB;
module.exports.MongoDB = CouchDB;
