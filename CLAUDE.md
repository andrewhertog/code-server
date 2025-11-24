# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

codex runs VS Code on a remote server and makes it accessible through a browser. It works by:
1. Embedding VS Code as a git submodule (`lib/vscode`)
2. Applying patches using Quilt to modify VS Code's behavior
3. Providing an HTTP/WebSocket server that serves VS Code in the browser
4. Implementing authentication, proxying, and other server-side functionality

## Build & Development Commands

### Initial Setup
```bash
git submodule update --init
quilt push -a
npm install
npm run build
VERSION=0.0.0 npm run build:vscode
npm run release
```

### Development Mode
```bash
npm run watch
# Launches codex at localhost:8080 with live reload
# Note: Building takes a very long time. Display language support only works in full builds.
```

### Build Commands
- `npm run build` - Build codex into `./out` and bundle frontend into `./dist`
- `npm run build:vscode` - Build VS Code into `./lib/vscode/out-vscode`
- `npm run release` - Bundle everything into `./release` directory
- `npm run clean` - Remove all build artifacts

### Testing
- `npm run test:unit` - Run Jest unit tests (in `test/unit/`)
- `npm run test:e2e` - Run Playwright end-to-end tests (in `test/e2e/`)
- `npm run test:integration` - Run integration tests (tests built packages)
- `npm run test:scripts` - Run bats script tests (in `test/scripts/`)

### Code Quality
- `npm run fmt` - Run prettier and doctoc formatters
- `npm run lint:ts` - Run eslint on TypeScript/JavaScript (excludes `lib/vscode`)

### Packaging
```bash
npm run release:standalone  # Create standalone releases
npm run package            # Package into .tar.gz, .deb, .rpm
```

## Patch Management with Quilt

**CRITICAL**: Always use Quilt to manage patches when making changes in `lib/vscode`.

### Working with Patches
```bash
quilt push -a          # Apply all patches
quilt pop -a           # Remove all patches
quilt push             # Apply next patch
quilt pop              # Remove current patch

quilt new {name}.diff  # Create new patch
quilt add [-P patch] {file}  # Add file to patch (MUST do before editing)
# Make your changes...
quilt refresh          # Save changes to patch

quilt series           # List all patches
quilt applied          # List applied patches
```

### Patch Guidelines
- Files **must** be added with `quilt add` before making changes
- Each patch must result in a working codex (no broken intermediate states)
- Add comments in patches explaining the reason and how to reproduce the behavior
- Every patch should have an e2e test

### Updating VS Code Version
1. `quilt pop -a` - Remove all patches
2. Update `lib/vscode` submodule to desired release branch
3. `quilt push` each patch one at a time
   - If lines changed but no conflicts: `quilt refresh`
   - If conflicts: `quilt push -f`, manually fix rejections, then `quilt refresh`
4. `npm install` from project root
5. Check Node.js version matches VS Code's Electron version

### Current Patches (in `patches/series`)
The patches directory contains modifications to VS Code including:
- `integration.diff` - Core integration with codex
- `branding.diff` - Branding customizations
- `base-path.diff` - Support for running under a base path
- `marketplace.diff` - Custom marketplace configuration
- `telemetry.diff` - Telemetry modifications
- `disable-chat.diff`, `disable-builtin-views.diff` - UI customizations
- `hide-activity-bar-badges.diff` - Activity bar customizations
- And others (see `patches/series` for complete list)

## Architecture

### Directory Structure
- `src/node/` - Node.js server code (HTTP server, CLI, authentication)
  - `entry.ts` - Main entry point, CLI argument parsing
  - `main.ts` - Server initialization logic
  - `cli.ts` - Command-line argument parsing and configuration
  - `app.ts` - Express app setup
  - `http.ts` - HTTP server creation and TLS handling
  - `routes/` - HTTP route handlers
    - `index.ts` - Route registration and middleware setup
    - `login.ts`, `logout.ts` - Authentication routes
    - `vscode.ts` - VS Code server routes
    - `pathProxy.ts`, `domainProxy.ts` - Proxy functionality
    - `health.ts`, `update.ts` - Health checks and update checks
  - `wrapper.ts` - Process wrapper for spawning child processes
  - `vscodeSocket.ts` - WebSocket handling for VS Code
- `src/browser/` - Browser-side code served to clients
- `src/common/` - Shared code between browser and Node.js
- `lib/vscode/` - VS Code submodule (do NOT modify directly, use Quilt patches)
- `patches/` - Quilt patches applied to `lib/vscode`
- `test/` - Test suites
  - `e2e/` - Playwright end-to-end tests
  - `unit/` - Jest unit tests
  - `integration/` - Integration tests
  - `scripts/` - Bats script tests
- `ci/` - CI scripts and build tooling
  - `build/` - Build scripts
  - `dev/` - Development scripts
  - `steps/` - CI step scripts
- `out/` - Built codex output
- `dist/` - Bundled frontend
- `release/` - Final packaged release

### Request Flow
1. Client connects to Express server (`src/node/app.ts`, `src/node/routes/index.ts`)
2. Authentication middleware checks credentials (password/no auth)
3. Routes registered in `src/node/routes/index.ts`:
   - `/login`, `/logout` - Authentication
   - Static assets served from `dist/` and VS Code
   - VS Code routes proxy to embedded VS Code server
4. WebSocket connections handled by `vscodeSocket.ts` and `wsRouter.ts`
5. VS Code runs in `lib/vscode` with patches applied

### Key Components
- **Heart**: Heartbeat mechanism to track if server is in use (`src/node/heart.ts`)
- **Wrapper**: Process management for spawning/managing child processes (`src/node/wrapper.ts`)
- **SettingsProvider**: Manages codex settings in `codex.json` (`src/node/settings.ts`)
- **UpdateProvider**: Checks for codex updates (`src/node/update.ts`)
- **Proxy**: Domain and path-based proxying for forwarded ports

## Common Development Tasks

### Running a Single Test
```bash
# E2E test
npx playwright test test/e2e/terminal.test.ts

# Unit test
npm run test:unit -- test/unit/cli.test.ts
```

### Testing Patches
After modifying a patch with `quilt refresh`:
```bash
npm run build:vscode  # Rebuild VS Code with new patches
npm run watch         # Test in development mode
```

### Debugging "Forbidden access" Error
This means patches didn't apply correctly (auth patch is missing). Run:
```bash
quilt pop -a
quilt push -a
```

## Known Issues
- Creating and debugging custom VS Code extensions doesn't work
- Extension profiling and tips are disabled
- Display language support only works in full builds, not development mode
- I will run the `npm run build:vscode` manually as it takes 30+ minutes to run