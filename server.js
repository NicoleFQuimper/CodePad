const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json({ limit: "50kb" }));
app.use(cors());

// Rate limit: 30 runs per minute per IP
const limiter = rateLimit({ windowMs: 60_000, max: 30 });
app.use("/run", limiter);

// ── Health check ─────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", service: "CodePad Runner" }));

// ── Run code ─────────────────────────────────────────────────────────────
app.post("/run", async (req, res) => {
  const { code, language = "python" } = req.body;

  if (!code || code.length > 8000) {
    return res.status(400).json({ error: "Code missing or too long (max 8000 chars)" });
  }

  // Block dangerous patterns
  const BLOCKED = [
    /import\s+os/,    /import\s+subprocess/, /import\s+sys/,
    /__import__/,     /open\s*\(/,            /exec\s*\(/,
    /eval\s*\(/,      /shutil/,               /socket/,
    /urllib/,         /requests/,             /httpx/,
    /rmdir|remove|unlink|chmod/,
  ];
  for (const pattern of BLOCKED) {
    if (pattern.test(code)) {
      return res.json({
        stdout: "",
        stderr: `[BLOCKED] Dangerous operation detected: ${pattern.source.split("\\")[0]}`,
        exit_code: 1,
      });
    }
  }

  // Build the run command per language
  const RUNNERS = {
    python:     { ext: "py",  cmd: (f) => `timeout 10 python3 ${f}` },
    javascript: { ext: "js",  cmd: (f) => `timeout 10 node ${f}` },
    typescript: { ext: "ts",  cmd: (f) => `timeout 10 npx -y ts-node ${f}` },
  };

  const runner = RUNNERS[language];
  if (!runner) {
    return res.json({
      stdout: `[INFO] Language "${language}" is not directly executable on this server.\nYou can still use the ▶ Run button — Claude will simulate the output.\n`,
      stderr: "",
      exit_code: 0,
    });
  }

  const { randomUUID } = require("crypto");
  const tmpFile = `/tmp/${randomUUID()}.${runner.ext}`;
  require("fs").writeFileSync(tmpFile, code, "utf8");

  exec(runner.cmd(tmpFile), { timeout: 12000, maxBuffer: 512 * 1024 }, (err, stdout, stderr) => {
    // Clean up temp file
    try { require("fs").unlinkSync(tmpFile); } catch {}

    res.json({
      stdout: stdout || "",
      stderr: err?.killed ? "[TIMEOUT] Code exceeded 10 second time limit." : (stderr || ""),
      exit_code: err ? (err.code || 1) : 0,
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CodePad Runner on :${PORT}`));
