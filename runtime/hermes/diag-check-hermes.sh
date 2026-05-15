#!/usr/bin/env bash
set +e

cd /mnt/f/mamabot/runtime/hermes/home/hermes-agent || {
  echo "CD_FAILED"
  exit 1
}

echo "PWD=$(pwd)"

echo "--- candidates ---"
for p in "./venv/bin/hermes" "./hermes" "./venv/bin/python" "./venv/bin/python3" "./cli.py" "./pyproject.toml"; do
  if [ -e "$p" ]; then
    echo "EXISTS $p"
    ls -l "$p" 2>&1
  else
    echo "MISSING $p"
  fi
done

echo "--- venv bin list partial ---"
ls -la ./venv/bin 2>&1 | head -80

echo "--- test ./venv/bin/hermes --help ---"
./venv/bin/hermes --help 2>&1 | head -30
echo "exit=$?"

echo "--- test ./hermes --help ---"
./hermes --help 2>&1 | head -30
echo "exit=$?"

echo "--- test python candidates ---"
./venv/bin/python --version 2>&1
echo "python_exit=$?"
./venv/bin/python3 --version 2>&1
echo "python3_exit=$?"

echo "--- test cli.py with venv python ---"
./venv/bin/python3 cli.py --help 2>&1 | head -30
echo "cli_py_exit=$?"