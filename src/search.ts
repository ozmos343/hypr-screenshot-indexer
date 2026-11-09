import { searchScreenshots } from "./db";
import { spawn } from "child_process";

const args = process.argv.slice(2);
const copyMode = args.includes("--copy");
const query = args.filter((a) => !a.startsWith("--")).join(" ").trim();

const results = searchScreenshots(query, 30);

if (results.length === 0) {
  console.log("No screenshots found");
  process.exit(0);
}

// Format items for dmenu/rofi/wofi:
// "YYYY-MM-DD [type] slug | summary"
// We store filepath in a hidden delimiter or map
const lines = results.map((r) => {
  const dateStr = r.created_at ? r.created_at.slice(0, 10) : "";
  return `${dateStr}  ${r.slug.padEnd(28)} │ ${r.summary}\t${r.filepath}`;
});

console.log(lines.join("\n"));
