# Day-31 DPDP Audit — Test Plan & Evidence Template

_Run with 3 test clients seeded (Client A, Client B, Client C). Document evidence here._

## Roles & test users

| Role | Email | Purpose |
|------|-------|---------|
| Admin | `audit-admin@fiscalfulcrum.in` | Full firm access |
| Team (capability-restricted) | `audit-team@fiscalfulcrum.in` | Granted only `tasks.assign`, `compliance.enter` |
| Client A | `client-a@example.com` | Linked to Client A only |
| Client B | `client-b@example.com` | Linked to Client B only |
| Client C | `client-c@example.com` | Linked to Client C only |

## Test cases

### RLS-1 — Cross-client data isolation
- Login as Client A, attempt to GET `/portal/documents`. **Expected:** Only Client A documents.
- Inspect XHR for documents not belonging to Client A. **Expected:** 0 leaked records.
- Repeat for clients/queries/tasks/notices/vcfo/bizlens.

### RLS-2 — Capability gating
- Login as Team (granted only `tasks.assign`).
- Attempt `clients.create` via Server Action. **Expected:** `FORBIDDEN_CAPABILITY` error.
- Attempt `dsc.manage`. **Expected:** Error.

### RLS-3 — Portal visibility filter
- As Admin, disable `portal.documents` for Client A.
- Login as Client A. **Expected:** Documents nav item hidden; direct GET `/portal/documents` returns redirect/forbidden.

### RLS-4 — Credential decrypt audit
- As Admin, reveal a credential.
- Query `global_audit_log WHERE action='credential.decrypt'`. **Expected:** Row exists with correct `entity_id`.

### RLS-5 — Document visibility toggle
- As Team, upload document with `visible_to_client=false`.
- Login as the linked client. **Expected:** Document not visible.
- Toggle to `true`. **Expected:** Now visible; in-app notification fired.

### RLS-6 — Soft-deleted records hidden
- Soft-delete a client.
- Login as another team member. **Expected:** Client gone from list.

### RLS-7 — BizLens per-client isolation
- Save BizLens snapshot as Team for Client A.
- Switch BizLens period to Client B. **Expected:** Client A state never appears.

### RLS-8 — Notice / hearing visibility
- Create notice for Client A.
- Login as Client B portal. **Expected:** Notice not visible.

### RLS-9 — Audit log integrity
- Confirm `staff_capabilities` grants & revokes are written to `global_audit_log` with the right `performed_by`.

### RLS-10 — Encrypted-at-rest verification
- Direct DB query: `SELECT encrypted_password FROM credentials LIMIT 1` should return `v1:...:...:...` ciphertext, never plaintext.

## Evidence

Attach screenshots / SQL output snippets per test case. Sign-off below.

| Test | Result | Notes |
|------|--------|-------|
| RLS-1 | ☐ | |
| RLS-2 | ☐ | |
| RLS-3 | ☐ | |
| RLS-4 | ☐ | |
| RLS-5 | ☐ | |
| RLS-6 | ☐ | |
| RLS-7 | ☐ | |
| RLS-8 | ☐ | |
| RLS-9 | ☐ | |
| RLS-10 | ☐ | |

Auditor: ____________________   Date: ____________________
