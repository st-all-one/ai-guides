# Modern Web Security Implementation — Full Reference Example

## Overview

This document implements a **reference web application** (`secure-app.example`) incorporating all best practices from the guide. Every concept from TLS to threat modeling is demonstrated in a single coherent codebase.

**Stack assumptions:** Node.js + Express, Nginx reverse proxy, PostgreSQL, vanilla HTML/JS frontend. Patterns are framework-agnostic.

---

## 1. Infrastructure Layer

### 1.1 TLS — Nginx

```nginx
# /etc/nginx/sites-available/secure-app.example

server {
    listen 80;
    server_name secure-app.example;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name secure-app.example;

    # Mozilla Intermediate profile (Dec 2024)
    ssl_certificate     /etc/letsencrypt/live/secure-app.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/secure-app.example/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_tickets off;

    # HSTS — 2 years, preload
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Security headers (see section 3)
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=(), usb=()" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;

    # CSP — Strict nonce-based (see section 3.2)
    set $csp_nonce "";
    if ($request_uri ~* "\.(js|css|png|jpg|svg|woff2)$") { set $csp_nonce ""; }
    add_header Content-Security-Policy "default-src 'none'; script-src 'nonce-$csp_nonce' 'strict-dynamic' 'unsafe-inline' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; upgrade-insecure-requests;" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /static/ {
        alias /var/www/secure-app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 1.2 Certificate Renewal (Let's Encrypt)

```bash
# /etc/cron.d/certbot-renew
0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## 2. Authentication Layer

### 2.1 Passkeys (WebAuthn) — Registration

```js
// server/routes/auth.js
const crypto = require('crypto');

// Generate registration challenge
app.post('/api/auth/passkey/register/begin', async (req, res) => {
  const user = await db.findUser(req.session.userId);
  const challenge = crypto.randomBytes(32);
  const credentialId = crypto.randomBytes(16);

  // Store challenge temporarily (expires in 5 min)
  await db.storeChallenge({
    userId: user.id,
    challenge: challenge.toString('base64url'),
    type: 'registration',
    expiresAt: Date.now() + 300000,
  });

  const publicKey = {
    challenge: new Uint8Array(challenge),
    rp: { name: 'Secure App', id: 'secure-app.example' },
    user: {
      id: new Uint8Array(Buffer.from(user.id.toString())),
      name: user.email,
      displayName: user.name,
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: {
      residentKey: 'required',
      requireResidentKey: true,
      userVerification: 'preferred',
    },
    attestation: 'none',
    excludeCredentials: [],
  };

  res.json({ publicKey });
});

// Complete registration
app.post('/api/auth/passkey/register/complete', async (req, res) => {
  const { id, rawId, response, type } = req.body;
  const stored = await db.consumeChallenge(req.session.userId, 'registration');

  if (!stored) return res.status(400).json({ error: 'Challenge expired' });

  // Verify attestation (simplified — use @simplewebauthn/server in production)
  const credential = {
    id,
    publicKey: Buffer.from(response.publicKey, 'base64'),
    algorithm: -7,
    transports: response.transports || [],
  };

  await db.storeCredential(req.session.userId, credential);
  res.json({ success: true });
});
```

### 2.2 Passkeys — Authentication

```js
// server/routes/auth.js
app.post('/api/auth/passkey/login/begin', async (req, res) => {
  const challenge = crypto.randomBytes(32);

  await db.storeChallenge({
    userId: null, // anonymous until verified
    challenge: challenge.toString('base64url'),
    type: 'authentication',
    expiresAt: Date.now() + 300000,
  });

  res.json({
    publicKey: {
      challenge: new Uint8Array(challenge),
      rpId: 'secure-app.example',
      allowCredentials: [], // discoverable credentials
      userVerification: 'preferred',
    },
  });
});

app.post('/api/auth/passkey/login/complete', async (req, res) => {
  const { id, response } = req.body;
  const stored = await db.consumeChallenge(null, 'authentication');
  if (!stored) return res.status(400).json({ error: 'Challenge expired' });

  // Verify assertion signature (use @simplewebauthn/server)
  const credential = await db.findCredentialById(id);
  if (!credential) return res.status(400).json({ error: 'Unknown credential' });

  const user = await db.findUser(credential.userId);
  req.session.userId = user.id;
  req.session.regen((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });
    res.json({ success: true, user: { name: user.name, email: user.email } });
  });
});
```

### 2.3 Conditional Mediation (Autofill)

```html
<!-- frontend/login.html -->
<input type="text" name="username" autocomplete="username webauthn" />
```

```js
// frontend/auth.js
async function autoFillPasskey() {
  if (!window.PublicKeyCredential || !navigator.credentials) return;
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32),
        rpId: 'secure-app.example',
        allowCredentials: [],
        userVerification: 'preferred',
      },
      mediation: 'conditional',
    });
    if (cred) submitAssertion(cred);
  } catch (err) {
    // User cancelled or no passkey available — fall through to password login
  }
}
```

### 2.4 Session Management

```js
// server/session.js
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

app.use(session({
  store: new pgSession({
    pool: db.pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  name: '__Host-SESSIONID',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 3600000, // 1 hour idle timeout
  },
  rolling: true, // reset maxAge on each request
}));

// Absolute timeout middleware
app.use((req, res, next) => {
  if (req.session && req.session.createdAt) {
    const absoluteMax = 86400000; // 24 hours
    if (Date.now() - req.session.createdAt > absoluteMax) {
      return req.session.destroy(() => res.redirect('/login'));
    }
  }
  next();
});
```

### 2.5 Session Invalidation on Security Events

```js
// server/routes/auth.js
app.post('/api/auth/password/change', async (req, res) => {
  const user = await db.findUser(req.session.userId);
  if (!await bcrypt.compare(req.body.oldPassword, user.passwordHash)) {
    return res.status(403).json({ error: 'Invalid password' });
  }
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();

  // Invalidate ALL sessions except current
  await db.invalidateSessions(user.id, req.session.id);
  res.json({ success: true });
});

// Detect suspicious login
app.post('/api/auth/login', async (req, res) => {
  const user = await db.verifyPassword(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ip = req.ip;
  const lastIps = await db.getRecentIps(user.id);
  if (!lastIps.includes(ip)) {
    await sendSecurityAlert(user.email, `New login from ${ip}`);
  }

  req.session.userId = user.id;
  req.session.createdAt = Date.now();
  res.json({ success: true });
});
```

---

## 3. HTTP Headers Layer

### 3.1 Complete Header Set

```js
// server/middleware/security-headers.js
module.exports = function securityHeaders(req, res, next) {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  // HSTS (handled by Nginx — duplicate for direct Node access)
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'camera=()',
    'microphone=()',
    'payment=()',
    'usb=()',
    'local-network=()',
    'loopback-network=()',
  ].join(', '));

  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Strict CSP
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // CSP report-only for testing new directives
  res.setHeader('Content-Security-Policy-Report-Only', [
    "require-trusted-types-for 'script'",
    `report-to csp-endpoint`,
  ].join('; '));

  res.setHeader('Reporting-Endpoints', 'csp-endpoint="https://secure-app.example/api/csp-report"');

  next();
};
```

### 3.2 CSP Report Endpoint

```js
// server/routes/csp-report.js
app.post('/api/csp-report', (req, res) => {
  // Accept CSP report (application/csp-report or application/reports+json)
  const report = req.body;
  console.warn('CSP Violation:', {
    uri: report['document-uri'] || report.documentURI,
    blocked: report['blocked-uri'] || report.blockedURI,
    violated: report['violated-directive'] || report.violatedDirective,
    source: report['source-file'] || report.sourceFile,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    time: new Date().toISOString(),
  });

  // Write to structured log for SIEM/monitoring
  fs.appendFileSync(
    '/var/log/csp-violations.ndjson',
    JSON.stringify({ ...report, timestamp: new Date().toISOString(), ip: req.ip }) + '\n'
  );

  res.status(204).end();
});
```

### 3.3 Fetch Metadata Validation (Server-side CSRF)

```js
// server/middleware/fetch-metadata.js
module.exports = function fetchMetadataCheck(req, res, next) {
  // Only apply to state-changing requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const site = req.headers['sec-fetch-site'];
  const mode = req.headers['sec-fetch-mode'];
  const dest = req.headers['sec-fetch-dest'];

  // Allow same-origin and same-site
  if (site === 'same-origin' || site === 'same-site') return next();

  // Allow navigations from same-site (form submissions)
  if (site === 'none' && mode === 'navigate' && req.method === 'POST') return next();

  // Block all cross-site, cross-origin requests to state-changing endpoints
  res.status(403).json({ error: 'Cross-site request blocked' });
};

// Apply to API routes
app.use('/api', fetchMetadataCheck);
```

### 3.4 CORS Configuration

```js
// server/cors.js
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://secure-app.example',
    'https://api.secure-app.example',
  ],
  methods: ['GET', 'HEAD', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  // only when origin is specific, never '*'
  maxAge: 86400,
};

app.use('/api', cors(corsOptions));
```

---

## 4. Cookie Layer

### 4.1 Cookie Templates

```http
# Session cookie (most common)
Set-Cookie: __Host-SESSIONID=<random>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600

# Long-lived preference (JS-accessible)
Set-Cookie: __Host-THEME=dark; Path=/; Secure; SameSite=Lax; Max-Age=31536000

# Cross-subdomain session (use __Secure- prefix instead)
Set-Cookie: __Secure-SESSIONID=<random>; Domain=secure-app.example; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600

# CHIPS (third-party use case — embedded widget)
Set-Cookie: __Host-widget_prefs=lang%3Den; SameSite=None; Secure; Path=/; Partitioned

# Strictest possible
Set-Cookie: __Host-CSRF_TOKEN=<random>; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=3600
```

### 4.2 CSRF Token Pattern (Defense in Depth)

```js
// server/middleware/csrf.js
const crypto = require('crypto');

app.use((req, res, next) => {
  // Generate CSRF token bound to session
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// Validate CSRF on state-changing requests
function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const headerToken = req.headers['x-csrf-token'];
  if (!headerToken || headerToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

app.use('/api', csrfProtection);
```

```html
<!-- Hidden field in forms -->
<form method="POST" action="/api/profile/update">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}" />
  <!-- ... -->
</form>
```

---

## 5. Application Layer — Server

### 5.1 Input Validation (Allowlist)

```js
// server/middleware/validate.js
const { z } = require('zod');

const profileSchema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  email: z.string().email(),
  website: z.string().url().optional().nullable(),
});

app.post('/api/profile/update', (req, res) => {
  try {
    const data = profileSchema.parse(req.body);
    // data is now validated and typed
    await db.updateProfile(req.session.userId, data);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(422).json({ errors: err.errors });
    }
    throw err;
  }
});
```

### 5.2 SQL Injection Prevention

```js
// Always use parameterized queries
const result = await db.query(
  'SELECT id, name, email FROM users WHERE id = $1 AND tenant_id = $2',
  [userId, tenantId]
);
```

### 5.3 Output Encoding (Always)

```js
// server/views/profile.ejs — template auto-escapes by default
<p>Welcome, <%= user.displayName %></p> <!-- safe: EJS escapes HTML -->

// For JSON responses, never render unsanitized user data
app.get('/api/profile', async (req, res) => {
  const user = await db.findUser(req.session.userId);
  res.json({
    name: sanitizeDisplayName(user.displayName), // strip HTML
  });
});
```

### 5.4 File Upload Security

```js
// server/routes/upload.js
const multer = require('multer');
const path = require('path');

const ALLOWED_EXTENSIONS = ['.jpg', '.png', '.webp', '.pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: '/var/data/uploads/', // outside webroot
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, true);
  },
});

app.post('/api/upload', authenticate, upload.single('file'), async (req, res) => {
  // Store reference in database (not filesystem path)
  await db.insertFile({
    userId: req.session.userId,
    storageKey: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
  res.json({ success: true });
});
```

### 5.5 Rate Limiting

```js
// server/middleware/rate-limit.js
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again later' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/passkey/register/begin', authLimiter);
```

---

## 6. Application Layer — Browser

### 6.1 Trusted Types

```html
<!-- Apply Trusted Types via CSP report-only first, then enforce -->
<meta http-equiv="Content-Security-Policy"
      content="require-trusted-types-for 'script'; report-to csp-endpoint">
```

```js
// frontend/trusted-types.js
if (window.trustedTypes && trustedTypes.createPolicy) {
  trustedTypes.createPolicy('default', {
    createHTML: (input) => DOMPurify.sanitize(input),
    createScriptURL: (input) => {
      const allowed = ['/static/', 'https://cdn.secure-app.example/'];
      if (allowed.some((prefix) => input.startsWith(prefix))) return input;
      throw new TypeError('Script URL not allowed');
    },
  });
}
```

### 6.2 Client-Side Sanitization

```js
// frontend/sanitize.js
function renderUserComment(container, rawHTML) {
  container.innerHTML = DOMPurify.sanitize(rawHTML, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code'],
    ALLOWED_ATTR: ['href'],
  });
}
```

### 6.3 SRI for CDN Resources

```html
<script src="https://cdn.secure-app.example/lib-crypto.js"
        integrity="sha384-ABC123DEF456..."
        crossorigin="anonymous"></script>
```

### 6.4 Secure Context Check

```js
if (!window.isSecureContext) {
  // Critical API won't work — redirect to HTTPS or show error
  console.error('Secure context required for this application');
  showBanner('Please access this site via HTTPS');
}
```

### 6.5 User Activation Gating

```js
// Only open popup on user gesture
document.getElementById('share-btn').addEventListener('click', async () => {
  if (navigator.userActivation.isActive) {
    window.open('/share', 'width=400,height=600');
  } else {
    console.warn('Share popup blocked: no user activation');
  }
});
```

---

## 7. Privacy Layer

### 7.1 Referrer Policy (Per-Element)

```html
<!-- External links should not leak referrer -->
<a href="https://external.example" rel="noreferrer">External Link</a>

<!-- Same-site links can send referrer -->
<a href="https://secure-app.example/blog">Our Blog</a>
```

### 7.2 Privacy-First Analytics

```js
// server/analytics.js — self-hosted, no third-party cookies
app.post('/api/analytics/pageview', (req, res) => {
  const payload = {
    path: req.body.path,
    referrer: req.body.referrer || null,
    timestamp: new Date().toISOString(),
    // NO: IP, user-agent, fingerprint, user ID
  };
  // Aggregate without identifying individuals
  analyticsBuffer.push(payload);
  res.status(204).end();
});
```

### 7.3 Clear-Site-Data on Logout

```js
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.json({ success: true });
  });
});
```

### 7.4 User Data Management

```js
// server/routes/privacy.js
app.get('/api/privacy/data', authenticate, async (req, res) => {
  const user = await db.findUser(req.session.userId);
  const data = await db.exportUserData(user.id);
  res.json(data); // Allows user to download all their data
});

app.delete('/api/privacy/data', authenticate, async (req, res) => {
  await db.deleteUserData(req.session.userId);
  req.session.destroy(() => {
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    res.json({ success: true });
  });
});
```

---

## 8. Operational Security Layer

### 8.1 SBOM Generation

```bash
# Generate CycloneDX SBOM on every release
npm sbom --omit=dev --format=cyclonedx --output=sbom.cyclonedx.json

# Or use cdxgen for deeper scan
npx cdxgen -o sbom.json -t js
```

### 8.2 Dependency Audit (CI Pipeline)

```yaml
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm sbom --omit=dev --format=cyclonedx
      - uses: advanced-security/sbom-uploader@v1
```

### 8.3 SECURITY.md

```markdown
# Security Policy for Secure App

## Reporting a Vulnerability

**Do not** open public GitHub issues for security vulnerabilities.

Email: security@secure-app.example
PGP Key: https://secure-app.example/pgp-key.asc

Response SLA:
- Confirmation: 24 hours
- Triage: 72 hours
- Fix (critical): 7 days
- Public disclosure: 90 days after fix
```

### 8.4 Monitoring & Alerting

```js
// server/monitoring.js
function logSecurityEvent(event) {
  const entry = {
    timestamp: new Date().toISOString(),
    type: event.type,
    userId: event.userId || null,
    ip: event.ip,
    userAgent: event.userAgent,
    details: event.details,
    severity: event.severity || 'info',
  };

  // Structured logging to stdout (collected by SIEM)
  console.log(JSON.stringify(entry));

  // Alert on high-severity events
  if (['auth_failure', 'csp_violation', 'access_denial'].includes(event.type)) {
    // Send to PagerDuty, Slack, etc.
    alerting.send(entry);
  }
}

// Usage
app.post('/api/auth/login', async (req, res) => {
  const user = await db.verifyPassword(req.body.email, req.body.password);
  if (!user) {
    logSecurityEvent({
      type: 'auth_failure',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { email: req.body.email },
      severity: 'warning',
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // ...
});
```

---

## 9. Threat Modeling (Applied to This App)

### System Model

| ID | Component | Description |
|----|-----------|-------------|
| C1 | Nginx reverse proxy | TLS termination, header injection |
| C2 | Express app server | Business logic, session management |
| C3 | PostgreSQL database | User data, sessions, credentials |
| C4 | Browser | WebAuthn, CSP enforcement, storage |
| C5 | CDN | Static assets with SRI |

| ID | Asset | Location |
|----|-------|----------|
| A1 | User credentials (passkeys) | Browser authenticator + DB (public key only) |
| A2 | Session tokens | Cookie (HttpOnly) + DB |
| A3 | User PII | PostgreSQL (encrypted at rest) |
| A4 | CSRF tokens | Session store |
| A5 | CSP nonces | Generated per request, never stored |

| ID | Trust Boundary | Crosses Between |
|----|---------------|-----------------|
| TB1 | Internet ↔ Server | C1 (Nginx) |
| TB2 | Server ↔ Database | C2 ↔ C3 (internal network) |

### Threat Analysis (STRIDE + LINDDUN)

| ID | Threat | Category | Mitigations |
|----|--------|----------|-------------|
| T1 | XSS via user profile bio | S, T, I | Output encoding (sec 5.3) + Strict CSP (sec 3.1) + Trusted Types (sec 6.1) + DOMPurify (sec 6.2) + HttpOnly cookie (sec 4.1) |
| T2 | CSRF on profile update | T | SameSite=Lax (sec 4.1) + CSRF token (sec 4.2) + Fetch Metadata (sec 3.3) + JSON content-type requirement |
| T3 | Session hijacking via XSS | S, I | HttpOnly cookie + Short max-age + Absolute timeout |
| T4 | Phishing (credential theft) | S | Passkeys (origin-bound, sec 2.1-2.3) |
| T5 | SQL injection | T, I, E | Parameterized queries only (sec 5.2) |
| T6 | Clickjacking | I, T | frame-ancestors 'none' (sec 3.1) |
| T7 | MITM / SSL stripping | T, I | HSTS preload (sec 1.1) + TLS 1.3 |
| T8 | Supply chain (CDN compromise) | S, T | SRI (sec 6.3) + SBOM (sec 8.1) |
| T9 | IDOR (user sees another user's data) | I, E | Access control per object (user ID bound to session) |
| T10 | Fingerprinting / tracking | L, I | Referrer-Policy (sec 3.1) + Permissions-Policy (sec 3.1) + No third-party analytics (sec 7.2) |
| T11 | Session prediction | S | crypto.randomBytes for session IDs |

### Validation

- [ ] Automated CSP report testing (report-only mode, 7 days)
- [ ] DAST scan (OWASP ZAP) in CI pipeline
- [ ] `npm audit` on every PR
- [ ] Third-party cookie blocking test (Chrome incognito + Firefox Strict)
- [ ] Penetration test before major releases
- [ ] Threat model review every 6 months

---

## 10. Deploy Checklist

### Pre-Deploy

- [ ] TLS certificate valid & auto-renew configured
- [ ] HSTS `max-age` ≥ 2 years, submitted to preload list
- [ ] All HTTP headers verified (CSP, HSTS, CORP, COOP, Permissions-Policy, Referrer-Policy)
- [ ] CSP in report-only mode for minimum 7 days
- [ ] Cookies audited: all have Secure, HttpOnly (if possible), SameSite, __Host- prefix
- [ ] CHIPS used (not third-party cookies) for any cross-site embedding
- [ ] All database queries use parameterized statements
- [ ] Input validation (allowlist) on all endpoints
- [ ] File uploads: outside webroot, allowlist extensions, max size enforced
- [ ] CSRF tokens on all state-changing forms (defense in depth with SameSite)
- [ ] Rate limiting on auth endpoints
- [ ] Passkeys (WebAuthn) registered and tested
- [ ] Session idle timeout ≤ 1 hour, absolute timeout ≤ 24 hours
- [ ] SRI hashes on all CDN resources
- [ ] SECURITY.md published in repository root
- [ ] SBOM generated and uploaded
- [ ] Dependencies scanned (npm audit, Dependabot)
- [ ] Privacy policy published, consent mechanism in place
- [ ] User data export + delete endpoints implemented
- [ ] Clear-Site-Data configured on logout

### Testing

- [ ] Test with third-party cookies blocked (Chrome: `chrome://settings/cookies`)
- [ ] Test with Firefox Enhanced Tracking Protection (Strict mode)
- [ ] Test without JavaScript (CSP, noscript)
- [ ] Test on HTTPS-only mode (Firefox: about:preferences#privacy)
- [ ] CSP report endpoint functional (verify with csp-evaluator.withgoogle.com)
- [ ] WebAuthn flow works on: macOS (Touch ID), Windows (Hello), Android (passkey), iOS (iCloud Keychain), YubiKey
- [ ] Mixed content check: `https://whynohttps.com/` or DevTools → Issues tab
- [ ] OWASP ZAP passive scan passes with no high-severity findings
- [ ] Lighthouse security audit passes

### Monitoring

- [ ] CSP violation report endpoint active and logging
- [ ] Authentication failure alerts configured
- [ ] Access control failure logging enabled
- [ ] Certificate expiry monitoring (30-day alert)
- [ ] SBOM updated on every release
- [ ] Dependency scanning continuous (Dependabot / Renovate)
- [ ] Backup verification (restore tested quarterly)
