#!/bin/bash

## Run JSLint and all the Unit Tests

export CurrentDir=`pwd`
export ScriptDir="`pwd`/`dirname $0`"
export RootDir="$ScriptDir/.."
export TestDir="$RootDir/test"
export ErrorCode=0

cd $RootDir
export RootDir="`pwd`"
export projectName="`basename $RootDir`"
cd $CurrentDir

if [ "$WATCH" != "" ]; then
	touch .nodemonignore
	nodemon -x "$ScriptDir/npm-test-jstest.sh" -w "$RootDir"
else
	$ScriptDir/npm-test-jstest.sh
	export ErrorCode=$?
	if [ "0" != "$ErrorCode" ]; then
		exit $ErrorCode
	fi
fi

exit $ErrorCode
