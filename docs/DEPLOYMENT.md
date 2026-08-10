# Production Deployment Checklist

## Required infrastructure

- TLS-enabled reverse proxy / WAF
- Next.js application runtime
- PostgreSQL on a private network
- Enterprise identity provider for SSO/MFA
- Private encrypted object storage for employee documents
- Centralized logging / SIEM
- Secret manager / KMS
- Backup and disaster-recovery service

## Before go-live

1. Replace local credential login with or supplement it using corporate SSO + MFA.
2. Run the application database connection under a non-owner least-privilege role.
3. Configure country-specific payroll, statutory, leave and retention rules.
4. Add encrypted object storage and malware scanning for document uploads.
5. Configure production Redis/API-gateway rate limiting if running multiple app replicas.
6. Run SAST, dependency scanning, DAST and an independent penetration test.
7. Validate restore from encrypted backups.
8. Review every RBAC role with HR, Legal, Finance and IT Security.
9. Configure monitoring for failed logins, privilege changes, payroll access and export activity.
10. Establish a patch/update process for framework and dependency security releases.
