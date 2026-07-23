# ADR-002: Zero-Knowledge AES-GCM Encryption with Supabase Security Definer RPCs

## Status
Accepted

## Date
2026-07-23

## Context
Users require cloud synchronization across multiple mobile and desktop devices without creating traditional user accounts with passwords or emails. The system must guarantee complete privacy of user library data, favorite entries, and volume progress while preventing untrusted cloud databases from reading or enumerating user data.

Security Requirements:
- End-to-end zero-knowledge privacy: data must be encrypted before leaving the browser.
- Cloud storage providers (Supabase) must never possess raw decryption keys or plaintext data.
- Prevent malicious clients from listing, scanning, or enumerating sync payloads belonging to other users.

## Decision
We implement a **Zero-Knowledge AES-GCM Client-Side Encryption with Security Definer RPC Architecture**:
1. **Client-Side Key Derivation & AES-GCM**:
   - The user generates or inputs a 256-bit Sync Key (represented as text or QR code).
   - The key is hashed using **SHA-256** via the Web Crypto API (`crypto.subtle.digest`) to produce a row ID (`lookup_id`).
   - The key is imported into Web Crypto API (`crypto.subtle.importKey`) to produce an AES-GCM encryption key.
   - Payloads are encrypted with AES-GCM using a random 12-byte initialization vector (`iv`).
2. **Supabase Row Level Security & RPC-only Data Boundary**:
   - Direct `SELECT`, `INSERT`, `UPDATE`, and `DELETE` table access on `public.sync_data` is explicitly **REVOKED** from public (`anon`) and `authenticated` roles.
   - Data read/write is restricted exclusively to two narrow `SECURITY DEFINER` PostgreSQL functions: `get_sync_data(lookup_id)` and `set_sync_data(lookup_id, new_payload)`.
3. **Local QR Code Operations**:
   - QR code generation uses `qrious` bundled by Vite without external network requests.
   - QR code scanning uses `jsQR` directly on local canvas/camera frames.

## Alternatives Considered

### Traditional User Accounts (Email / Password Auth)
- **Pros**: Familiar login flow.
- **Cons**: Requires server-side auth infrastructure, user database management, and handling password resets. Plaintext storage risks server-side leaks.
- **Rejected**: Zero-knowledge sync provides superior privacy without account management friction.

### Direct Supabase Table Access with RLS policies based on text keys
- **Pros**: Simpler SQL setup.
- **Cons**: Exposing the table directly to `anon` key calls allows potential enumeration or brute-force scanning if RLS policies are misconfigured.
- **Rejected**: Narrow `SECURITY DEFINER` RPC functions guarantee that clients can only query an exact key hash.

## Consequences
- **Absolute Privacy**: Even if Supabase credentials or database tables are leaked, user data remains unreadable ciphertext.
- **No Password Recovery**: If a user loses their Sync Key, recovery is mathematically impossible. This trade-off is clearly documented in the user interface and user guide.
- **Offline Resilience**: Sync operations are opt-in and fail gracefully; local state remains active regardless of network status.
