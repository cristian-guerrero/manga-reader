package downloader

import (
	"strings"
	"testing"
)

const imhentaiToViewerFixture = `
<html><head><title>[Group (Artist)] Some Title - IMHentai</title></head><body>
<section id="image-container"><img src="https://supercdn.site/galleries/4192983/1.webp" /></section>
<script>
        var reader = new N.reader({
            media_url: 'https://supercdn.site/',
            gallery: {
                "id": 684023,
                "media_id": "4192983",
                "title": {
                    "english": "Some \"Quoted\" Title",
                    "japanese": "mojibake"
                },
                "images": {
                    "pages": [{"t":"w","w":1280,"h":1791},{"t":"j","w":1280,"h":1791},{"t":"p","w":1280,"h":1791}],
                    "cover": {"t":"w","w":350,"h":490}
                },
                "num_pages": 3
            }
        });
</script>
</body></html>
`

const imhentaiToGalleryFixture = `
<html><head></head><body>
<div id="cover"><img src="https://supercdn.site/galleries/639130/cover.webp" /></div>
<h1>Fallback Title</h1>
<div class="galleries_info pages"><span class="tags_text">Pages:</span> <span class="pages_num">155</span></div>
<script>
        var gallery = new N.gallery({
            "id": 100000,
            "media_id": "639130",
            "title": {"english": "Fallback Title"},
            "images": {
                "pages": {"2":{"t":"j","w":1280,"h":1791},"3":{"t":"j","w":1280,"h":1791}}
            },
            "num_pages": 155,
        });
</script>
</body></html>
`

func TestIMHentaiToParseViewerPage(t *testing.T) {
	g := parseIMHentaiTo(imhentaiToViewerFixture)

	if g.mediaID != "4192983" {
		t.Errorf("expected mediaID 4192983, got %q", g.mediaID)
	}
	if g.cdnBase != "https://supercdn.site" {
		t.Errorf("expected cdnBase https://supercdn.site, got %q", g.cdnBase)
	}
	if g.totalPages != 3 {
		t.Errorf("expected 3 pages, got %d", g.totalPages)
	}
	if g.title != `Some "Quoted" Title` {
		t.Errorf("unexpected title %q", g.title)
	}
	if ext := g.extensionFor(1); ext != "webp" {
		t.Errorf("expected page 1 webp, got %s", ext)
	}
	if ext := g.extensionFor(2); ext != "jpg" {
		t.Errorf("expected page 2 jpg, got %s", ext)
	}
	if ext := g.extensionFor(3); ext != "png" {
		t.Errorf("expected page 3 png, got %s", ext)
	}
}

func TestIMHentaiToParseGalleryPage(t *testing.T) {
	g := parseIMHentaiTo(imhentaiToGalleryFixture)

	if g.mediaID != "639130" {
		t.Errorf("expected mediaID 639130, got %q", g.mediaID)
	}
	if g.cdnBase != "https://supercdn.site" {
		t.Errorf("expected cdnBase https://supercdn.site, got %q", g.cdnBase)
	}
	if g.totalPages != 155 {
		t.Errorf("expected 155 pages, got %d", g.totalPages)
	}
	if g.title != "Fallback Title" {
		t.Errorf("unexpected title %q", g.title)
	}
	// The gallery map has no page 1 entry, so it must fall back to page 2.
	if ext := g.extensionFor(1); ext != "jpg" {
		t.Errorf("expected page 1 jpg via neighbour fallback, got %s", ext)
	}
}

func TestIMHentaiToBuildImages(t *testing.T) {
	d := &IMHentaiToDownloader{}
	g := parseIMHentaiTo(imhentaiToViewerFixture)
	images := buildIMHentaiToImages(g)

	if len(images) != 3 {
		t.Fatalf("expected 3 images, got %d", len(images))
	}
	if images[0].URL != "https://supercdn.site/galleries/4192983/1.webp" {
		t.Errorf("unexpected first URL %q", images[0].URL)
	}
	if images[2].Filename != "003.png" {
		t.Errorf("unexpected last filename %q", images[2].Filename)
	}
	if images[0].Index != 0 {
		t.Errorf("expected index 0, got %d", images[0].Index)
	}
	if images[0].Headers["Referer"] != "https://imhentai.to/" {
		t.Errorf("expected referer header")
	}
	if d.GetSiteID() != "imhentai.to" {
		t.Errorf("unexpected site id %q", d.GetSiteID())
	}
}

func TestIMHentaiToNormalizeURL(t *testing.T) {
	d := &IMHentaiToDownloader{}
	cases := map[string]string{
		"https://imhentai.to/g/684023":        "https://imhentai.to/g/684023/",
		"https://imhentai.to/g/684023/":       "https://imhentai.to/g/684023/",
		"https://imhentai.to/g/684023/7/":     "https://imhentai.to/g/684023/",
		"https://imhentai.to/view/684023/7/":  "https://imhentai.to/g/684023/",
		"https://imhentai.to/g/684023/?page=2": "https://imhentai.to/g/684023/",
	}
	for in, want := range cases {
		if got := d.NormalizeURL(in); got != want {
			t.Errorf("NormalizeURL(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestIMHentaiToGetImagesRejectsNonGallery(t *testing.T) {
	d := &IMHentaiToDownloader{}
	if _, err := d.GetImages("https://imhentai.to/artist/miito-shido/"); err == nil {
		t.Fatal("expected error for non gallery URL")
	} else if !strings.Contains(err.Error(), "not an IMHentai gallery page") {
		t.Errorf("unexpected error %v", err)
	}
}
