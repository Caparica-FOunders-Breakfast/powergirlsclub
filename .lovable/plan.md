

## Make Strength Levels Legend Collapsible

**What**: Turn the "Strength Levels" card into a collapsible section that users can expand/collapse, defaulting to collapsed.

**How** (single file: `src/components/scorecard/ExerciseScorecard.tsx`):
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Wrap the strength levels `motion.div` in a `Collapsible` component (default `open={false}`)
- Move the header ("STRENGTH LEVELS") into a `CollapsibleTrigger` with a chevron icon that rotates on open
- Move the levels content into `CollapsibleContent`

