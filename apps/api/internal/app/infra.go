package app

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/database"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/cloudinary"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/payments"
)

func initDB(ctx context.Context, cfg *config.Config) (*database.DB, error) {
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("config: DATABASE_URL is required")
	}
	db, err := database.ConnectWithRetry(ctx, cfg.DatabaseURL, 10)
	if err != nil {
		return nil, fmt.Errorf("database: %w", err)
	}
	return db, nil
}

func initCloudinary(cfg *config.Config) (*cloudinary.Client, error) {
	c, err := cloudinary.New(cfg.CloudinaryCloudName, cfg.CloudinaryAPIKey, cfg.CloudinaryAPISecret)
	if err != nil {
		return nil, fmt.Errorf("cloudinary: %w", err)
	}
	return c, nil
}

// initPayments returns Stripe, or nil (checkout disabled) without a key so
// the API still runs where payments aren't configured, such as CI.
func initPayments(cfg *config.Config) payments.Provider {
	if cfg.StripeSecretKey == "" {
		slog.Warn("payments disabled: STRIPE_SECRET_KEY is not set")
		return nil
	}
	if cfg.FrontendURL == "" {
		slog.Warn("payments disabled: FRONTEND_URL is needed for the checkout return pages")
		return nil
	}
	provider, err := payments.NewStripe(cfg.StripeSecretKey, cfg.StripeWebhookSecrets)
	if err != nil {
		slog.Warn("payments disabled", "err", err)
		return nil
	}
	return provider
}

func initLogger() {
	var handler slog.Handler
	if os.Getenv("GO_ENV") == "production" {
		handler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level:     slog.LevelDebug,
			AddSource: true,
		})
	}
	slog.SetDefault(slog.New(handler))
}
