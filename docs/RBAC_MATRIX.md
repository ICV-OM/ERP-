# RBAC Matrix

| Area | Super Admin | HR Admin | HR Manager | Manager | Payroll | Recruiter | Employee | Auditor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Employee directory | All | All | All | Self + team | Read | Read | Self | Read |
| Employee write | ✓ | ✓ | ✓ | — | — | — | — | — |
| Attendance | ✓ | ✓ | ✓ | Team | Read | — | Self | Read |
| Leave | ✓ | ✓ | ✓ | Team approval | — | — | Self | Read |
| Payroll | ✓ | ✓ | ✓ | — | ✓ | — | — | Read |
| Recruitment | ✓ | ✓ | ✓ | — | — | ✓ | — | Read |
| Performance | ✓ | ✓ | ✓ | Team | — | — | Self | Read |
| Documents | ✓ | ✓ | ✓ | — | — | Read | Self | Read |
| Field workforce | ✓ | ✓ | ✓ | Team | — | — | — | — |
| Employee relations | ✓ | ✓ | ✓ | — | — | — | — | — |
| Offboarding | ✓ | ✓ | ✓ | — | — | — | — | — |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| Audit log | ✓ | ✓ | ✓ | — | — | — | — | ✓ |
| System admin | ✓ | — | — | — | — | — | — | — |

> The source code is the final enforcement point; this matrix is the intended business policy baseline and should be reviewed by ALTURUD before go-live.
