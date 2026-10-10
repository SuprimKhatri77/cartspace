package cloudinary

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

type Client struct {
	cld       *cloudinary.Cloudinary
	cloudName string
	apiKey    string
	apiSecret string
}

func New(cloudName, apiKey, apiSecret string) (*Client, error) {
	if cloudName == "" || apiKey == "" || apiSecret == "" {
		return nil, fmt.Errorf("cloudinary: missing required credentials")
	}

	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, err
	}
	return &Client{cld: cld, cloudName: cloudName, apiKey: apiKey, apiSecret: apiSecret}, nil
}

// UploadSignature lets a browser upload straight to Cloudinary: the
// signed parameters (folder and timestamp) plus what the upload form needs.
type UploadSignature struct {
	CloudName string `json:"cloud_name"`
	APIKey    string `json:"api_key"`
	Folder    string `json:"folder"`
	Timestamp int64  `json:"timestamp"`
	Signature string `json:"signature"`
}

// SignUpload signs an upload into folder at timestamp (Unix seconds);
// Cloudinary rejects it an hour later.
func (c *Client) SignUpload(folder string, timestamp int64) (UploadSignature, error) {
	params := url.Values{}
	params.Set("folder", folder)
	params.Set("timestamp", strconv.FormatInt(timestamp, 10))
	signature, err := api.SignParameters(params, c.apiSecret)
	if err != nil {
		return UploadSignature{}, fmt.Errorf("cloudinary: sign upload: %w", err)
	}
	return UploadSignature{
		CloudName: c.cloudName,
		APIKey:    c.apiKey,
		Folder:    folder,
		Timestamp: timestamp,
		Signature: signature,
	}, nil
}

// Owns reports whether an image URL is hosted on this cloud. Only those may
// be deleted: other clouds' public ids (the demo catalog's "samples/...")
// could name this cloud's own assets.
func (c *Client) Owns(imageURL string) bool {
	return strings.HasPrefix(imageURL, "https://res.cloudinary.com/"+c.cloudName+"/")
}

func (c *Client) UploadImage(ctx context.Context, file interface{}, folder string) (string, string, error) {
	resp, err := c.cld.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder:       folder,
		ResourceType: "image",
	})
	if err != nil {
		return "", "", err
	}
	return resp.SecureURL, resp.PublicID, nil
}

func (c *Client) DeleteImage(ctx context.Context, publicID string) error {
	_, err := c.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID: publicID,
	})
	return err
}
