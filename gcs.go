package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"path"

	"cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

func (u *utils) UploadFile(localFilePath string, cfg Config) error {
	ctx := context.Background()

	credPath, err := credentialsPath()
	if err != nil {
		return fmt.Errorf("credpath: %v", err)
	}
	client, err := storage.NewClient(ctx, option.WithCredentialsFile(credPath))
	if err != nil {
		return fmt.Errorf("storage.NewClient: %v", err)
	}
	defer client.Close()

	// Open the local file to upload
	file, err := os.Open(localFilePath)
	if err != nil {
		return fmt.Errorf("os.Open: %v", err)
	}
	defer file.Close()

	// Get the bucket and create a writer to upload the file
	bucket := client.Bucket(cfg.BucketName)
	object := bucket.Object(cfg.BlobName)
	writer := object.NewWriter(ctx)

	// Copy the file content to the cloud object
	if _, err := io.Copy(writer, file); err != nil {
		return fmt.Errorf("io.Copy: %v", err)
	}

	// Close the writer to finalize the upload
	if err := writer.Close(); err != nil {
		return fmt.Errorf("writer.Close: %v", err)
	}

	fmt.Printf("Uploaded %s to gs://%s/%s\n", localFilePath, cfg.BucketName, cfg.BlobName)
	return nil
}

func (u *utils) DownloadFile(fileName string, cfg Config) (string, error) {
	ctx := context.Background()
	localDestination := path.Join(getTempPath(), fileName)

	credPath, err := credentialsPath()
	if err != nil {
		return "", fmt.Errorf("credpath: %v", err)
	}

	client, err := storage.NewClient(ctx, option.WithCredentialsFile(credPath))
	if err != nil {
		return "", fmt.Errorf("storage.NewClient: %v", err)
	}
	defer client.Close()

	bucket := client.Bucket(cfg.BucketName)
	object := bucket.Object(cfg.BlobName)

	// Create a reader to download the file
	reader, err := object.NewReader(ctx)
	if err != nil {
		return "", fmt.Errorf("object.NewReader: %v", err)
	}
	defer reader.Close()

	file, err := os.Create(localDestination)
	if err != nil {
		return "", fmt.Errorf("os.Create: %v", err)
	}
	defer file.Close()

	if _, err := io.Copy(file, reader); err != nil {
		return "", fmt.Errorf("io.Copy: %v", err)
	}

	fmt.Printf("Downloaded gs://%s/%s to %s\n", cfg.BucketName, cfg.BlobName, localDestination)
	return localDestination, nil
}

func (u *utils) ListBuckets() ([]string, error) {
	ctx := context.Background()

	credPath, err := credentialsPath()
	if err != nil {
		return nil, fmt.Errorf("credpath: %v", err)
	}

	client, err := storage.NewClient(ctx, option.WithCredentialsFile(credPath))
	if err != nil {
		return nil, fmt.Errorf("storage.NewClient: %v", err)
	}
	defer client.Close()

	projectIdAny, err := readJSONField(credPath, "project_id")
	if err != nil {
		return nil, fmt.Errorf("readprojectid: %v", err)
	}

	var projectId string = projectIdAny.(string)
	var bucketNames []string

	bucketIt := client.Buckets(ctx, projectId)
	for {
		bucketAttrs, err := bucketIt.Next()
		if err != nil {
			if err.Error() == "no more items in iterator" {
				break
			}
			return nil, fmt.Errorf("error iterating buckets: %w", err)
		}
		bucketNames = append(bucketNames, bucketAttrs.Name)
	}
	return bucketNames, nil
}
