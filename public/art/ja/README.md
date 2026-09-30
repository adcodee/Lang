Japanese course art. LOCKED PNGs from
`vault#/Projects/Lang/Artwork/Lang-art-set-map.md` live here as `{id}.png`
(1024×1024, cream ground). The app looks up `/art/ja/{id}.png`.

Set B nodes:
node-learn, node-test, node-checkpoint, node-exam-open, node-exam-passed,
node-greet, node-intro, node-numbers, node-sort, node-time, node-family,
node-food, node-size, node-judge, node-blend

Set A skills: skill-reading, skill-speaking, skill-writing, skill-listening

Set G `ui-*` PNGs are templates. Runtime marks are SVG in
`components/ui/JaMark.tsx` (hear, mic, star, streak, point, correction,
context pill) so they stay sharp at 24–32px and can animate. Do not drop
the cream 1024 boards in as `<img>`.

## Recap panels — `recap-{lessonId}.png`

Illustrated panels shown at the top of a lesson's Learn-phase recap page.
Looked up **by convention, not declared in content**: `TeachSummary` asks for
`/art/ja/recap-{lessonId}.png` on every recap page and renders nothing when it
404s. To add one, drop the file in with the right name — no code or content
change, no rebuild of `beginner.ts`.

Lesson ids are the ones in `lib/content/ja/levels/*.ts`, e.g.
`recap-u7-wa-ga.png`, `recap-u1-vowels.png`.

These are **not** Set B/A boards: landscape, free format, and they may carry
baked-in labels. Two things to know before generating a batch:

- **Text in the image does not translate.** Luganda and Spanish reuse the app,
  not the panel. A panel that teaches through the picture ports; one that
  teaches through its English captions has to be redrawn per language.
- **Phone width is ~360px.** A 1792px panel's captions are unreadable inline,
  so the recap page makes the panel tappable — full screen, fitted to height
  and panned sideways. Fewer, larger words still read better inline.

None present yet. The recap pages render without one until files land here.
