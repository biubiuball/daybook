package render

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"sort"
)

type Renderer struct {
	TemplatesDir string
}

type SiteData struct {
	Title string
}

type Heading struct {
	Level int
	Text  string
	ID    string
}

type NoteLink struct {
	Title               string
	Date                string
	ReadingTime         string
	Summary             string
	URL                 string
	Slug                string
	TitleTransitionName string
	DateTransitionName  string
}

type NotePage struct {
	Title               string
	Date                string
	ReadingTime         string
	Summary             string
	URL                 string
	Slug                string
	HTML                template.HTML
	Headings            []Heading
	TitleTransitionName string
	DateTransitionName  string
}

type IndexData struct {
	Site      SiteData
	PageTitle string
	BodyClass string
	Notes     []NoteLink
}

type NotesData struct {
	Site      SiteData
	PageTitle string
	BodyClass string
	Notes     []NoteLink
}

type NoteData struct {
	Site      SiteData
	PageTitle string
	BodyClass string
	Note      NotePage
}

func New(templatesDir string) Renderer {
	return Renderer{TemplatesDir: templatesDir}
}

func (r Renderer) RenderIndex(outputPath string, data IndexData) error {
	return r.render(outputPath, "index.html", data)
}

func (r Renderer) RenderNotes(outputPath string, data NotesData) error {
	return r.render(outputPath, "notes.html", data)
}

func (r Renderer) RenderNote(outputPath string, data NoteData) error {
	return r.render(outputPath, "note.html", data)
}

func (r Renderer) render(outputPath, pageTemplate string, data any) error {
	files, err := r.templateFiles(pageTemplate)
	if err != nil {
		return fmt.Errorf("解析模板: %w", err)
	}

	tmpl, err := template.ParseFiles(files...)
	if err != nil {
		return fmt.Errorf("解析模板: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return fmt.Errorf("创建输出目录: %w", err)
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("创建输出文件: %w", err)
	}
	defer file.Close()

	if err := tmpl.ExecuteTemplate(file, "base", data); err != nil {
		return fmt.Errorf("渲染模板: %w", err)
	}

	return nil
}

func (r Renderer) templateFiles(pageTemplate string) ([]string, error) {
	files := []string{
		filepath.Join(r.TemplatesDir, "layouts", "base.html"),
	}

	partials, err := filepath.Glob(filepath.Join(r.TemplatesDir, "partials", "*.html"))
	if err != nil {
		return nil, fmt.Errorf("查找 partial 模板: %w", err)
	}
	sort.Strings(partials)
	files = append(files, partials...)
	files = append(files, filepath.Join(r.TemplatesDir, "pages", pageTemplate))

	return files, nil
}
