const fs = require("fs");
const https = require("https");

const sha = process.env.CF_PAGES_COMMIT_SHA;

// helper: fetch GitHub commit message
function getCommitMessage(callback) {
  https.get({
    hostname: "api.github.com",
    path: `/repos/${process.env.CF_PAGES_GITHUB_REPO}/commits/${sha}`,
    headers: { "User-Agent": "cloudflare-pages" }
  }, res => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      const json = JSON.parse(data);
      const msg = json.commit.message.split("\n")[0];
      callback(msg);
    });
  });
}

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

getCommitMessage((msg) => {
  const output =
`Last updated (Central Time): ${formatTime()}
Commit: ${sha}
Change: ${msg}`;

  fs.writeFileSync("update.txt", output);
});
