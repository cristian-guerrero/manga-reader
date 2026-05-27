package utils

import (
	"strconv"
	"unicode"
)

func NaturalLess(a, b string) bool {
	return CompareNatural(a, b) < 0
}

func CompareNatural(a, b string) int {
	ai, bi := 0, 0
	for ai < len(a) && bi < len(b) {
		ca, cb := rune(a[ai]), rune(b[bi])

		if unicode.IsDigit(ca) && unicode.IsDigit(cb) {
			numA, endA := extractNumber(a, ai)
			numB, endB := extractNumber(b, bi)

			if numA != numB {
				if numA < numB {
					return -1
				}
				return 1
			}

			ai = endA
			bi = endB
			continue
		}

		la, lb := unicode.ToLower(ca), unicode.ToLower(cb)
		if la != lb {
			if la < lb {
				return -1
			}
			return 1
		}

		ai++
		bi++
	}

	if ai < len(a) {
		return 1
	}
	if bi < len(b) {
		return -1
	}
	return 0
}

func extractNumber(s string, i int) (int, int) {
	j := i
	for j < len(s) && unicode.IsDigit(rune(s[j])) {
		j++
	}
	num, _ := strconv.Atoi(s[i:j])
	return num, j
}
