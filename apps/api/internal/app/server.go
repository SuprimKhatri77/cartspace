package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// Run serves until SIGINT/SIGTERM, then shuts down gracefully.
// It returns early with an error if the server fails to listen.
func (a *App) Run() error {
	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", a.Cfg.Port),
		Handler:           a.Router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	bgCtx, stopBackground := context.WithCancel(context.Background())
	defer stopBackground()
	a.startSessionCleanup(bgCtx, sessionCleanupInterval)
	a.startOrderExpiry(bgCtx, orderExpiryInterval)

	errCh := make(chan error, 1)
	go func() {
		slog.Info("server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- fmt.Errorf("listen: %w", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(quit)

	select {
	case err := <-errCh:
		return err
	case <-quit:
	}

	slog.Info("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}
	slog.Info("server stopped")
	return nil
}
