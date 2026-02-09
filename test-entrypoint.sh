#!/bin/sh
yarn set version stable
yarn prisma generate
yarn prisma migrate dev
# Levanta la app en background
yarn start:dev &
APP_PID=$!
# Espera a que el servidor esté listo
sleep 5
# Lanza los tests
yarn test:e2e
TEST_EXIT=$?
# Mata la app
kill $APP_PID
exit $TEST_EXIT
