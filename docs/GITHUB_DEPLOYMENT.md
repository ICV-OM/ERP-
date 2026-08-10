# GitHub workflow

The production source belongs in a private repository or protected branch.

## Required secrets policy
Never commit:

- `.env.local`
- Supabase database passwords / connection strings
- `SESSION_SECRET`
- seed administrator passwords

The supplied `.gitignore` excludes local environment files.

## Recommended flow

1. Push source to GitHub.
2. Protect `main` and require pull-request review.
3. Connect the repository to the hosting provider.
4. Configure production environment variables in the hosting provider, not GitHub source files.
5. Run migrations against the intended Supabase project before first production use.
