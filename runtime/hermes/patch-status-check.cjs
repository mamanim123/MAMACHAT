const fs = require("fs");

const file = "F:/mamabot/app/api/hermes/status/route.js";
let content = fs.readFileSync(file, "utf8");

const fnMatch = content.match(/function\s+(checkPortableHermes\w*)\s*\(/);
if (!fnMatch) {
  console.error("FUNCTION_NOT_FOUND: checkPortableHermes*");
  process.exit(1);
}

const fnName = fnMatch[1];
const start = content.search(/function\s+checkPortableHermes\w*\s*\(/);
const end = content.search(/function\s+checkWslPathAccess\s*\(/);

if (start < 0 || end < 0 || end <= start) {
  console.error("FUNCTION_RANGE_NOT_FOUND");
  process.exit(1);
}

const replacement = `function ${fnName}() {
  const paths = getHermesPaths();

  if (!paths.portableRootWsl) {
    return {
      ok: false,
      result: "Could not convert Mamabot path to WSL path"
    };
  }

  const venvHermes = joinWslPath(paths.hermesInstallDirWsl, "venv", "bin", "hermes");
  const dotVenvHermes = joinWslPath(paths.hermesInstallDirWsl, ".venv", "bin", "hermes");
  const rootHermes = joinWslPath(paths.hermesInstallDirWsl, "hermes");
  const cliPy = joinWslPath(paths.hermesInstallDirWsl, "cli.py");
  const pyproject = joinWslPath(paths.hermesInstallDirWsl, "pyproject.toml");

  const script = [
    "set +e",
    "export HERMES_HOME=" + shellQuote(paths.hermesHomeWsl),
    "export HOME=\\"$HERMES_HOME\\"",
    "cd " + shellQuote(paths.hermesInstallDirWsl) + " || { echo CD_FAILED; exit 20; }",
    "echo PORTABLE_ROOT=" + shellQuote(paths.portableRootWsl),
    "echo HERMES_HOME=$HERMES_HOME",
    "for bin in " + shellQuote(venvHermes) + " " + shellQuote(dotVenvHermes) + " " + shellQuote(rootHermes) + "; do",
    "  if [ -x \\"$bin\\" ]; then",
    "    echo HERMES_BIN=$bin",
    "    \\"$bin\\" --help >/tmp/mamabot-hermes-help.txt 2>&1",
    "    code=$?",
    "    head -5 /tmp/mamabot-hermes-help.txt",
    "    if [ \\"$code\\" -eq 0 ]; then",
    "      echo CHECK_OK",
    "      exit 0",
    "    fi",
    "  else",
    "    echo MISSING_OR_NOT_EXECUTABLE=$bin",
    "  fi",
    "done",
    "if [ -f " + shellQuote(cliPy) + " ] && [ -f " + shellQuote(pyproject) + " ]; then",
    "  echo FALLBACK_SOURCE_PRESENT",
    "  exit 0",
    "fi",
    "echo CHECK_FAILED",
    "exit 1"
  ].join("\\n");

  const result = runWsl(script);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\\n").trim();
  const binLine = output.split(/\\r?\\n/).find((line) => line.startsWith("HERMES_BIN="));

  if (result.ok) {
    return {
      ok: true,
      result: "Portable Hermes found",
      bin: binLine ? binLine.replace("HERMES_BIN=", "") : "",
      details: output
    };
  }

  return {
    ok: false,
    result: "Portable Hermes check failed in WSL",
    details: output || result.error || ""
  };
}
`;

content = content.slice(0, start) + replacement + "\n\n" + content.slice(end);

fs.writeFileSync(file, content, "utf8");

console.log("PATCH_OK");
console.log("Function:", fnName);