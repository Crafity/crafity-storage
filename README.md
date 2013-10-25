#Crafity Storage [![Dependency status](https://david-dm.org/crafity/crafity-storage.png)](https://david-dm.org/crafity/crafity-storage) [![Travis Build Status](https://travis-ci.org/Crafity/crafity-storage.png?branch=master)](https://travis-ci.org/Crafity/crafity-storage) [![NPM Module version](https://badge.fury.io/js/crafity-storage.png)](http://badge.fury.io/js/crafity-storage)

##Sample Code

	var storage = require('crafity-storage');
	// TODO ...
	
Details to come...

##Common Provider Interface

###Prototype
var EventEmitter = require('events').EventEmitter;

###Provider.create([callback])
Creates a new database in the underlying data store

* @param {Function} [callback] The function to call when the database is created
* @throws {Error} Not implemented error

###Provider.drop([callback])
Drops an existing database from the underlying data store

* @param {Function} [callback] The function to call when the database is dropped
* @throws {Error} Not implemented error

###Provider.recreate([callback])
Create a new database by dropping and creating a new database

* @param callback The callback to call when the DB is recreated
* @throws {Error} Not implemented error

###Provider.isConnected()
Check if the provider is connected to the underlying data store.

###Provider.connect([callback])
Connect to the underlying data store.

* @param {Function} [callback] The function to call when connected
* @throws {Error} Not implemented error

###Provider.disconnect([callback])
Disconnect from the underlying data store

* @param {Function} [callback] The function to call when disconnected
* @throws {Error} Not implemented error

###Provider.dispose([callback])
Dispose all the underlying resources (e.g. statefull connections)

* @param {Function} [callback] The function to call when resources are disposed
* @throws {Error} Not implemented error

###Provider.save(data, [callback])
Save data to the underlying data store

* @param {Object} data The data to save
* @param {Function} [callback] The function to call when the data is saved
* @throws {Error} Not implemented error

###Provider.saveMany(data, [callback])
Save many item to the underlying data store at the same time

* @param {Array} data The data to store
* @param {Function} [callback] The function to call when the data is saved
* @throws {Error} Not implemented error

###Provider.remove(data, [callback])
Remove data from the underlying data store
* @param {Object} data The data to remove
* @param {Function} [callback] The function to call when the data is removed
* @throws {Error} Not implemented error

###Provider.removeMany(data, [callback])
Remove many items from the underlying data store

* @param {Array} data The data to remove
* @param {Function} [callback] The function to call when the data is removed
* @throws {Error} Not implemented error

###Provider.findByKey(key, [callback])
Find data by key from the underlying data store

* @param {Object} key The key of the data to fetch
* @param {Function} [callback] The function to call when the data is fetched
* @throws {Error} Not implemented error

###Provider.findManyByKey(key, [callback])
Find data using a key from the underlying data store

 * @param {String|Number} key The key of the data to fetched
 * @param {Function} [callback] The function to call when the data is fetched
 * @throws {Error} Not implemented error

###Provider.findById(id, rev, [callback])
Find data by id in the underlying data store

* @param {String} id The Id of the data to fetched
* @param {String} [rev] The Id of the data to fetched
* @param {Function} [callback] The function to call when the data is fetched
* @throws {Error} Not implemented error

###Provider.findAll([callback])
Find all the data from the underlying data store

* @param {Function} [callback] The function to call when the data is fetched
* @throws {Error} Not implemented error
