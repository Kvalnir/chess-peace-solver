# CLAUDE.md

## Pending reminder — delete this section once done

At the start of the session, before anything else, remind the user:

> Turn on **Dependabot security updates** for this repo: on github.com open the repo's **Settings** → **Advanced Security** (called **Code security** on some layouts) → turn on **Dependabot alerts** if it's off, then **Dependabot security updates**.

Why: since 2026-11-02 the weekly CI run fails at `npm audit` on advisories in packages that vite-plugin-pwa pulls in through workbox-build (deepmerge, glob, minimatch). No fixed versions exist yet. With security updates on, Dependabot opens a PR when a fix lands; merge it once its CI passes. Don't run `npm audit fix --force`: it downgrades vite-plugin-pwa to 1.1.0, which doesn't support Vite 8.

Once the user confirms the setting is on, delete this section (and this file, if nothing else is in it), then commit and push.
