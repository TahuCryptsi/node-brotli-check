# node-brotli-check

![status](https://img.shields.io/badge/status-working-brightgreen)
![scope](https://img.shields.io/badge/scope-local%20probe-blue)
![cve](https://img.shields.io/badge/CVE--2026--111497-audit-orange)
![node](https://img.shields.io/badge/node-18%2F20%2F22%2F24%2F26-covered-lightgrey)

Local probe for **CVE-2026-111497** — the Brotli decoder out-of-bounds write in Node.js
(fixed 2026-10-21 in **22.23.4 / 24.22.1 / 26.12.1**; every EOL line — 20.x, 18.x and older —
is unpatched forever).

Run it with **any** Node binary you want to audit. It answers two questions no version
string can:

1. Does this build contain the fix? (constant probe)
2. Does this build take the pre-fix code path on the official regression vector?
   (22-byte decode — crash-safe, no code execution attempted)

## What it does NOT do

No exploitation, no heap grooming. The decode call throws on both patched and unpatched
builds — the *error identity* is the finding. Safe to run in production.

## Usage

```bash
node brotli-check.js
```

```
err code: ERR__ERROR_FORMAT_BLOCK_LENGTH_1 | errno: -9
UNPATCHED (BLOCK_LENGTH_1 — OOB write path taken)
probe constant: missing
```

Patched builds print:

```
err code: ERR__ERROR_FORMAT_BLOCK_SWITCH | errno: -17
PATCHED (rejects early, BLOCK_SWITCH)
probe constant: -17
```

Exit codes: `0` = patched, `1` = unpatched (OOB-write path taken), `2` = inconclusive.

## Verdict table (2026-10-21 Node.js security release)

| Node line | Verdict |
|---|---|
| 22.x ≥ 22.23.4 | patched |
| 24.x ≥ 24.22.1 | patched |
| 26.x ≥ 26.12.1 | patched |
| 22/24/26 below those | **unpatched** |
| every EOL line (20, 18, 16…) | **unpatched forever** |

Distro packages (Debian/Alpine/Fedora build Node with `--shared-brotli`) take the fix via
the **system brotli library** — probe result still wins over a version check, because the
bundled-decoder assumption is wrong there.

## Versions verified with this probe

| Runtime | Node | errno | Verdict |
|---|---|---|---|
| host | 26.7.0 | -9 | UNPATCHED |
| n8n official image | 26.12.1 | -17 | PATCHED |
| AnythingLLM image | 18.20.8 | -9 | UNPATCHED (EOL) |
| Flowise image | 20.20.2 | -9 | UNPATCHED (EOL) |

## Audit containers, not just the host

A patched host says nothing about its containers:

```bash
docker ps --format '{{.Names}}' | while read c; do
  if docker exec "$c" node --version >/dev/null 2>&1; then
    echo "== $c"
    docker cp brotli-check.js "$c:/tmp/brotli-check.js"
    docker exec "$c" node /tmp/brotli-check.js || echo "   ^^ UNPATCHED"
  fi
done
```

## Remediation

- Upgrade to a fixed release and **restart every Node process**.
- EOL lines: no fix exists — migrate, or stop decoding untrusted Brotli at the edge
  (reject `Content-Encoding: br` request bodies; disable Brotli response decompression for
  untrusted upstreams — `fetch()` has no off switch, use `undici.request()` which never
  decodes, or proxy through a non-Brotli path).

## Related

- PHP session.upload_progress twin tool: [php2shell-check](https://github.com/TahuCryptsi/php2shell-check)
- Advisory context: Node.js October 2026 security releases (10 CVEs; 4 High)
- Bun is also affected (oven-sh/bun#46352) — no brotli release contains the fix at publish time

## License

MIT.
