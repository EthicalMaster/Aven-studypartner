# Dedicated Aven storage account

The Supabase project is taher-portfolio (vwlxaesvvuitxqlmexsp). Its private
aven-materials bucket is limited to 5 MB per file. The dedicated user UID is
7b6b27ad-64a0-42d9-86b1-902fcc31939a. It is confirmed and not a portfolio owner.

Six RLS policies were applied on 23 October 2026 through the connected Supabase
integration under migration name aven_dedicated_storage_access:
- aven_bucket_boundary (restrictive, all operations)
- aven_bucket_read (dedicated user, SELECT only)
- aven_object_boundary (restrictive, all operations)
- aven_object_read, aven_object_upload, aven_object_delete

The boundary policies exclude other users from Aven's bucket and exclude Aven's
user from other buckets. They do not change portfolio-owner policies or grant
portfolio ownership. The account can still see public published portfolio text,
just as an anonymous visitor can; no general claim of complete project isolation
is made. Usage quotas are shared. Future policies/functions must preserve this boundary.

Live database checks impersonated the authenticated role and verified bucket
visibility, object INSERT/SELECT, cross-bucket upload denial, cross-account and
anonymous read denial, no private portfolio rows, and denial of save_portfolio_draft.
All test object metadata was rolled back and its absence verified. Supabase blocks
direct SQL storage deletion: deletion must be verified with the actual Storage API.
No real files were uploaded by the tests. Password login and file API round-trip
remain to be tested from the user's machine. Local SDK tests cover session renewal,
concurrent sign-in, UID mismatch, secret-key rejection and storage operations.

## Local settings

After importing this update, open `.env` and set:

```dotenv
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://vwlxaesvvuitxqlmexsp.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
SUPABASE_STORAGE_BUCKET=aven-materials
SUPABASE_STORAGE_USER_ID=7b6b27ad-64a0-42d9-86b1-902fcc31939a
SUPABASE_STORAGE_EMAIL=YOUR_DEDICATED_USER_EMAIL
SUPABASE_STORAGE_PASSWORD="YOUR_DEDICATED_USER_PASSWORD"
```

Copy the publishable key from Project Settings > API Keys. A legacy anon key also
works. Remove any old SUPABASE_SECRET_KEY entry: that credential is no longer used.
Keep the email/password private and quote the password so # is not treated as a
comment. Do not use your portfolio owner's login. Do not add the storage user to
portfolio_owners. Existing Neon and ONNX settings stay as configured.

Restart Aven, upload a NEW small PDF, wait for vectors, search, and download it.
Restart Aven again and confirm both search and file download still work. Verify the
file appears inside aven-materials in Supabase. Finally delete the test document
through Aven and verify its object disappears from the bucket. Test a second Aven
student cannot download the first student's document. Old local uploads are not
copied to Supabase; re-upload the ones needed. Do not change Railway yet.

## Existing project advisories

The security advisor reported two existing owner-guarded SECURITY DEFINER portfolio
functions callable by authenticated users. Both function definitions check
portfolio_owners; live role tests verified that this storage user cannot save drafts
or publish. No function permissions were changed. See the
[function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
It also reported existing disabled
[leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and an informational no-policy notice on the private request_limits table.
These account-wide settings were not changed as part of storage setup.
