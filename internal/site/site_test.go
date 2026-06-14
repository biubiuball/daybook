package site

import (
	"testing"

	"github.com/StatIndet/daybook/internal/render"
)

func TestMonthGroups(t *testing.T) {
	notes := []render.NoteLink{
		{Title: "A", Date: "2026-06-14"},
		{Title: "B", Date: "2026-06-01"},
		{Title: "C", Date: "2026-05-30"},
	}

	groups := monthGroups(notes)
	if len(groups) != 2 {
		t.Fatalf("groups length = %d, want 2", len(groups))
	}
	if groups[0].Key != "2026-06" || groups[0].Label != "2026 年 06 月" || len(groups[0].Notes) != 2 {
		t.Fatalf("first group = %#v, want June group with two notes", groups[0])
	}
	if groups[1].Key != "2026-05" || len(groups[1].Notes) != 1 {
		t.Fatalf("second group = %#v, want May group with one note", groups[1])
	}
}
