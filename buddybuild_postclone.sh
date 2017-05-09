#!/usr/bin/env bash

echo "=== buddybuild_postclone.sh ==="

echo "ENVIRONMENTAL VARIABLES"
printenv | more

echo "Running buddybuild_postclone.sh. Current folder is $PWD..."
#echo "folder contents are:"
#ls

echo "Making scripts and hooks executable..."
chmod -R a+x ./hooks
chmod -R a+x ./package-hooks
chmod -R a+x ./scripts

echo "LOWERCASE_APP_NAME is ${LOWERCASE_APP_NAME}"

if [ -z ${BUDDYBUILD_SCHEME} ];
    then
        echo "NOT BUILDING IOS APP because BUDDYBUILD_SCHEME env is ${BUDDYBUILD_SCHEME}"
        echo "BUILDING ANDROID APP because BUDDYBUILD_SCHEME is set to ${BUDDYBUILD_SCHEME}"

        echo "Running apt-get install imagemagick"
        echo password | sudo -S apt-get install imagemagick

        echo "Running npm install -g gulp bower ionic cordova"
        npm install -g gulp bower ionic cordova

    else
        echo "BUILDING IOS APP because BUDDYBUILD_SCHEME env is ${BUDDYBUILD_SCHEME}"
        echo "NOT BUILDING ANDROID APP because BUDDYBUILD_SCHEME env is set"
        echo "Running sudo brew install imagemagick"
        brew install imagemagick

        #echo "Running npm install -g gulp bower ionic cordova"
        #sudo npm install -g gulp bower ionic cordova  # Done in gulpfile now

        #echo "Running npm install"
        #npm install  # Done in gulpfile now

        #echo "gulp prepareIosApp"
        #gulp prepareIosApp  # Done in gulpfile now
fi
