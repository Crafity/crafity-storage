#!/bin/bash

#
# Execute JSLint and exit if failed
#
$ScriptDir/npm-jslint.sh
export ErrorCode=$?
if [ "0" != "$ErrorCode" ]; then
	exit $ErrorCode
fi

#
# Run tests by default with NodeJS
#
export runcommand='node'

#
# Check if code coverage needs and can be run
#
export ISTANBUL_LOCATION=`which istanbul`
if [[ "$COVER" != "" && "$ISTANBUL_LOCATION" == "" ]]; then
	echo "============================================"
	echo " PLEASE INSTALL ISTANBUL FOR CODE COVERAGE"
	echo ""
	echo "    $ npm install -g istanbul"
	echo "============================================"
fi
if [[ "$COVER" != "" && "$ISTANBUL_LOCATION" != "" ]]; then
	# Run the tests with Istanbul instead of NodeJS
	export runcommand='istanbul cover';
	
	# Set the project specific log dir
fi

#
# Run the tests
#
$runcommand $ScriptDir/npm-test.js
export ErrorCode=$?

#
# Copy the coverage data to the log directory
#   - Only if coverage is enabled and there is a global coverage dir specified -
#
if [[ "$COVER" != "" && "$ISTANBUL_LOCATION" != "" && "$ISTANBUL_LOG" != "" && -d "coverage" ]]; then
	export logDir="$ISTANBUL_LOG/$projectName"

	# move the coverage info to the specified log dir
	mkdir -p $logDir
	cd coverage
	cp -R * $logDir/
	cd ..
	rm -rf coverage
fi

#
# Exit script
#
exit $ErrorCode
