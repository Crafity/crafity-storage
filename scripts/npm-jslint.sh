#!/bin/sh

export ScriptsDir="`dirname $0`"
export RootDir="$ScriptsDir/.."
export CurrentDir=`pwd`

node -e "require('crafity-jstest').jslint.scanDir('$RootDir');"
export ErrorCode=$?

if [ "0" != "$ErrorCode" ]; then
	exit $ErrorCode
fi
