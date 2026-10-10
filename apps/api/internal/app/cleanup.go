package app

import (
	"context"
	"log/slog"
	"time"
)

const sessionCleanupInterval = time.Hour

// startSessionCleanup deletes expired sessions (and ones revoked over a week
// ago) at startup and then every interval, until ctx is cancelled.
func (a *App) startSessionCleanup(ctx context.Context, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		a.cleanupSessions(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				a.cleanupSessions(ctx)
			}
		}
	}()
}

func (a *App) cleanupSessions(ctx context.Context) {
	deleted, err := a.Queries.DeleteStaleSessions(ctx)
	if err != nil {
		if ctx.Err() == nil {
			slog.Error("session cleanup failed", "err", err)
		}
		return
	}
	if deleted > 0 {
		slog.Info("session cleanup", "deleted", deleted)
	}
}
