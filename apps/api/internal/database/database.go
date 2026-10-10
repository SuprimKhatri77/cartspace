package database

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps pgxpool.Pool for dependency injection.
type DB struct {
	Pool *pgxpool.Pool
}

// New creates a new database connection pool.
func new(ctx context.Context, connString string) (*DB, error) {
	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		log.Printf("Unable to parse DATABASE_URL: %v", err)
		return nil, err
	}
	pool, err := pgxpool.NewWithConfig(ctx, config)

	if err != nil {
		log.Printf("Unable to create connection pool: %v", err)
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	return &DB{Pool: pool}, nil
}

// Close closes the connection pool.
func (db *DB) Close() {
	if db != nil && db.Pool != nil {
		db.Pool.Close()
	}
}

func ConnectWithRetry(ctx context.Context, connString string, maxRetries int) (*DB, error) {
	var (
		database *DB
		err      error
	)
	for i := range maxRetries {
		database, err = new(ctx, connString)
		if err == nil {
			return database, nil
		}
		slog.Warn("failed to connect to database, retrying...", "attempt", i+1, "max", maxRetries, "err", err)
		time.Sleep(2 * time.Second)
	}
	return nil, fmt.Errorf("failed to open database after %d attempts: %w", maxRetries, err)
}
