package updater

import "time"

const (
	repoOwner = "cristian-guerrero"
	repoName  = "manga-reader"

	CheckInterval = 1 * time.Hour
)

type Channel string

const (
	ChannelStable Channel = "stable"
	ChannelDev    Channel = "dev"
)

type UpdateInfo struct {
	Available bool   `json:"available"`
	Version   string `json:"version"`
	URL       string `json:"url"`
	Channel   string `json:"channel"`
}

type UpdateState struct {
	Pending        bool   `json:"pending"`
	PendingVersion string `json:"pendingVersion"`
	DownloadedAt   string `json:"downloadedAt"`
}

type Release struct {
	TagName string  `json:"tag_name"`
	Assets  []Asset `json:"assets"`
}

type Asset struct {
	Name        string `json:"name"`
	DownloadURL string `json:"browser_download_url"`
	Size        int    `json:"size"`
}

type GitHubError struct {
	Message string `json:"message"`
}

func assetSuffix() string {
	return ""
}
