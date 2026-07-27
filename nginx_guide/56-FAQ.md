# nginx FAQ

## Section 1: Using Variables in nginx Configuration

### Q: Can I use nginx variables as macros to make configuration shorter?

**A:** No. nginx variables are **not** template macros. They are evaluated at runtime during request processing, which makes them computationally expensive compared to static configuration.

### Common Pitfall: String Concatenation

```nginx
set $a 1;
set $b 2;
set $c $a$b;  # $c is "12", NOT 3
```

Variables in nginx are always **strings**. Concatenation (`$a$b`) performs string joining, not arithmetic addition. The result is `"12"`, not `3`.

### Why Variables Are Costly

- Variables are evaluated **per request** at runtime
- Each variable access involves hash lookups and memory allocation
- Using variables for static strings adds unnecessary overhead to every request
- Directives that accept variables cannot be optimized at config load time

### What to Use Instead of Variables

For template-like configuration, use external tools:

```bash
# Use sed + make or a template engine
sed "s|@BACKEND@|10.0.0.1:8080|" nginx.conf.template > nginx.conf
```

Or use `include` directives to compose configuration from static fragments:

```nginx
server {
    include snippets/ssl-settings.conf;
    include sites-available/example.com.conf;
}
```

### When Variables Are Appropriate

- `map` blocks for conditional value assignment
- `set` for values derived from request properties (e.g., `$scheme://$host`)
- `$arg_*`, `$http_*`, `$cookie_*` for accessing request data
- Log format definitions
- `proxy_pass` with dynamic backends (use with caution)

### Performance Implication

```nginx
# BAD: runtime variable evaluation for every request
set $root "/var/www/site";
root $root;

# GOOD: static path, zero runtime cost
root /var/www/site;
```

The `root` directive with a static path is processed once at config load. With a variable, it is evaluated on every request, adding hash lookups and string operations.

---

## Section 2: License and Copyright

### Q: How should nginx copyright be acknowledged in proprietary distributions?

**A:** If you distribute nginx (open source version) as part of a proprietary software package, you must include the following attribution text in your license conditions:

```
This product contains software provided by Nginx, Inc. and its contributors.
```

This must be followed by the text of the applicable **2-clause BSD license**, available at [nginx.org/LICENSE](http://nginx.org/LICENSE).

### nginx License Model

| Component | License |
|-----------|---------|
| nginx core (open source) | 2-clause BSD |
| njs module | 2-clause BSD |
| nginx Plus (commercial) | Subscription (proprietary) |
| 3rd-party libraries (zlib, PCRE, OpenSSL) | Respective licenses |

### Third-Party Attribution

If your build includes any of these libraries, include their copyright acknowledgements as well:

- **zlib** — zlib/libpng license
- **PCRE** — BSD-style license
- **OpenSSL** — OpenSSL/SSLeay dual license

### Do I Need to Include the Copyright Notice?

- **Yes**, if you redistribute nginx binaries or source (even if modified)
- **No**, if you simply use nginx to serve your website (no redistribution)
- **Yes**, if you embed nginx in an appliance or product you ship

---

## Section 3: "Welcome to nginx" on Other Sites

### Q: Why do I see "Welcome to nginx" when trying to open Facebook, Google, or other major websites?

**A:** The "Welcome to nginx" page is a diagnostics page served by nginx when it receives a request but no configured site matches. Seeing this page on a major website means **your device or network is being redirected** to a rogue server that happens to run nginx.

### What Is Happening

1. **Malware or DNS hijacking** on your computer or home router is redirecting traffic
2. Your browser resolves `facebook.com` to an attacker's IP address instead of Facebook's
3. The attacker's server (running nginx with default config) serves the "Welcome to nginx" page
4. This is **not** nginx's fault — nginx is the 2nd most popular web server, used by ~14% of the Internet

### How to Detect and Resolve

#### 1. Check DNS Settings

Verify your DNS server configuration matches your ISP's recommended servers:

```
# Windows
ipconfig /all | findstr "DNS"

# macOS/Linux
scutil --dns
cat /etc/resolv.conf
```

#### 2. Switch to Public DNS

Temporarily change to Google Public DNS (8.8.8.8, 8.8.4.4) or Cloudflare (1.1.1.1). If the problem goes away, your default DNS was compromised.

#### 3. Flush DNS Cache

```
# Windows
ipconfig /flushdns

# macOS
sudo killall -HUP mDNSResponder

# Linux
sudo systemd-resolve --flush-caches
```

#### 4. Check the Hosts File

Ensure your `hosts` file contains only expected entries:

- **Windows**: `C:\WINDOWS\system32\drivers\etc\hosts`
- **Linux/macOS**: `/etc/hosts`

Expected content (only localhost mapping):

```
127.0.0.1 localhost
```

Remove any entries for `facebook.com`, `google.com`, etc.

#### 5. Scan for Malware

- Run a full antivirus scan
- Use anti-malware tools (Malwarebytes, Microsoft Malicious Software Removal Tool)
- Check browser extensions for suspicious add-ons

#### 6. Check Router Security

- Log into your router admin panel
- Verify DNS settings are not overridden
- Change default admin password
- Update router firmware

#### 7. Clear Browser Data

- Clear cache, cookies, and site data
- Reinstall or reset browser to defaults

### Key Takeaway

nginx is not malware and is not on your computer. The "Welcome to nginx" page indicates your traffic is being intercepted by a third-party server running nginx. The root cause is a compromised DNS, router, or device on your network.

### Resources

- [DCWG: DNS Changer Detection](http://www.dcwg.org/detect/)
- [Microsoft Malicious Software Removal Tool](http://www.microsoft.com/security/pc-security/malware-removal.aspx)
- [Reset Hosts File to Default](http://support.microsoft.com/kb/972034)
- [Reset TCP/IP Stack](http://support.microsoft.com/kb/299357)
