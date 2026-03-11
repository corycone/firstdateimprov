# First Date Improv - Data Mismatch Report

Generated: 2026-03-10

## Overview

This report identifies mismatches between the scene metadata CSV and the Excel performance data. These mismatches occur when:
1. Players listed in metadata don't match players who received scores
2. Scene naming conventions differ between sources
3. Scenes exist in one source but not the other

---

## Known Issues to Investigate

### Scene Naming Conventions

**Potential Issues:**
- Excel uses "D" for group games, CSV sometimes uses "4", "5", "GG1", "GG2"
- Excel uses "E" for group games, CSV consistently uses "E"
- Some scenes have "3rd" round variations that may not be captured

**Examples Found:**
- GROUNDHOG DAY: Excel has "D" but CSV has "4" (Taco Bell Stock Exchange)
- GROUNDHOG DAY: Excel has "E" but CSV has "5" (Maroon 5 Concert)
- FOOTBATH: CSV has "GG1" and "GG2" but Excel likely has different labels

---

## Player Mismatches by Show

### PORCUPINES (12/18/2025)

**Scene 3B - "We Need to Sell Multiple Phones"**
- CSV Players: Brendan, Sean
- Excel Scores: Cory (1), Jay (1)
- **Issue**: Completely different players between metadata and scores

**Scene 3C - "Mad About 6 Lazy Doctors"**
- CSV Players: Cory, Jay
- Excel Scores: Need to verify
- **Possible**: This might be swapped with 3B

**Scene 3A - "Everything for Med School"**
- CSV Players: Brendan, Cory
- Excel Scores: Need to verify

**Recommendation**: Verify the order of 3A, 3B, 3C scenes and their player assignments

---

### GROUNDHOG DAY (11/20/2025)

**Scene Naming Issue:**
- Excel Scene "D" → CSV Scene "4" (Taco Bell Stock Exchange)
- Excel Scene "E" → CSV Scene "5" (Maroon 5 Concert)

**Scene 4/D - "Taco Bell Stock Exchange"**
- CSV Players: Cory, All
- Excel Scores: Cory (1), Teresa (0.25), Jesa (0.25), Brendan (0.25), Sean (0.25), Lisa (0.25), Zach (0.25)
- **Status**: Correct - "All" expands to all players

**Scene 5/E - "Maroon 5 Concert Movie Nobody Wants to Bang"**
- CSV Players: Sean, All
- Excel Scores: Need to verify
- **Status**: Should be correct if "All" is used

---

### FOOTBATH (11/6/2025)

**Missing Scene Metadata:**
- CSV has scenes: 1A, 1B, 1C, GG1, 2A, 2B, 2C, GG2, 3
- Excel likely has: 1A, 1B, 1C, D, 2A, 2B, 2C, E, 3A/3B/3C/3
- **Issue**: "GG1" and "GG2" naming doesn't match Excel's "D" and "E" convention

**All Scenes Missing Players:**
- All FOOTBATH scenes in CSV have empty player fields
- **Action Required**: Add player data for all FOOTBATH scenes

---

### CHEESE CURLS (12/4/2025)

**Scenes to Verify:**
- All scenes appear to have metadata
- Need to verify player lists match Excel scores

---

### TOOTHPASTE (1/8/2026)

**Duplicate Scene Labels:**
- CSV has two "3A" entries:
  1. "Blood Ties Good" - Cory, Lisa
  2. "Book Smells like oil - Couple Disagree" - Teresa, Brendan, Sean
- CSV has two "3B" entries:
  1. "Beat Lab Rat Armor" - Cory, Jesa
  2. "Battle Planning - Held the Pieces" - Sean, Teresa

**Recommendation**: Rename duplicates to 3A, 3B, 3C, 3D or verify correct scene labels from Excel

---

### ROCKET SHIP (1/22/2026)

**Duplicate Scene Label:**
- CSV has two "3C" entries:
  1. "Britney Repping Catholic Church" - Jesa, Sean
  2. "It's Britney Bitch" - Brendan, Zach

**Recommendation**: One should likely be "3A" or "3B"

---

### SQUARE (3/5/2026)

**Multiple Scenes Labeled "3":**
- CSV has five entries all labeled "3":
  1. (Empty title) - Brendan, Cory
  2. "Filipinos...Cloning" - Jesa, Teresa
  3. "Too Soft for Jail/Grandma" - (no players)
  4. (Empty title) - (no players)
  5. "Execution for Not Romantic Enough" - Teresa, Brendan, Sean, Cory

**Recommendation**: These should be labeled 3A, 3B, 3C, 3D, 3E or similar

---

## Scene Naming Convention Recommendations

### Standardize Scene Labels

**Current Issues:**
- Mix of "D", "4", "GG1" for group games
- Mix of "E", "5", "GG2" for group games
- Duplicate scene numbers (3, 3, 3, 3)

**Recommended Standard:**
```
Round 1: 1A, 1B, 1C
Group Game 1: D (or GG1)
Round 2: 2A, 2B, 2C
Group Game 2: E (or GG2)
Round 3: 3A, 3B, 3C (or 3, 3, 3 with unique identifiers)
Additional: 4, 5, etc.
```

**Action Items:**
1. Choose one convention (prefer D/E to match Excel)
2. Update FOOTBATH: GG1 → D, GG2 → E
3. Update GROUNDHOG DAY: 4 → D, 5 → E
4. Fix duplicate scene numbers in TOOTHPASTE, ROCKET SHIP, SQUARE

---

## Missing Data Summary

### Shows with Incomplete Player Data:
- **FOOTBATH**: All scenes missing players (9 scenes)

### Shows with Duplicate Scene Labels:
- **TOOTHPASTE**: 2 scenes labeled "3A", 2 scenes labeled "3B"
- **ROCKET SHIP**: 2 scenes labeled "3C"
- **SQUARE**: 5 scenes labeled "3"

### Shows with Potential Player Mismatches:
- **PORCUPINES**: Scene 3B players don't match scores

---

## Next Steps

1. **Verify Excel Data**: Open Excel file and confirm scene labels for each show
2. **Fix Scene Naming**: Standardize all scene labels to match Excel convention
3. **Add Missing Players**: Fill in FOOTBATH player data
4. **Resolve Duplicates**: Rename duplicate scene labels with proper A/B/C suffixes
5. **Verify Player Lists**: Cross-check all player lists against Excel scores
6. **Test "All" Keyword**: Ensure all group games properly use "All" keyword

---

## Data Validation Checklist

- [ ] All scene labels match between CSV and Excel
- [ ] No duplicate scene labels within a show
- [ ] All scenes have player data (or intentionally blank)
- [ ] Player names match between CSV and Excel scores
- [ ] "All" keyword used consistently for group games
- [ ] Date format consistent (M/D/YYYY)
- [ ] Player name spelling consistent (Jesa not Jessa)

---

## Notes

- The app currently handles "All" keyword by expanding to all show players
- Scene metadata is matched using: DATE-TITLE-SCENE (all uppercase)
- Mismatches prevent scene titles and player names from displaying correctly
- Score data comes from Excel, player metadata comes from CSV
