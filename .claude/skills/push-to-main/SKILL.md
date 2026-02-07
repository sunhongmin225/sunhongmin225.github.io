---
name: push-to-main
description: Commit all staged/unstaged changes and push directly to the main branch
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
---

Commit the current changes and push directly to main. Follow these steps exactly:

1. Run `git status` (never use `-uall`) and `git diff` (staged + unstaged) in parallel to understand what changed.
2. Run `git log --oneline -5` to see recent commit message style.
3. If there are no changes (no untracked files, no modifications), tell the user there is nothing to commit and stop.
4. Verify you are on the `main` branch. If not, run `git checkout main` first.
5. Stage all relevant changed files by name (avoid `git add -A`). Do NOT stage files that likely contain secrets (`.env`, credentials, tokens).
6. Write a concise commit message (1-2 sentences) that reflects the nature of the changes. Use a HEREDOC:
   ```
   git commit -m "$(cat <<'EOF'
   Commit message here
   EOF
   )"
   ```
7. Push to origin main:
   ```
   git push origin main
   ```
8. Run `git status` to confirm success.
9. Report the commit hash and summary to the user.

If any step fails, stop and report the error — do not retry or force-push.
