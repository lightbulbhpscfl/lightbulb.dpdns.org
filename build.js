const fs = require("fs");
const https = require("https");

const sha = process.env.CF_PAGES_COMMIT_SHA || "unknown";

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

function writeFile(commitMessage = "Unavailable") {
  const output =
`Last updated (Central Time): ${formatTime()}
Commit: ${sha}
Change: ${commitMessage}`;

  fs.writeFileSync("update.txt", output);
}

// Try GitHub API (optional enhancement)
const options = {
  hostname: "api.github.com",
  path: `/repos/${process.env.GITHUB_REPOSITORY}/commits/${sha}`,
  headers: {
    "User-Agent": "cloudflare-pages"
  }
};

https.get(options, (res) => {
  let data = "";

  res.on("data", chunk => data += chunk);

  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      const msg = json?.commit?.message?.split("\n")[0];
      writeFile(msg || "No message");
    } catch {
      writeFile("Could not fetch commit message");
    }
  });
}).on("error", () => {
  writeFile("GitHub API error");
});
