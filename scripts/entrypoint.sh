#!/usr/bin/env sh

node server.cjs &
SERVER_PID=$!

./get_cert.sh >> /var/log/get_cert 2>&1 || true
echo "0 * * * * cd $PWD && ./get_cert.sh >> /var/log/get_cert 2>&1" | crontab -
crond -L /var/log/cron

wait "${SERVER_PID}"
