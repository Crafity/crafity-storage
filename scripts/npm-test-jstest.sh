#!/bin/sh
$ScriptDir/npm-jslint.sh
export ErrorCode=$?
if [ "0" != "$ErrorCode" ]; then
	exit $ErrorCode
fi

node ./test/package.test.js
export ErrorCode=$?
if [ "0" != "$ErrorCode" ]; then
	export FailedTest=1
fi

node ./test/providers/FileSystem.test.js
export ErrorCode=$?
if [ "0" != "$ErrorCode" ]; then
	export FailedTest=1
fi
exit $FailedTest


#require('./test/crafity.storage.test');
#require('./test/providers/CouchDB.test');
#require('./test/providers/MongoDB.test');
#require('./test/candidates.test');
#setTimeout(function () { process.exit(0); }, 1000);
