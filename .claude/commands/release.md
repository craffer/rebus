Follow these steps to publish a new Rebus release to GitHub. Ask the user for the version number if they haven't specified one.

## Steps

### 1. Decide the version number

Follow semver (`MAJOR.MINOR.PATCH`). For context: we're currently in early development, so patch releases (0.1.x) are for bug fixes, minor releases (0.x.0) are for new features.

### 2. Update the version in two places

Both must match exactly:

- `package.json` → `"version"` field
- `src-tauri/tauri.conf.json` → `"version"` field

### 3. Run the full test suite

```bash
npm run test:coverage
cargo test --workspace
cargo clippy --workspace -- -D warnings
```

All must pass before proceeding.

### 4. Commit the version bump

```bash
git add package.json src-tauri/tauri.conf.json
git commit -m "Bump version to x.x.x"
```

### 5. Create and push the tag

This triggers the GitHub Actions release workflow. Do not push the tag until tests pass — re-triggering on the same tag requires deleting and recreating it.

```bash
git tag vx.x.x
git push origin master
git push origin vx.x.x
```

### 6. Monitor the build

Watch the three parallel jobs (macOS arm64, macOS x86_64, Windows) in the Actions tab on GitHub. Each takes roughly 10–15 minutes.

### 7. Publish the draft release

Once all three jobs succeed, go to the Releases page on GitHub. The release will be a **draft** — review the attached assets, then click **Publish release**.

## Notes

- The release workflow builds macOS (arm64 + x86_64) and Windows in a matrix; all three must succeed before publishing.
- Releases are always created as **drafts** so you can verify the artifacts before they go public.
- Rebus is not code-signed. macOS and Windows users will see security warnings on first launch — the README explains how to bypass them.
- Do not bump the version or push the tag without running tests first.
