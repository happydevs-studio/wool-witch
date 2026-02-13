# GitHub Actions Workflows

This document describes the automated workflows configured for the Wool Witch project.

## Overview

The project uses GitHub Actions for continuous integration, security scanning, deployment, and monitoring. All workflows are located in `.github/workflows/`.

## Workflows

### 1. Security Scanning (`security.yml`)

Comprehensive security scanning workflow that runs multiple security checks and automatically creates issues when vulnerabilities are detected.

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch
- Daily at 2:00 AM UTC (scheduled)
- Manual dispatch

**Jobs**:

#### CodeQL Analysis
- Static code analysis for JavaScript/TypeScript
- Detects security vulnerabilities and code quality issues
- Uses `security-and-quality` query set
- Results uploaded to GitHub Security tab

#### Dependency Review (PR only)
- Reviews new dependencies in pull requests
- Fails on high severity vulnerabilities
- Blocks GPL-2.0 and GPL-3.0 licenses

#### Secret Scanning
- Uses TruffleHog OSS to detect exposed secrets
- Scans full repository history
- Only fails on verified secrets
- Detects API keys, tokens, passwords, and credentials

#### NPM Security Audit
- Audits production dependencies for vulnerabilities
- Fails on high/critical severity issues
- Also checks all dependencies (non-blocking)
- Uses `npm audit` with JSON output analysis

#### Security Status Check
- Monitors all security scan results
- **Automatically creates GitHub issues** when any scan fails
- **Auto-closes issues** when all scans pass
- Prevents duplicate issues by checking for existing open issues

**Automated Issue Management**:

When security scans fail:
- Creates issue titled: "🔒 Security Scan Failed - [Date]"
- Includes detailed failure report with:
  - Links to workflow run logs
  - Branch and commit information
  - List of failed checks
  - Remediation steps
- Labels: `security`, `security-scan-failure`, `automated`, `high-priority`
- Adds comments to existing issues instead of creating duplicates

When scans pass:
- Finds open security failure issues
- Adds success comment
- Automatically closes the issue

**Permissions Required**:
```yaml
permissions:
  contents: read          # Read repository code
  security-events: write  # Upload CodeQL results
  actions: read          # Read workflow results
  issues: write          # Create/update/close issues
```

**Manual Trigger**:
```bash
gh workflow run security.yml
```

---

### 2. Deploy Application (`deploy.yml`)

Builds and deploys the application to Netlify.

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch
- Manual dispatch

**Jobs**:

#### Build and Deploy
1. **Install Dependencies**: `npm ci`
2. **Security Audit**: Checks for critical vulnerabilities (non-blocking for dev deps)
3. **Lint & Type Check**: Runs `npm run test` (non-blocking)
4. **Database Migration**: Pushes Supabase migrations to remote project
5. **Build**: Creates production build with environment variables
6. **Deploy to Netlify**: Deploys to production or preview

**Concurrency**: 
- Group: `netlify-deploy`
- No cancel-in-progress (sequential deploys)

**Permissions Required**:
```yaml
permissions:
  contents: read
  pull-requests: write    # Deployment comments
  statuses: write         # Commit status updates
  deployments: write      # Deployment tracking
```

**Required Secrets**:
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PAYPAL_CLIENT_ID`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

---

### 3. Smoke Test (`smoke-test.yml`)

Automated smoke tests against the production site with automatic issue creation on failure.

**Triggers**:
- Scheduled: 4 times daily (08:00, 12:00, 16:00, 20:00 UTC)
- After successful deployment (`workflow_run`)
- Manual dispatch

**Jobs**:

#### Smoke Test
1. **Install Dependencies**: `npm ci`
2. **Install Playwright**: Installs browsers with dependencies
3. **Run Tests**: Executes smoke tests against production
4. **Upload Artifacts**: Saves test results on failure
5. **Create Issue**: Automatically creates issue if tests fail
6. **Close Issues**: Auto-closes issues when tests pass

**Automated Issue Management**:

When smoke tests fail:
- Creates issue titled: "🚨 Smoke Test Failed - [timestamp]"
- Includes:
  - Link to workflow run
  - Site URL
  - Possible causes
  - Next steps
  - Test details
- Labels: `bug`, `smoke-test-failure`, `automated`, `high-priority`
- Updates existing issues instead of creating duplicates

When tests pass:
- Closes any open smoke test failure issues
- Adds success comment with timestamp

**Test Coverage**:
- Homepage load
- Navigation functionality
- Responsive design
- Error detection
- Multiple browsers (Chrome, Firefox, Safari)

---

## Working with Workflows

### Viewing Workflow Status

**List All Workflows**:
```bash
gh workflow list
```

**View Specific Workflow**:
```bash
gh workflow view security.yml
gh workflow view deploy.yml
gh workflow view smoke-test.yml
```

**List Recent Runs**:
```bash
gh run list --workflow=security.yml --limit=10
```

**View Run Details**:
```bash
gh run view <run-id>
gh run view <run-id> --log
```

### Manual Triggers

**Trigger Security Scan**:
```bash
gh workflow run security.yml
```

**Trigger Deployment**:
```bash
gh workflow run deploy.yml
```

**Trigger Smoke Test**:
```bash
gh workflow run smoke-test.yml
```

### Monitoring Automated Issues

**Security Scan Failures**:
```bash
gh issue list --label "security-scan-failure,automated"
```

**Smoke Test Failures**:
```bash
gh issue list --label "smoke-test-failure,automated"
```

**All Automated Issues**:
```bash
gh issue list --label "automated"
```

### Debugging Failed Workflows

1. **Check Workflow Run Logs**:
   ```bash
   gh run view <run-id> --log
   ```

2. **View Specific Job**:
   ```bash
   gh run view <run-id> --job=<job-id>
   ```

3. **Download Artifacts** (if any):
   ```bash
   gh run download <run-id>
   ```

4. **Re-run Failed Jobs**:
   ```bash
   gh run rerun <run-id> --failed
   ```

## Workflow Maintenance

### Updating Workflows

1. **Edit Workflow File**: Modify `.github/workflows/*.yml`
2. **Validate YAML**: Use online YAML validator or IDE
3. **Test Changes**: 
   - Push to feature branch
   - Verify workflow runs correctly
   - Check automated features work as expected
4. **Merge to Main**: After validation

### Security Best Practices

1. **Never Commit Secrets**: Use GitHub Secrets
2. **Use Least Privilege**: Grant minimum required permissions
3. **Pin Action Versions**: Use specific versions (e.g., `@v4`, not `@main`)
4. **Review Third-Party Actions**: Check action source code before using
5. **Monitor Workflow Logs**: Check for suspicious activity
6. **Keep Actions Updated**: Regularly update action versions

### Required Secrets Configuration

Navigate to: **Settings** → **Secrets and variables** → **Actions**

#### Supabase Secrets
- `SUPABASE_PROJECT_REF`: Project reference ID
- `SUPABASE_ACCESS_TOKEN`: Access token for CLI
- `VITE_SUPABASE_URL`: Public Supabase URL
- `VITE_SUPABASE_ANON_KEY`: Anonymous key (safe to expose)

#### Netlify Secrets
- `NETLIFY_AUTH_TOKEN`: Netlify authentication token
- `NETLIFY_SITE_ID`: Site identifier

#### Payment Secrets
- `VITE_PAYPAL_CLIENT_ID`: PayPal client ID

## Workflow Schedules

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| Security Scanning | Daily at 02:00 UTC | Detect new vulnerabilities |
| Smoke Test | 4x daily (08:00, 12:00, 16:00, 20:00 UTC) | Monitor production health |
| Deploy | On push to main | Automatic deployment |

## Troubleshooting

### Security Scan Failures

**CodeQL Issues**:
- Check Security tab for detailed findings
- Review code changes that introduced vulnerabilities
- Apply recommended fixes

**Secret Scanning Issues**:
- Remove exposed secrets immediately
- Rotate compromised credentials
- Add patterns to `.gitignore` to prevent future exposure

**NPM Audit Issues**:
- Run `npm audit fix` locally
- Update vulnerable packages
- Check for available patches
- Consider alternative packages if no fix available

### Deployment Failures

**Build Errors**:
- Check build logs for errors
- Verify environment variables are set correctly
- Test build locally: `npm run build`

**Migration Failures**:
- Verify migration syntax
- Check Supabase project status
- Ensure migrations are idempotent

**Netlify Errors**:
- Check Netlify build logs
- Verify site configuration
- Check domain/DNS settings

### Smoke Test Failures

**Site Down**:
- Check Netlify status
- Verify DNS configuration
- Check recent deployments

**Test Failures**:
- Download test artifacts
- Review Playwright logs
- Test manually in browser
- Check for breaking changes in recent deployments

## Contributing

When adding new workflows:

1. **Document the Workflow**: Add section to this file
2. **Add Comments**: Include inline comments in YAML
3. **Test Thoroughly**: Test in feature branch before merging
4. **Update Permissions**: Document required permissions
5. **Configure Secrets**: Document required secrets
6. **Add Monitoring**: Consider automated issue creation for failures

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Script Action](https://github.com/actions/github-script)
- [CodeQL Action](https://github.com/github/codeql-action)
- [Netlify Deploy Action](https://github.com/nwtgck/actions-netlify)
