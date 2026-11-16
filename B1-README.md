# B1 Grammar expansion (42 lessons)

The original Huy Forum-backed A1–general grammar lessons remain unchanged. This package adds 42 independently written B1 lessons, arranged into 8 modules, with Vietnamese explanations, sample sentences, mistakes and one multiple-choice question each. This is not a transcription of the bundled PDF and the B1 lessons deliberately have no source page.

## Start
Run `npm run build` and deploy `dist/` as the existing GitHub Pages workflow does. For local testing run `npm start`. Progress remains under the existing localStorage key and existing lesson IDs are preserved.

## Dataset
`web/b1-lessons.js` supplies `window.B1_LESSONS`; `web/b1-theory.js` supplies `window.B1_THEORY`. External standalone JSON is in the accompanying data pack.

## Limitations
The existing quiz engine uses the first question only; each new lesson contains exactly one. Quizzes sample across old and new lessons (there is currently no separate track switch). The new topics are labeled with numbered B1 categories. Existing original tests expect exactly 26 lessons and may need to be extended to reflect the expanded curriculum.
