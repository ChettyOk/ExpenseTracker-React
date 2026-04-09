#!/usr/bin/env bash
# Run Gradle with JDK 11+ on macOS when JAVA_HOME is unset or points at Java 8
# (e.g. /Library/Internet Plug-Ins/JavaAppletPlugin.plugin/...).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pick_macos_jdk() {
  /usr/libexec/java_home -v 21 2>/dev/null \
    || /usr/libexec/java_home -v 17 2>/dev/null \
    || /usr/libexec/java_home -v 11 2>/dev/null \
    || true
}

java_home_is_java8() {
  local home="${1:-}"
  [[ -z "$home" ]] && return 0
  [[ ! -x "$home/bin/java" ]] && return 0
  local line
  line="$("$home/bin/java" -version 2>&1 | head -1)"
  [[ "$line" == *"1.8"* ]] || [[ "$line" == *"\"1.8"* ]]
}

if [[ "$(uname -s)" == "Darwin" ]]; then
  MAC_JDK="$(pick_macos_jdk)"
  if [[ -n "$MAC_JDK" ]] && java_home_is_java8 "${JAVA_HOME:-}"; then
    export JAVA_HOME="$MAC_JDK"
  fi
fi

if [[ -z "${JAVA_HOME:-}" ]] || [[ ! -x "${JAVA_HOME}/bin/java" ]]; then
  echo "ERROR: Need JDK 11+ for Android Gradle. Set JAVA_HOME to a JDK 17/21 install." >&2
  echo "Example (macOS): export JAVA_HOME=\"\$(/usr/libexec/java_home -v 21)\"" >&2
  exit 1
fi

cd "$ROOT/android"
exec ./gradlew "$@"
