# SKILL: Vite

## Description
Complete Vite 8 guide covering Rolldown (Rust-based bundler), Oxc tooling, Lightning CSS, configuration, build optimization, plugins, SSR, deployment, and migration.

## When to Use
- Building or migrating to Vite 8 projects
- Understanding Rolldown/Rust-based build pipeline
- Developing Vite plugins and configuring complex setups
- Implementing SSR, HMR, code-splitting, and deployment
- Troubleshooting Vite builds and environmental differences

## Files

| File | Covers |
|------|--------|
| 01-introduction.md | Vite 8 overview, Rolldown (Rust bundler), Oxc, Lightning CSS, ecosystem |
| 02-configuration.md | Config file, define, env vars, mode, shared/dev/preview config |
| 03-build-optimization.md | Build pipeline, minification, tree-shaking, chunking, CSS optimization |
| 04-code-splitting.md | Code-splitting strategies, manual chunks, dynamic imports, lazy loading |
| 05-assets-and-css.md | Asset handling, CSS (PostCSS, Lightning CSS, modules), SVG, static resources |
| 06-plugin-development.md | Plugin API: hooks, virtual modules, transform, resolve, load |
| 07-environment-api.md | Environment API: dev/preview/build environments, environment-specific config |
| 08-performance.md | Performance profiling, build speed, dev server optimization, caching |
| 09-migration-v8.md | Migration from Vite 5/6/7 to V8: breaking changes, Rolldown transition |
| 10-ssr.md | SSR: rendering, data fetching, hydration, framework integration |
| 11-deployment.md | Deployment strategies: static hosting, serverless, Docker, CDN |
| 12-javascript-api.md | JS API: build, serve, createServer, programmatic usage |
| 13-hmr-api.md | HMR API: hot module replacement, custom HMR handlers, WebSocket |
| 14-glob-imports-env.md | Glob imports, env variables, VITE_ prefix, mode-based env |
| 15-cli-troubleshooting.md | CLI commands, flags, troubleshooting common issues, debug |
| 16-backend-advanced-base.md | Backend integration, proxy, advanced base path, multi-page |
| 17-dep-breaking-changes.md | Dependency handling, breaking changes in dependencies, resolution |
| 18-library-mode.md | Library mode: build config for libraries, externalization, formats |
| 19-server-options-deep.md | Server options: port, host, https, cors, proxy, middleware |
| 20-build-options-deep.md | Build options: target, polyfills, assetsInlineLimit, cssCodeSplit |
| 21-config-edge-cases.md | Edge cases: conditional config, async config, conditional plugins |
| 22-css-svg-performance.md | CSS/SVG specific performance: Lightning CSS optimization, SVG loading |
| 23-plugin-supplements.md | Plugin supplements: additional hooks, ordering, enforce, virtual CSS |
| 24-preview-worker-deploy.md | Preview mode, web workers, service workers, deploy checks |
| 25-recommended-implementation.md | Recommended patterns, project structure, best practices, architecture |

## How to Read
Read 01-introduction.md first. For new projects read 02, 06, 11. For migration read 09 + 17. For performance read 03 + 08 + 22. For SSR read 10. Each file is self-contained with cross-references.

## Prerequisites
- Node.js / JavaScript / TypeScript
- Basic build tool concepts (webpack, rollup, or previous Vite experience)

## Related Guides
- (none yet)
