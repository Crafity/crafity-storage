/*jslint node:true, white: true*/
"use strict";

require("../test/package.test.js").on("complete", function () {
  require("../test/providers/Provider.test.js").on("complete", function () {
    require("../test/providers/CouchDB.Provider.test.js").on("complete", function () {
      //require("../test/crafity.storage.test.js");
      return false;
    });
  });
});

//require('./test/crafity.storage.test');
//require('./test/providers/CouchDB.test');
//require('./test/providers/MongoDB.test');
//require('./test/candidates.test');
//setTimeout(function () { process.exit(0); }, 1000);

