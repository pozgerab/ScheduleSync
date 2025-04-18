package main

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// without ".zip"
func (u *utils) ZipDirectory(cfg Config, zipName string) (string, error) {
	_, sourceDir, tempDir := configInst.GetPaths(cfg)

	if _, err := os.Stat(sourceDir); os.IsNotExist(err) {
		return "", fmt.Errorf("source directory does not exist: %s", sourceDir)
	}

	zipPath := filepath.Join(tempDir, zipName+".zip")

	zipFile, err := os.Create(zipPath)
	if err != nil {
		return "", err
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	err = filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}

		relPathParts := strings.Split(relPath, string(os.PathSeparator))
		for i, part := range relPathParts {
			if part == "Player_0" {
				relPathParts[i] = "Player_" + cfg.SteamID
			}
		}
		relPath = filepath.ToSlash(filepath.Join(relPathParts...))

		if info.IsDir() {
			if relPath == "." {
				return nil // skip root dir
			}
			relPath += "/"
			_, err := zipWriter.Create(relPath)
			return err
		}

		zipHeader, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		zipHeader.Name = relPath
		zipHeader.Method = zip.Deflate

		writer, err := zipWriter.CreateHeader(zipHeader)
		if err != nil {
			return err
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		return err
	})

	if err != nil {
		return "", err
	}

	return zipPath, nil
}

func (u *utils) UnzipFile(zipPath string, cfg Config) error {

	_, destDir, _ := configInst.GetPaths(cfg)

	err := os.RemoveAll(destDir)
	if err != nil {
		return fmt.Errorf("failed to clear dir: %w", err)
	}

	zipReader, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("failed to open zip file: %w", err)
	}
	defer zipReader.Close()

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	for _, file := range zipReader.File {
		relPath := strings.ReplaceAll(file.Name, "Player_"+cfg.SteamID, "Player_0")
		filePath := filepath.Join(destDir, filepath.FromSlash(relPath))

		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(filePath, file.Mode()); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}
			continue
		}

		outFile, err := os.Create(filePath)
		if err != nil {
			return fmt.Errorf("failed to create file: %w", err)
		}
		defer outFile.Close()

		zipFile, err := file.Open()
		if err != nil {
			return fmt.Errorf("failed to open zip file entry: %w", err)
		}
		defer zipFile.Close()

		_, err = io.Copy(outFile, zipFile)
		if err != nil {
			return fmt.Errorf("failed to extract file: %w", err)
		}
	}

	fmt.Println("Unzip successful!")
	return nil
}
