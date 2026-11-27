# SmartBin Backend Configuration Guide

Never commit secrets, connection strings with credentials, SMTP passwords, JWT keys, OTP keys, or object-storage credentials into `appsettings.json`, `appsettings.Development.json`, or any tracked file.

Use `appsettings.Example.json` only as a non-secret schema reference.

## Local Development (.NET User Secrets)

`SmartBin.csproj` already defines a `<UserSecretsId>`. In the `Development` environment, ASP.NET Core automatically loads User Secrets on top of `appsettings.json` and `appsettings.Development.json`.

Run the following commands from `backend/SmartBin/SmartBin/`:

```bash
# Database connection string (required at startup)
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=SmartBinDb;Trusted_Connection=True;TrustServerCertificate=True;"

# JWT signing key (required at startup, minimum 32 UTF-8 bytes)
dotnet user-secrets set "Jwt:Key" "<generate-random-secret-at-least-32-bytes>"

# OTP HMAC hashing key (required only for OTP registration/password-reset flows, minimum 32 characters; not required for Admin login)
dotnet user-secrets set "Otp:HashKey" "<generate-random-secret-at-least-32-chars>"

# SMTP settings (required only when sending verification or password reset emails)
dotnet user-secrets set "EmailSettings:Host" "smtp.example.com"
dotnet user-secrets set "EmailSettings:Port" "587"
dotnet user-secrets set "EmailSettings:SenderEmail" "no-reply@example.com"
dotnet user-secrets set "EmailSettings:Password" "<smtp-app-password>"

# Cloudflare R2 object storage (optional in Development via wwwroot/uploads fallback; required outside Development; PublicBaseUrl must use https://)
dotnet user-secrets set "CloudflareR2:AccountId" "<r2-account-id>"
dotnet user-secrets set "CloudflareR2:AccessKeyId" "<r2-32-char-access-key-id>"
dotnet user-secrets set "CloudflareR2:SecretAccessKey" "<r2-secret-access-key>"
dotnet user-secrets set "CloudflareR2:BucketName" "<r2-bucket-name>"
dotnet user-secrets set "CloudflareR2:PublicBaseUrl" "https://<your-r2-public-domain>"
```

## Production / Deployed Environments (Environment Variables)

Supply all secrets and deployment origins through your secret manager or environment variables using ASP.NET Core's `__` hierarchy separator:

| Configuration Key | Required? | Purpose |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | Required | SQL Server connection string |
| `Jwt__Key` | Required | HMAC-SHA256 signing key (at least 32 bytes) |
| `Jwt__Issuer` | Required (default in `appsettings.json`) | JWT issuer claim |
| `Jwt__Audience` | Required (default in `appsettings.json`) | JWT audience claim |
| `Jwt__ExpiresInMinutes` | Required (default `15`) | Access token lifetime in minutes |
| `Jwt__RefreshTokenExpiresInDays` | Required (default `30`) | Refresh token lifetime in days |
| `Otp__HashKey` | Required for OTP flows | HMAC key for OTP hashing (at least 32 chars) |
| `EmailSettings__Host` | Required for email flows | SMTP host |
| `EmailSettings__Port` | Required for email flows (default `587`) | SMTP port |
| `EmailSettings__SenderEmail` | Required for email flows | SMTP sender email |
| `EmailSettings__Password` | Required for email flows | SMTP password / app password |
| `CloudflareR2__AccountId` | Required for uploads | Cloudflare R2 account ID |
| `CloudflareR2__AccessKeyId` | Required for uploads | Cloudflare R2 access key ID (32 chars) |
| `CloudflareR2__SecretAccessKey` | Required for uploads | Cloudflare R2 secret access key |
| `CloudflareR2__BucketName` | Required for uploads | Cloudflare R2 bucket name |
| `CloudflareR2__PublicBaseUrl` | Required for uploads | Public `https://` base URL for stored objects |
| `Cors__AllowedOrigins__0` (or `Cors__AllowedOrigins`) | Required for browser clients | Explicit `http://` or `https://` origin allow-list (`appsettings.Development.json` permits `http://localhost:4200`; production has no default origins) |

## Startup & Development Demo Login

- **Identity roles (`USER_CITIZEN`, `OPS_COLLECTOR`, `SYS_ADMIN`)** are initialized idempotently at startup in all environments.
- **Development demo users and sample records** run **only** when `ASPNETCORE_ENVIRONMENT=Development`.
- **Development-only Admin demo login** (seeded by `DataSeeder.SeedDevelopmentDataAsync` in `Development` only, never in `Staging` or `Production`):
  - Email: `admin@ecobin.com`
  - Local dev password: defined in `Context/DataSeeder.cs` (`Admin123!`) — for local Development verification only; never reuse in deployed environments.
