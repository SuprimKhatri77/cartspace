package admin

import (
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/suprimkhatri77/cartspace/backend/internal/constants"
	db "github.com/suprimkhatri77/cartspace/backend/internal/database/generated"
	"github.com/suprimkhatri77/cartspace/backend/internal/pkg/httpx"
	"github.com/suprimkhatri77/cartspace/backend/internal/types"
	"github.com/suprimkhatri77/cartspace/backend/internal/utils"
	"github.com/suprimkhatri77/cartspace/backend/internal/validator"
)

const (
	discountsPageSize  int64 = 20
	maxDiscountsSearch int   = 32
)

var discountStates = map[string]bool{"active": true, "scheduled": true, "ended": true, "off": true}

// ListDiscounts is every discount code, newest first, with its uses: state
// is active, scheduled, ended (past its end or used up) or off; q is a
// piece of the code.
func ListDiscounts(queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		page, ok := httpx.ParsePage(c)
		if !ok {
			return
		}
		var state, pattern pgtype.Text
		if s := c.Query("state"); s != "" {
			if !discountStates[s] {
				httpx.Fail(c, http.StatusBadRequest, constants.InvalidQueryParam,
					"state must be active, scheduled, ended or off")
				return
			}
			state = pgtype.Text{String: s, Valid: true}
		}
		q := strings.TrimSpace(c.Query("q"))
		if utf8.RuneCountInString(q) > maxDiscountsSearch {
			httpx.Fail(c, http.StatusBadRequest, constants.InvalidQueryParam, "q must be at most 32 characters")
			return
		}
		if q != "" {
			pattern = pgtype.Text{String: utils.ContainsPattern(q), Valid: true}
		}

		total, err := queries.CountAdminDiscounts(ctx, db.CountAdminDiscountsParams{State: state, CodePattern: pattern})
		if err != nil {
			httpx.Internal(c, "failed to count discount codes", err)
			return
		}
		if !httpx.CheckPageInRange(c, page, total, discountsPageSize) {
			return
		}
		codes := []db.DiscountCodeState{}
		if total > 0 {
			codes, err = queries.AdminListDiscounts(ctx, db.AdminListDiscountsParams{
				State: state, CodePattern: pattern,
				PageLimit: int32(discountsPageSize), PageOffset: httpx.Offset(page, discountsPageSize),
			})
			if err != nil {
				httpx.Internal(c, "failed to list discount codes", err)
				return
			}
		}
		c.JSON(http.StatusOK, types.APIResponse{
			Success: true,
			Message: "Discount codes fetched",
			Data:    codes,
			Meta:    types.NewPaginationMeta(total, page, discountsPageSize),
		})
	}
}

// discountProblems are the rules one field's tag can't express: a percent
// is at most 100, and a code ends after it starts.
func discountProblems(in *types.DiscountCodeInput) []types.AppError {
	var errs []types.AppError
	if in.Kind == types.DiscountPercent && in.Value > 100 {
		errs = append(errs, types.AppError{Code: constants.FieldOutOfRange, Field: "value",
			Message: "A percent off must be 1 to 100"})
	}
	if in.StartsAt != nil && in.EndsAt != nil && !in.EndsAt.After(*in.StartsAt) {
		errs = append(errs, types.AppError{Code: constants.FieldOutOfRange, Field: "ends_at",
			Message: "The end must be after the start"})
	}
	return errs
}

// bindDiscount reads and checks a create/update body, upper-casing the
// code. On failure it writes a 400.
func bindDiscount(c *gin.Context) (*types.DiscountCodeInput, bool) {
	in, ok := validator.BindJSON[types.DiscountCodeInput](c)
	if !ok {
		return nil, false
	}
	if errs := discountProblems(in); len(errs) > 0 {
		c.JSON(http.StatusBadRequest, types.APIResponse{
			Success: false,
			Message: "Invalid request body",
			Code:    constants.ValidationFailed,
			Errors:  errs,
		})
		return nil, false
	}
	in.Code = strings.ToUpper(in.Code)
	return in, true
}

func timestamptz(t *time.Time) pgtype.Timestamptz {
	if t == nil {
		return pgtype.Timestamptz{}
	}
	return pgtype.Timestamptz{Time: *t, Valid: true}
}

func int4(n *int32) pgtype.Int4 {
	if n == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: *n, Valid: true}
}

// codeTaken answers a unique violation on the code.
func codeTaken(c *gin.Context, err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		httpx.Fail(c, http.StatusConflict, constants.DiscountCodeTaken, "Another discount already uses this code")
		return true
	}
	return false
}

// respondDiscount answers with the code as it now stands (uses, state).
func respondDiscount(c *gin.Context, queries *db.Queries, id pgtype.UUID, status int, message string) {
	code, err := queries.AdminGetDiscount(c.Request.Context(), id)
	if err != nil {
		httpx.Internal(c, "failed to read the discount code", err)
		return
	}
	c.JSON(status, types.APIResponse{Success: true, Message: message, Data: code})
}

// CreateDiscount adds a discount code.
func CreateDiscount(queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		in, ok := bindDiscount(c)
		if !ok {
			return
		}
		id, err := queries.CreateDiscount(c.Request.Context(), db.CreateDiscountParams{
			Code: in.Code, Kind: in.Kind, Value: in.Value, MinSubtotal: in.MinSubtotal,
			StartsAt: timestamptz(in.StartsAt), EndsAt: timestamptz(in.EndsAt),
			MaxRedemptions: int4(in.MaxRedemptions), OncePerCustomer: in.OncePerCustomer,
			IsActive: *in.IsActive,
		})
		if codeTaken(c, err) {
			return
		}
		if err != nil {
			httpx.Internal(c, "failed to create the discount code", err)
			return
		}
		respondDiscount(c, queries, id, http.StatusCreated, "Discount code created")
	}
}

// UpdateDiscount replaces a code's settings. Once an order has used the
// code, the code itself can't change: past orders show it.
func UpdateDiscount(queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, ok := httpx.PathUUID(c, "id", constants.InvalidDiscountID, "discount ID")
		if !ok {
			return
		}
		in, ok := bindDiscount(c)
		if !ok {
			return
		}
		current, err := queries.AdminGetDiscount(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.Fail(c, http.StatusNotFound, constants.DiscountNotFound, "Discount code not found")
			return
		}
		if err != nil {
			httpx.Internal(c, "failed to read the discount code", err)
			return
		}
		if current.Uses > 0 && current.Code != in.Code {
			httpx.Fail(c, http.StatusConflict, constants.DiscountInUse,
				"Orders have used this code, so it can't be renamed; create a new code instead")
			return
		}
		n, err := queries.UpdateDiscount(ctx, db.UpdateDiscountParams{
			ID: id, Code: in.Code, Kind: in.Kind, Value: in.Value, MinSubtotal: in.MinSubtotal,
			StartsAt: timestamptz(in.StartsAt), EndsAt: timestamptz(in.EndsAt),
			MaxRedemptions: int4(in.MaxRedemptions), OncePerCustomer: in.OncePerCustomer,
			IsActive: *in.IsActive,
		})
		if codeTaken(c, err) {
			return
		}
		if err != nil {
			httpx.Internal(c, "failed to update the discount code", err)
			return
		}
		if n == 0 {
			httpx.Fail(c, http.StatusNotFound, constants.DiscountNotFound, "Discount code not found")
			return
		}
		respondDiscount(c, queries, id, http.StatusOK, "Discount code saved")
	}
}

// DeleteDiscount removes a code no order has used; a used one can only be
// switched off.
func DeleteDiscount(queries *db.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		id, ok := httpx.PathUUID(c, "id", constants.InvalidDiscountID, "discount ID")
		if !ok {
			return
		}
		current, err := queries.AdminGetDiscount(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.Fail(c, http.StatusNotFound, constants.DiscountNotFound, "Discount code not found")
			return
		}
		if err != nil {
			httpx.Internal(c, "failed to read the discount code", err)
			return
		}
		if current.Uses > 0 {
			httpx.Fail(c, http.StatusConflict, constants.DiscountInUse,
				"Orders have used this code, so it can't be deleted; switch it off instead")
			return
		}
		if _, err := queries.DeleteDiscount(ctx, id); err != nil {
			httpx.Internal(c, "failed to delete the discount code", err)
			return
		}
		c.JSON(http.StatusOK, types.APIResponse{Success: true, Message: "Discount code deleted"})
	}
}
