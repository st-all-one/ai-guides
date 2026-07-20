# SKILL: Askama Guide

## Description
Askama v0.16.0 — a compile-time, type-safe template engine for Rust based on Jinja syntax, generating Rust code from templates for zero-cost abstraction and XSS-safe HTML.

## When to Use
- Generating HTML, XML, or text output from Rust applications
- Building server-rendered views with Axum, Actix-Web, Rocket, Warp, or Poem
- Needing type-safe templates validated at compile time
- Migrating from runtime template engines (Tera, Handlebars) to compile-time rendering
- Creating reusable template inheritance chains, macros, and custom filters

## Files
| File | Covers |
|------|--------|
| `01-introduction.md` | Why Askama, feature highlights, installation, Cargo.toml setup |
| `02-template-creation.md` | `#[derive(Template)]`, template directory, struct-to-template binding |
| `03-template-enums.md` | Enums with `#[template]` per variant, pattern-matched rendering |
| `04-runtime-values.md` | Variables, `{% let %}`, `{% for %}`, `{% if %}`, filters in expressions |
| `05-debugging.md` | `ASKAMA_DUMP` env, `Template::render_errors()`, template source inspection |
| `06-configuration.md` | `Askama.toml`, custom delimiters, whitespace control, extensions |
| `07-template-syntax.md` | Full syntax reference: `{{ }}`, `{% %}`, `{# #}`, `{% block %}`, `{% extends %}` |
| `08-filters.md` | Built-in filters (lower, upper, escape, json, join, truncate), custom filter registration |
| `09-integration-web.md` | Integration with Axum, Actix-Web, Rocket, Warp, Poem — response helpers, status codes |
| `10-advanced-patterns.md` | Composition, inheritance chains, `{% call %}` with macros, performance optimization |
| `11-faq-troubleshooting.md` | Common errors, lifetime issues, generic templates, debugging tips |

## How to Read
- Start with `01-introduction.md` to understand the compile-time model
- Read `02-template-creation.md` and `04-runtime-values.md` for the core template-authoring flow
- Read `03-template-enums.md` if generating output per enum variant
- Read `09-integration-web.md` for web framework setup
- Use `07-template-syntax.md` and `08-filters.md` as syntax references
- Consult `11-faq-troubleshooting.md` for common pitfalls

## Prerequisites
- Rust stable (no nightly required)
- Familiarity with Jinja/Django template syntax
- A web framework (Axum, Actix-Web, etc.) for server integration

## Related Guides
- `ai_guides/css_guide/` — styling rendered HTML
- `ai_guides/alpine_js_guide/` — adding client interactivity to Askama-rendered SSR pages
