package persistence

type FolderGridSize struct {
	ParentPath string `json:"parentPath"`
	GridSize   int    `json:"gridSize"`
	ModifiedAt string `json:"modifiedAt"`
}
