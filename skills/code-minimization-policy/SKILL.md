---
name: code-minimization-policy
description: Strict engineering rule and best practices for writing minimal, compact, readable code and preventing bloat.
---

# Code Minimization & Anti-Bloat Engineering Policy

## Core Directive
> **"Never write excessive code. Always favor the simplest, most compact, readable, and maintainable implementation. Refactor and eliminate duplicate code ruthlessly."**

When building or editing code in this workspace, the agent must adhere to the following strict principles at all times:

---

## 1. Zero-Excessive-Code Rules

1. **Max Lines per File Limit**:
   - Backend modules: **Strictly under 150–250 lines**. If a file grows beyond 250 lines, it is doing too much and must be decomposed.
   - Frontend components: **Strictly under 150–300 lines**. Avoid monolithic 3,000-line components like the legacy `CommandCenter.jsx`.
2. **Favor Built-Ins Over Heavy Libraries**:
   - Use Node.js built-ins (`crypto`, `http`, `https`, `fs`, `path`, `os`, `url`) rather than installing external npm wrappers.
   - Example: Use Node `crypto.pbkdf2Sync` and `crypto.createHmac` for JWT and auth rather than 10 different npm packages.
3. **No Over-Engineering & Speculative Code (YAGNI)**:
   - Do not write abstract factory classes, recursive wrapper facades, or monkey patches for features that are not currently requested.
   - Write direct, transparent functions with clear input and output contracts.
4. **DRY (Don't Repeat Yourself)**:
   - Never duplicate large components across apps (e.g. `client` and `master` copying 3,000 lines of `CommandCenter.jsx`).
   - Extract shared domain models, hooks, and helpers into clean, single-source modules.
5. **No Dead or Unused Code**:
   - Immediately purge commented-out code, unused variables, obsolete fallback branches, and dead dependencies.
   - Never keep backup files (`.backup`, `.old`, `.corrupt`) in source directories.
6. **No Sprawling Folder Structures**:
   - Keep folder hierarchies shallow (max 2 levels deep).
   - Avoid nesting 8 folders deep (`src/services/scrapers/internal/wrappers/engines/...`).

---

## 2. Refactoring & Compaction Checklist

Before creating or editing any code, ask:
- [ ] *Can this feature be written in 50 lines instead of 200 lines?*
- [ ] *Are we using native language capabilities instead of adding a new dependency?*
- [ ] *Is this logic already written elsewhere in the project? If so, reuse it.*
- [ ] *Is the module easily understood by a developer in under 2 minutes of reading?*
- [ ] *Did we remove the legacy code that this new code replaces?*

---

## 3. Zero Security Vulnerabilities & Dependency Hygiene

1. **Zero Vulnerability Standard**:
   - `npm audit` across all workspaces (`server`, `client`, `master`, `admin`) must always report **0 vulnerabilities**.
   - If a large third-party library has deep nested vulnerabilities (e.g. Firebase bringing in old gRPC or Protobuf), resolve them immediately using package.json `overrides` or replace with lean native alternatives.
2. **Purge Heavy Unused Libraries**:
   - Do not pull in 600 KB WebGL engines (`three`) for simple 2D icons; use CSS gradients and SVGs.
   - Do not pull in dead audio libraries or pollers when audio/specialized polling is not in use.
3. **No Experimental "Lab" Leftovers**:
   - Delete all `lab/` directories (both root and `server/public/lab`) in production code. No dead playground code permitted in the repository.
4. **Hook Decomposition Architecture**:
   - Extract stateful event streams and collections into dedicated hooks (`useSweepStream`, `useLeadsVault`) keeping coordinator components under 250 lines.
