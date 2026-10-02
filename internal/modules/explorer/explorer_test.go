package explorer

import (
	"reflect"
	"testing"

	"manga-visor/internal/database"
	"manga-visor/internal/persistence"
)

func newTestOrderRepos(t *testing.T) (*database.FolderOrdersRepository, *database.ImageOrdersRepository) {
	t.Helper()
	db, err := database.New(t.TempDir())
	if err != nil {
		t.Fatalf("database.New error = %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return database.NewFolderOrdersRepository(db), database.NewImageOrdersRepository(db)
}

func imageNames(images []persistence.ImageInfo) []string {
	names := make([]string, len(images))
	for i, img := range images {
		names[i] = img.Name
	}
	return names
}

func TestSortImagesByExplorerPreferenceNameNaturalAsc(t *testing.T) {
	folderOrders, imageOrders := newTestOrderRepos(t)

	images := []persistence.ImageInfo{
		{Name: "page10.jpg"},
		{Name: "page2.jpg"},
		{Name: "page1.jpg"},
	}

	SortImagesByExplorerPreference(images, "/manga", "name", "asc", folderOrders, imageOrders)

	want := []string{"page1.jpg", "page2.jpg", "page10.jpg"}
	if got := imageNames(images); !reflect.DeepEqual(got, want) {
		t.Errorf("name asc order = %v, want %v", got, want)
	}
}

func TestSortImagesByExplorerPreferenceNameNaturalDesc(t *testing.T) {
	folderOrders, imageOrders := newTestOrderRepos(t)

	images := []persistence.ImageInfo{
		{Name: "page1.jpg"},
		{Name: "page2.jpg"},
		{Name: "page10.jpg"},
	}

	SortImagesByExplorerPreference(images, "/manga", "name", "desc", folderOrders, imageOrders)

	want := []string{"page10.jpg", "page2.jpg", "page1.jpg"}
	if got := imageNames(images); !reflect.DeepEqual(got, want) {
		t.Errorf("name desc order = %v, want %v", got, want)
	}
}

func TestSortImagesByExplorerPreferencePinnedFront(t *testing.T) {
	folderOrders, imageOrders := newTestOrderRepos(t)

	if err := imageOrders.PinImage("/manga", "name", "page2.jpg"); err != nil {
		t.Fatalf("PinImage error = %v", err)
	}

	images := []persistence.ImageInfo{
		{Name: "page10.jpg"},
		{Name: "page1.jpg"},
		{Name: "page2.jpg"},
	}

	SortImagesByExplorerPreference(images, "/manga", "name", "asc", folderOrders, imageOrders)

	want := []string{"page2.jpg", "page1.jpg", "page10.jpg"}
	if got := imageNames(images); !reflect.DeepEqual(got, want) {
		t.Errorf("pinned name asc order = %v, want %v", got, want)
	}
}

func TestSortImagesByExplorerPreferenceAuto(t *testing.T) {
	folderOrders, imageOrders := newTestOrderRepos(t)

	images := []persistence.ImageInfo{
		{Name: "older.jpg", ModTime: 100},
		{Name: "newer.jpg", ModTime: 200},
	}

	SortImagesByExplorerPreference(images, "/manga", "auto", "asc", folderOrders, imageOrders)
	want := []string{"newer.jpg", "older.jpg"}
	if got := imageNames(images); !reflect.DeepEqual(got, want) {
		t.Errorf("auto asc order = %v, want %v", got, want)
	}

	SortImagesByExplorerPreference(images, "/manga", "auto", "desc", folderOrders, imageOrders)
	want = []string{"older.jpg", "newer.jpg"}
	if got := imageNames(images); !reflect.DeepEqual(got, want) {
		t.Errorf("auto desc order = %v, want %v", got, want)
	}
}

func TestSortImagesByExplorerPreferenceDate(t *testing.T) {
	folderOrders, imageOrders := newTestOrderRepos(t)

	images := []persistence.ImageInfo{
		{Name: "older.jpg", ModTime: 100},
		{Name: "newer.jpg", ModTime: 200},
	}

	SortImagesByExplorerPreference(images, "/manga", "date", "asc", folderOrders, imageOrders)
	want := []string{"older.jpg", "newer.jpg"}
	if got := imageNames(images); !reflect.DeepEqual(got, want) {
		t.Errorf("date asc order = %v, want %v", got, want)
	}

	SortImagesByExplorerPreference(images, "/manga", "date", "desc", folderOrders, imageOrders)
	want = []string{"newer.jpg", "older.jpg"}
	if got := imageNames(images); !reflect.DeepEqual(got, want) {
		t.Errorf("date desc order = %v, want %v", got, want)
	}
}

func TestSortImagesByExplorerPreferenceNilFolderOrdersNameSort(t *testing.T) {
	images := []persistence.ImageInfo{
		{Name: "ch10.jpg"},
		{Name: "ch2.jpg"},
		{Name: "ch1.jpg"},
	}

	SortImagesByExplorerPreference(images, "/manga", "name", "asc", nil, nil)

	want := []string{"ch1.jpg", "ch2.jpg", "ch10.jpg"}
	if got := imageNames(images); !reflect.DeepEqual(got, want) {
		t.Errorf("name asc order with nil repos = %v, want %v", got, want)
	}
}
