#!/bin/sh
set -eu

echo "Installing VS Code extensions..."

# List of extensions to install (publisher.extension-name format)
EXTENSIONS="
  frontier-rnd.frontier-authentication
  project-accelerate.codex-editor-extension
"

for ext in $EXTENSIONS; do
  echo "Installing $ext..."
  /usr/bin/code-server --install-extension "$ext" || echo "Failed to install $ext"
done

echo "Extension installation complete!"
