# Contributing

TL;DR
- Small, incremental changes are easier to review.
- Conventional Commits. NO EMOJI
- AI contributions are not encouraged.

---

If you want to initiate a big change, please create an issue first to discuss it. Keep your changes small (KISS).

Please stick to following conventions :
- Commit messages should follow the [Semantic Commit Messages](https://www.conventionalcommits.org/en/v1.0.0/) format. 
- Format (with Biome) and lint
- Write a useful test when applicable. We can pair if you need help on this !

I quite like this part from Playwright's CONTRIBUTING.md
> Low-Quality AI Contributions: PRs that do not meet our quality standards or lack human oversight (including low-quality agentic submissions) will be closed without explanation.

## Tips

The project uses [Biome](https://biomejs.dev/) for format and lint. You may use `npm run lint:fix` to format and auto-fixes.

To test, run
```bash
npm run build && npm test
```

A great way to run the schematics is to use npm link. Means `npm link` this project, then run `npm link playwright-ng-schematics` on the target.

You can run a specific version of Angular CLI as bellow.
```bash
npx @angular/cli@18 e2e
```

npm publication is performed in CI. np is quite useful for everything else (bumping version, perform checks, prepare the release).
```bash
npx np --no-publish
```
