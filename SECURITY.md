# Security Guidelines

This document outlines the security practices implemented in this application.

## Environment Variables

**CRITICAL:** Never commit `.env.local` to the repository. It contains sensitive API keys.

Required environment variables (see `.env.example`):
- `VITE_GEMINI_API_KEY` - Google Gemini API key for carb prediction
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Setup Instructions

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your actual API keys in `.env.local`

3. Verify `.env.local` is in `.gitignore` (already included)

## API Key Security

### Gemini API
- Stored in `VITE_GEMINI_API_KEY` environment variable
- Key is passed via environment at build time
- API calls are made client-side (acceptable for non-sensitive operations)

### Supabase
- URL and anonymous key stored in environment variables
- The anonymous key is public-safe (designed for client-side use)
- Row-level security (RLS) policies must be enforced on the database level

## Authentication & Passwords

### Password Requirements
- Minimum 12 characters
- Must contain uppercase letter (A-Z)
- Must contain lowercase letter (a-z)
- Must contain number (0-9)
- Must contain special character (!@#$%^&*)

These requirements prevent weak passwords and common attacks.

### Session Security
- Sessions use Supabase auth with persistent tokens
- Session tokens are stored securely in browser storage
- Consider adding session timeout after 30-60 minutes of inactivity

## Input Validation

Use the security utilities in `src/utils/security.ts`:

```typescript
import { 
  sanitizeInput, 
  validateEmail, 
  validateNumericInput,
  sanitizeNumericInput,
  validateImageFile,
  validateFileSize
} from '@/utils/security';

// Sanitize user text input
const cleanName = sanitizeInput(userInput);

// Validate email
if (!validateEmail(email)) {
  throw new Error('Invalid email format');
}

// Validate and sanitize numeric inputs (carbs, insulin)
if (!validateNumericInput(carbInput, 0, 500)) {
  throw new Error('Invalid carb amount');
}
const carbs = sanitizeNumericInput(carbInput, 0, 500);

// Validate image files
if (!validateImageFile(file)) {
  throw new Error('Only JPEG, PNG, and WebP images allowed');
}
if (!validateFileSize(file, 5)) {
  throw new Error('File must be under 5MB');
}
```

## File Upload Security

### Image Upload Controls
- Allowed types: JPEG, PNG, WebP only
- Maximum file size: 5MB
- Files stored in Supabase bucket with public read access
- File names should be sanitized/hashed by backend

### Recommendations
- Implement server-side validation
- Store files with hashed/randomized names
- Implement virus scanning for uploaded images
- Set expiration on temporary files

## CORS & Headers

### Configured for:
- Supabase API (`*.supabase.co`)
- Gemini API (`generativelanguage.googleapis.com`)
- Client-side requests only

### To Add Security Headers
Add to your hosting platform's configuration:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://generativelanguage.googleapis.com; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Data Privacy

### Sensitive Data
- User passwords should never be logged
- API responses containing user health data should not be cached unencrypted
- Clear sensitive data from state when logging out

### PII Handling
- Minimize PII storage
- Don't log PII in console for production
- Implement data retention policies

## Database Security (Supabase)

### Row-Level Security (RLS)
**CRITICAL:** Ensure RLS policies are enabled on all tables:

- Users can only see their own data
- Doctors can only see assigned patients
- Public read access only where necessary

Example RLS policy:
```sql
CREATE POLICY "Users can view own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);
```

### Sensitive Columns
- Passwords should be hashed by Supabase Auth (don't store in users table)
- Health data should have restricted access
- API keys should NEVER be stored in database

## Dependency Security

### Best Practices
- Keep dependencies updated: `npm audit fix`
- Review security advisories: `npm audit`
- Use `npm ci` in CI/CD pipelines
- Lock versions with `package-lock.json`

### Regular Checks
```bash
npm audit
npm update
```

## Production Deployment

### Before Going Live
- [ ] All environment variables are set securely
- [ ] `.env.local` is in `.gitignore` and not committed
- [ ] HTTPS is enforced (redirect HTTP to HTTPS)
- [ ] Security headers are configured
- [ ] Rate limiting is implemented
- [ ] CORS is properly configured
- [ ] RLS policies are enabled on all sensitive tables
- [ ] Database backups are enabled
- [ ] Error logging doesn't expose sensitive information
- [ ] Dependency vulnerabilities are resolved

### Monitoring
- Monitor API logs for suspicious activity
- Set up alerts for failed authentication attempts
- Review user access patterns regularly
- Monitor file upload activity

## Security Incident Response

If you discover a security vulnerability:

1. **DO NOT** commit it or discuss it publicly
2. Do not create a public GitHub issue
3. Contact the development team immediately
4. Document the vulnerability
5. Create a patch
6. Deploy patch before disclosing

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Web Security Best Practices](https://cheatsheetseries.owasp.org/)
