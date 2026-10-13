# Current Feature: Init Project

## Status

In Progress

## Goals

- Move `app/` to `src/app/` (`page.tsx`, `layout.tsx`, `globals.css`, `favicon.ico`) with no `app/` folder left at the root
- `tsconfig.json`: `@/*` points to `["./src/*"]`
- `src/app/page.tsx`: Server Component that only renders `<h1>Panda Metrics</h1>`, centered with Tailwind, no `next/image`
- `src/app/layout.tsx`: metadata title "Panda Metrics" with a real description, `lang="en"`, Geist fonts kept
- `src/app/globals.css`: light colors as default in `:root`, dark colors in a `.dark` class (no `prefers-color-scheme`), no `Arial` override
- Delete the 5 boilerplate SVGs in `public/`
- Rewrite `README.md` with a short description and how to run it with yarn
- Add `.claude/settings.local.json` to `.gitignore`
- `yarn lint` and `yarn build` pass; `yarn dev` shows only "Panda Metrics" in light mode regardless of the system theme
- Connect `origin` to `git@github.com:Ellyonsoft/panda-metrics.git` and push `main` (no force-push)

## Notes

- Spec: `context/features/init-project-spec.md`. Research: `docs/init-project.md` (has the final code for `page.tsx`, `layout.tsx` and `globals.css`)
- Use `git mv app src/app` to keep history. Next.js ignores `src/app` if `app/` still exists
- Do not create `tailwind.config.*` or empty `src/components`, `src/lib`, `src/actions`, `src/types` folders
- Keep `next.config.ts` and `AGENTS.md` as they are
- Do not install shadcn/ui, next-intl, TanStack Query or Prisma in this feature
- SSH works (2026-10-13): `~/.ssh/config` loads the keys from the macOS keychain and `ssh -T git@github.com` authenticates as `Miguel-Rayon`
- `git ls-remote git@github.com:Ellyonsoft/panda-metrics.git` returns no refs: the remote is empty, so a plain `git push -u origin main` works
- Commit message: `chore: clean boilerplate and set up Panda Metrics base`

## History

<!-- Keep this updated. Earliest to latest -->
