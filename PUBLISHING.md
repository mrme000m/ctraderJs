# Publishing `@mrme000m/ctraderjs`

Steps to publish a new version to npm:

1. Update the `version` field in `package.json` (use semantic versioning).
2. Run tests and lint: `npm run lint` (add tests where needed).
3. Build: `npm run build` (the `prepare` script will also run pre-publish steps automatically).
4. Ensure `README.md`, `CHANGELOG.md`, and `LICENSE` are up to date.
5. Publish (scoped package):

```bash
npm publish --access public
```

6. Tag the release and push the tag back to the repository:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Notes:
- The `prepare` script ensures the `build/` folder is produced during `npm publish` or `npm pack`.
- CI should run `npm run safe-build` and create release artifacts.
