// Applies patch-package patches, except on Vercel.
//
// Why the exception: patches/ currently holds ONE patch, against
// @capacitor-community/speech-recognition's Android Java — it teaches the
// plugin to bind the on-device recogniser and to accept a preferOffline
// option. That code is compiled by Gradle during the Capacitor build, which
// happens on this machine. Vercel builds the Next.js web app and never
// compiles a line of it.
//
// Leaving it on broke production for eight consecutive deploys. Vercel
// restores a cached node_modules between builds — the log shows "Installing
// dependencies" to postinstall in 1.6s, far too fast for a real install — and
// that cache had the patch ALREADY APPLIED. patch-package then tried to apply
// it again, the hunks did not match, and it exits non-zero, which fails
// `npm install` and therefore the whole deployment.
//
// Skipping is the honest fix rather than a workaround: the web build has no
// use for the patch. If a patch is ever added that the WEB build needs, this
// guard has to be revisited — hence the explicit list below rather than a
// blanket skip.
import { execSync } from "node:child_process";

const WEB_IRRELEVANT = ["@capacitor-community/speech-recognition"];

if (process.env.VERCEL) {
  console.log(
    `patch-package skipped on Vercel — the only patches are native-Android ` +
      `(${WEB_IRRELEVANT.join(", ")}) and are not used by the web build.`
  );
} else {
  execSync("npx patch-package", { stdio: "inherit" });
}
