const fs = require("fs");

function formatTime() {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function safeWrite() {
  try {
    const sha = process.env.CF_PAGES_COMMIT_SHA || "unknown";

    const output =
`Last updated (Central Time): ${formatTime()}
Commit: ${sha}`;

    fs.writeFileSync("update.txt", output);
  } catch (e) {
    console.log("update.txt skipped:", e.message);
  }
}

safeWrite();
