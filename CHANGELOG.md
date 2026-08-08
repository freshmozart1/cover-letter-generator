# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-08-08

### Added

- `npm run lint` (`eslint .`) and `npm run format` (`prettier --write .`) npm scripts (closes #2).

### Fixed

- ESLint's typed-linting `parserOptions.project` now covers both `tsconfig.json` and `tsconfig.test.json`, fixing a crash `npm run lint` would hit on any future `test/**/*.ts` file.
