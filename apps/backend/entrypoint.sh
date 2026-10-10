#!/bin/sh
echo "running migrations..."
migrate -path ./migrations -database $DATABASE_URL up
echo "migration exit code: $?"
exec air