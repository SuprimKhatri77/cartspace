ENV_FILE ?= ../../.env.local
-include $(ENV_FILE)
export

.PHONY: migrate-up migrate-down sqlc run build lint test deps
migrate-up:
	migrate -path migrations -database "$${DATABASE_URL}" up
migrate-down:
	migrate -path migrations -database "$${DATABASE_URL}" down ${N}

sqlc:
	sqlc generate

run:
	go run ./cmd/server
build:
	go build -o server ./cmd/server

lint:
	golangci-lint run ./...

test:
	go test ./...

deps:
	go mod tidy
	go mod download
