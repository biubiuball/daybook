package content

import "testing"

func TestParsePageAllowsEmptySlug(t *testing.T) {
	text := `---
title: About / 关于
summary: Welcome.
slug:
---

页面正文。`

	page, err := ParsePage("about.md", text)
	if err != nil {
		t.Fatalf("ParsePage returned error: %v", err)
	}

	if page.Title != "About / 关于" {
		t.Fatalf("Title = %q, want %q", page.Title, "About / 关于")
	}
	if page.Summary != "Welcome." {
		t.Fatalf("Summary = %q, want %q", page.Summary, "Welcome.")
	}
	if page.Body != "页面正文。" {
		t.Fatalf("Body = %q, want page body", page.Body)
	}
}
