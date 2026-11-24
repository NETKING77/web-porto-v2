# Task Completion & Verification

Before considering a task finished:
1. Verify exact code edits without residual imports or syntax flaws.
2. Ensure no unrequested code or configuration was deleted.
3. If instructed by the user to verify/build:
   ```powershell
   npm run typecheck && npm run lint && npm run build
   ```
4. If git push is required:
   ```powershell
   git status -s
   git add <modified-files>
   git commit -m "<concise commit message>"
   git push origin master
   ```
5. Ensure GitHub Actions CI passes (view status with `gh run list --limit 1`).
