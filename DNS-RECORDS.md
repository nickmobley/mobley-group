# themobleygroup.com → GitHub Pages (mail frozen)

Registrar/DNS: Spaceship (NS launch1/launch2.spaceship.net)
Site repo: nickmobley/mobley-group (project Pages)
Do NOT change: MX, SPF TXT, DMARC, DKIM, Spacemail records.

## ADD only (web)

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | 185.199.108.153 | 3600 |
| A | @ | 185.199.109.153 | 3600 |
| A | @ | 185.199.110.153 | 3600 |
| A | @ | 185.199.111.153 | 3600 |
| AAAA | @ | 2606:50c0:8000::153 | 3600 |
| AAAA | @ | 2606:50c0:8001::153 | 3600 |
| AAAA | @ | 2606:50c0:8002::153 | 3600 |
| AAAA | @ | 2606:50c0:8003::153 | 3600 |
| CNAME | www | nickmobley.github.io | 3600 |

## FREEZE (leave exactly as-is)

| Type | Host | Value |
|------|------|-------|
| MX | @ | 0 mx1.spacemail.com |
| MX | @ | 0 mx2.spacemail.com |
| TXT | @ | v=spf1 include:spf.spacemail.com ~all |
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:nick@themobleygroup.com |
| TXT | *._domainkey | any existing DKIM — do not edit/delete |

## GitHub

Pages: Deploy from branch main / root
Custom domain: themobleygroup.com
Enforce HTTPS: on (after DNS propagates)
