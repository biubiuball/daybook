package render

import (
	"math"
	"strconv"
	"strings"
	"testing"
)

func TestNewGoldenSpiralUsesOversizedOuterRect(t *testing.T) {
	spiral := NewGoldenSpiral()
	_, _, width, height := parseRect(t, spiral.OuterRect)

	phi := (1 + math.Sqrt(5)) / 2
	wantWidth := 1080 * phi * phi * phi
	wantHeight := 1080 * phi * phi
	if math.Abs(width-wantWidth) > 0.02 {
		t.Fatalf("outer rect width = %.2f, want %.2f", width, wantWidth)
	}
	if math.Abs(height-wantHeight) > 0.02 {
		t.Fatalf("outer rect height = %.2f, want %.2f", height, wantHeight)
	}
	if width <= 1600 || height <= 900 {
		t.Fatalf("outer rect should exceed viewBox, got %.2fx%.2f", width, height)
	}
	if strings.TrimSpace(spiral.SpiralPath) == "" {
		t.Fatal("spiral path should not be empty")
	}
	if spiral.SpinCenterX == "" || spiral.SpinCenterY == "" {
		t.Fatal("spin center should be set")
	}
}

func parseRect(t *testing.T, rect string) (float64, float64, float64, float64) {
	t.Helper()

	fields := strings.Fields(rect)
	if len(fields) != 4 {
		t.Fatalf("rect %q should contain 4 numbers", rect)
	}

	values := make([]float64, 4)
	for i, field := range fields {
		value, err := strconv.ParseFloat(field, 64)
		if err != nil {
			t.Fatalf("parse rect value %q: %v", field, err)
		}
		values[i] = value
	}

	return values[0], values[1], values[2], values[3]
}
