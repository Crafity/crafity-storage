#!/bin/sh
export CurrentDir=`pwd`
export ScriptDir="`pwd`/`dirname $0`"
export RootDir="$ScriptDir/.."
export TestDir="$RootDir/test"
export ErrorCode=0

if [ "$WATCH" != "" ]; then
	touch .nodemonignore
	nodemon -q -x "$ScriptDir/npm-test-jstest.sh" -w "$RootDir"
else
	$ScriptDir/npm-test-jstest.sh
	export ErrorCode=$?
	if [ "0" != "$ErrorCode" ]; then
		exit $ErrorCode
	fi
fi

exit $ErrorCode
