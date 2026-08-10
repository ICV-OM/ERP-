# Security Architecture

## Trust boundaries

1. Browser is untrusted.
2. Proxy verifies cryptographic session token for route gating.
3. Server layout/API revalidates the session against the database to support revocation.
4. API permissions are checked server-side with RBAC.
5. Queries bind `organization_id` for tenant/entity isolation.
6. All user input reaching write APIs is validated and SQL is parameterized.

## Production controls to add

- SSO + MFA using the company's corporate identity provider.
- Database non-owner role and least-privilege grants.
- PostgreSQL RLS if the deployment model requires hard tenant isolation.
- KMS/Vault-backed application secrets and rotation.
- Private object storage for HR documents, signed short-lived download URLs, malware scanning and DLP.
- SIEM forwarding for audit/security events.
- WAF, bot protection and centralized rate limiting (Redis/gateway) for horizontally scaled deployments.
- SAST, DAST, dependency/SBOM scanning and patch management.
- Encrypted backups and tested disaster recovery.
- Privacy/retention controls by country and data class.
- Independent penetration test before production release.

## Never store

Do not store card data, plaintext passwords, session tokens, access tokens or document files directly in application logs. Sensitive documents should be stored outside the web root in encrypted private object storage.
