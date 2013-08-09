/*jslint node:true, white: true*/
require("../test/package.test.js").on("complete", function () {
  require("../test/crafity.storage.test.js"); 
});

//require('./test/crafity.storage.test');
//require('./test/providers/CouchDB.test');
//require('./test/providers/MongoDB.test');
//require('./test/candidates.test');
//setTimeout(function () { process.exit(0); }, 1000);

