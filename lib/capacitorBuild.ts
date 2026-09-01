// Set only by scripts/build-capacitor.sh, never by the normal `next build`
// (Vercel or local). Gates generateStaticParams in the three dynamic
// routes: returning real params makes Next statically prerender every
// lesson/exam/drill page at build time, which `output: "export"` requires
// — but doing that in the *normal* build silently changes production from
// on-demand rendering (ƒ) to build-time static generation, which is a
// real behaviour change this project didn't ask for and turned out to
// break on a pre-existing latent bug (see LessonFlow.tsx's Suspense fix).
// Returning [] here keeps the normal build exactly as it was.
export const IS_CAPACITOR_BUILD = process.env.CAPACITOR_BUILD === "1";
