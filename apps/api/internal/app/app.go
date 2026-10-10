package app

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/suprimkhatri77/cartspace/backend/internal/config"
	"github.com/suprimkhatri77/cartspace/backend/internal/database"
	dbgen "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/cloudinary"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

type App struct {
	Cfg       *config.Config
	Queries   *dbgen.Queries
	DB        *database.DB
	CldClient *cloudinary.Client
	Router    *gin.Engine
}

func New(ctx context.Context) (*App, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}

	initLogger()
	gin.SetMode(cfg.GinMode)

	db, err := initDB(ctx, cfg)
	if err != nil {
		return nil, err
	}

	cldClient, err := initCloudinary(cfg)
	if err != nil {
		db.Close()
		return nil, err
	}

	queries := dbgen.New(db.Pool)
	validator.Init()

	r := buildRouter(cfg, queries, cldClient, db)

	return &App{
		Cfg:       cfg,
		Queries:   queries,
		DB:        db,
		CldClient: cldClient,
		Router:    r,
	}, nil
}

func (a *App) Close() {
	a.DB.Close()
}
