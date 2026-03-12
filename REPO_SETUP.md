# Publish this package as its own GitHub repo

This folder is a self-contained npm package. To make it the root of **https://github.com/Unic0rn0ver10ad/Phaser-Settings**:

## Option A: This folder becomes the new repo (from Time-Traders-V1)

1. **On GitHub**: Create a new **empty** repository named `Phaser-Settings` (no README, no .gitignore).

2. **In a terminal**, from this folder (`packages/phaser-settings`):

   ```bash
   git init
   git add .
   git commit -m "Initial commit: phaser-settings 0.1.0"
   git branch -M main
   git remote add origin https://github.com/Unic0rn0ver10ad/Phaser-Settings.git
   git push -u origin main
   ```

   Note: This creates a **nested** git repo inside Time-Traders-V1. The parent repo will still track `packages/phaser-settings` as regular files unless you remove the folder and add it as a submodule (see below).

## Option B: Clone the new repo elsewhere and copy contents

1. **On GitHub**: Create a new **empty** repository named `Phaser-Settings`.

2. **Clone and copy** (from any directory):

   ```bash
   git clone https://github.com/Unic0rn0ver10ad/Phaser-Settings.git
   cd Phaser-Settings
   ```

   Then copy into this clone **only** the package files (no `node_modules`, no `dist`):

   - `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`
   - `README.md`, `REPO_SETUP.md`, `.gitignore`
   - `src/` (entire directory)
   - `docs/` (entire directory)

3. **Commit and push**:

   ```bash
   git add .
   git commit -m "Initial commit: phaser-settings 0.1.0"
   git push -u origin main
   ```

## After the repo exists

- **Time-Traders** can depend on it via GitHub:
  - In `package.json`: `"phaser-settings": "github:Unic0rn0ver10ad/Phaser-Settings"`  
  - Or: `"phaser-settings": "https://github.com/Unic0rn0ver10ad/Phaser-Settings#main"`
  - Then run `npm install` and ensure the package builds (`npm run build` in the package or install runs prepare script if you add one).

- To **publish to npm** (optional): run `npm publish` from the package root (after `npm login`). Then apps can use `"phaser-settings": "^0.1.0"`.

## If you used Option A and want Time-Traders to use the GitHub repo

1. From the **Time-Traders-V1** root:
   ```bash
   git rm -r --cached packages/phaser-settings
   git submodule add https://github.com/Unic0rn0ver10ad/Phaser-Settings.git packages/phaser-settings
   git add .gitmodules packages/phaser-settings
   git commit -m "Use Phaser-Settings as submodule"
   ```

2. In `package.json`, change the dependency to the submodule path (keep `"file:./packages/phaser-settings"`) or to `"github:Unic0rn0ver10ad/Phaser-Settings"` if you prefer to install from GitHub instead of the local submodule.
