#!/usr/bin/env node
/**
 * PostToolUse hook (Edit|Write). Fires after the site source is edited and reminds
 * the assistant to keep the live docs current. Reads the hook JSON on stdin and, if the
 * edited file is under the deployable site folder, injects additionalContext.
 *
 * Wired up in .claude/settings.json. Silent (exit 0, no output) for any edit outside the
 * site folder — including edits to the docs themselves — so it never loops on itself.
 */
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let file = "";
  try {
    file = JSON.parse(raw)?.tool_input?.file_path ?? "";
  } catch { /* no/!JSON stdin — nothing to do */ }

  const norm = file.replace(/\\/g, "/");
  const inSite = norm.includes("github-export/");
  if (!inSite) {
    process.exit(0); // not a site file — stay quiet
  }

  const context =
    "You just edited the deployable site source. Before ending this turn, keep the " +
    "live docs current (see CLAUDE.md):\n" +
    "1. Run `node docs/gen-sitemap.mjs` to refresh docs/SITE-MAP.generated.md.\n" +
    "2. Append an entry to docs/CHANGELOG.md (date · what changed · why).\n" +
    "3. If you changed sections/anchors/structure, update docs/SITE-GUIDE.md too.";

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: context,
      },
    })
  );
  process.exit(0);
});
