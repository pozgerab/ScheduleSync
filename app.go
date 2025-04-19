package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strings"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

var configInst Config = Config{}
var appdata string = os.Getenv("APPDATA")
var schedulePath string = filepath.Join(strings.Replace(appdata, "\\Roaming", "", 1), "LocalLow", "TVGS", "Schedule I")
var usersPath string = filepath.Join(schedulePath, "Saves")
var Utils utils = utils{}

func getDefaultSteamID() (string, error) {
	contents, err := os.ReadDir(usersPath)
	if err != nil {
		return "", err
	}
	for _, content := range contents {
		fmt.Println(content.Name())
		if !content.IsDir() || content.Name() == "TempPlayer" {
			continue
		}
		return content.Name(), nil
	}
	return "", nil
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	//	init config

	configInst.GetCurrentConfig()
	createCredentials()
	os.MkdirAll(getTempPath(), 0755)
}

const (
	SavePrefix  = "SaveGame_"
	BackupName  = "backup-world"
	TempDirName = "schedulesync"
)

type Config struct {
	SteamID    string `json:"steamid"`
	SaveSlot   int8   `json:"save_slot"`
	BucketName string `json:"bucket_name"`
	BlobName   string `json:"blob_name"`
}

type Creds struct {
	Cred_type         string `json:"type"`
	Project_id        string `json:"project_id"`
	Private_key_id    string `json:"private_key_id"`
	Private_key       string `json:"private_key"`
	Client_email      string `json:"client_email"`
	Client_id         string `json:"client_id"`
	Auth_uri          string `json:"auth_uri"`
	Token_uri         string `json:"token_uri"`
	Provider_cert_url string `json:"auth_provider_x509_cert_url"`
	Client_cert_url   string `json:"client_x509_cert_url"`
	Universe_domain   string `json:"universe_domain"`
}

type utils struct {
}

func openPath(path string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", path)
	case "darwin":
		cmd = exec.Command("open", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}

	return cmd.Run()
}

func (u *utils) OpenConfigDir() error {
	configDir, err := getConfigDir()
	if err != nil {
		return fmt.Errorf("configdir: %v", err)
	}
	openPath(configDir)
	return nil
}

func (cfg *Config) GetCurrentConfig() Config {
	var config Config

	path, err := getConfigPath()
	if err != nil || !pathExists(path) {
		fmt.Println("Could not get config path")
		fmt.Println("Creating config path")
		steamID, _ := getDefaultSteamID()

		config = Config{SteamID: steamID, SaveSlot: 4}
		configInst.WriteConfig(config)
	} else {
		config, err = Utils.ReadConfig(path)
		if err != nil {
			fmt.Println("Something went wrong reading config")
		}
	}
	return config
}

func createCredentials() (string, error) {
	credPath, err := credentialsPath()
	if err != nil {
		return "", err
	}

	if pathExists(credPath) {
		return credPath, nil
	}

	creds := Creds{
		Cred_type:         "",
		Project_id:        "",
		Private_key_id:    "",
		Private_key:       "",
		Client_email:      "",
		Client_id:         "",
		Auth_uri:          "",
		Token_uri:         "",
		Provider_cert_url: "",
		Client_cert_url:   "",
		Universe_domain:   "",
	}
	data, err := json.MarshalIndent(creds, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal: %v", err)
	}
	return credPath, os.WriteFile(credPath, data, 0644)
}

func credentialsPath() (string, error) {
	configPath, err := getConfigDir()
	if err != nil {
		return "", fmt.Errorf("configdir: %v", err)
	}
	return path.Join(configPath, "credentials.json"), nil
}

func (u *utils) ReadConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	var cfg Config
	err = json.Unmarshal(data, &cfg)
	return cfg, err
}

func (c *Config) WriteConfig(cfg Config) error {
	path, err := getConfigPath()
	if err != nil {
		return fmt.Errorf("configpath: %v", err)
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func readJSONField(path, field string) (any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, err
	}

	val, ok := raw[field]
	if !ok {
		return nil, fmt.Errorf("field %q not found", field)
	}

	return val, nil
}

func (u *utils) GetOrgName(cfg Config, slot int8) string {
	savesPath, _, _ := configInst.GetPaths(cfg)
	if pathExists(savesPath) {
		gameDataPath := path.Join(savesPath, fmt.Sprintf("%s%d", SavePrefix, slot), "Game.json")
		val, err := readJSONField(gameDataPath, "OrganisationName")
		if err == nil {
			val, ok := val.(string)
			if ok {
				return val
			}
		}
	}
	return ""
}

func getTempPath() string {
	_, _, tempPath := configInst.GetPaths(Config{})
	return tempPath
}

func (c *Config) GetPaths(cfg Config) (string, string, string) {
	savesPath := filepath.Join(usersPath, cfg.SteamID)
	saveDir := filepath.Join(savesPath, fmt.Sprintf("%s%d", SavePrefix, cfg.SaveSlot+1))
	return savesPath, saveDir, filepath.Join(os.TempDir(), TempDirName)
}

func (c *Config) GetSaves(cfg Config) []int8 {
	path, _, _ := cfg.GetPaths(cfg)
	saves := make([]int8, 5)
	contents, err := os.ReadDir(path)
	if err != nil {
		return saves
	}
	for _, content := range contents {
		name := content.Name()
		if !content.IsDir() || !strings.HasPrefix(name, SavePrefix) {
			continue
		}
		saveId := strings.Replace(name, SavePrefix, "", 1)
		bite := int8(saveId[0])
		saves[bite-49] = bite - 48
	}
	return saves
}

func getConfigDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	appConfigDir := filepath.Join(configDir, "schedulesync")
	err = os.MkdirAll(appConfigDir, 0755)
	if err != nil {
		return "", err
	}
	return appConfigDir, nil
}

func getConfigPath() (string, error) {
	appConfigDir, err := getConfigDir()
	if err != nil {
		return "", fmt.Errorf("configdir: %v", err)
	}
	return filepath.Join(appConfigDir, "config.json"), nil
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}
