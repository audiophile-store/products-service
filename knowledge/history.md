# Change history

## 2026-10-02

- Added `--env-file=.env` to the development script so the application can read local configuration through `process.env`, without an additional package.
- Kept the production start script unchanged so Render can supply environment variables directly.
- Documented local environment loading and the minimum Node.js version in the README.
- Added an exported PostgreSQL pool in `src/db.ts`, using `DATABASE_URL` and the default maximum of 10 connections. Missing configuration fails explicitly, and idle connection errors are logged.
- The pool is not yet imported by the server; routes will use it when database queries are added.
- Declared the package as an ECMAScript module to match the existing import/export syntax and TypeScript `nodenext` configuration.
- Configured TypeScript to compile only `src` into `dist`, matching the production start command, and documented the build workflow.
