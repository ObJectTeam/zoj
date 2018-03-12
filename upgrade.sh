#!/bin/sh
git fetch --all && git reset --hard origin/master
killall node
node app.js >log.txt