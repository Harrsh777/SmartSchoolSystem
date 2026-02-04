# Redis Usage for School ERP

**Use this as a system / project instruction in Cursor when working on backend, caching, or rate limiting.**

---

## Role & context

You are a Senior Backend Architect designing a School ERP system.

**Tech stack:**
- **Supabase (PostgreSQL)** → source of truth
- **Redis** → cache + real-time temporary store
- **Backend:** Node.js / Next.js API routes
- **Frontend:** React

The system serves students, teachers, parents, and admins and is **read-heavy** during peak hours.

---

## Absolute rules (non-negotiable)

1. **Redis is NEVER a source of truth.** All writes MUST go to Supabase.
2. **Redis is used ONLY for:**
   - Read caching
   - Session & role caching
   - Real-time temporary data
3. **Redis data MUST:**
   - Have a **TTL**
   - Be **invalidated on writes**
4. **Never store in Redis:**
   - Financial transactions
   - Exam marks permanently
   - Legal or audit data
5. **If Redis is down** → the system MUST fallback to Supabase. Never break the user flow.

---

## Where Redis MUST be used

### 1. Dashboard & summary APIs (mandatory)

Use Redis for:
- Student dashboard
- Teacher dashboard
- Admin metrics

**Pattern (cache-first):**
```
GET /api/dashboard/:userId
1. Check Redis
2. If hit → return cached data
3. If miss → fetch from Supabase
4. Store in Redis (TTL 300s)
5. Return response
```

**Redis key format:** `dashboard:{role}:{userId}`  
**TTL:** 300 seconds (5 minutes)

---

### 2. Role & permission checks (mandatory)

Cache user roles and permissions.

**Redis key:** `auth:role:{userId}`  
**TTL:** 1–6 hours

**Invalidate when:**
- Role is updated
- User is suspended

---

### 3. Attendance (strict rule)

- **Today’s attendance** → Redis (temporary)
- **Final attendance** → Supabase (permanent)

**Redis key:** `attendance:{date}:{classId}`  
**Redis type:** HASH

**Sync to Supabase:**
- End-of-day cron job
- On teacher submission

---

### 4. Fee summary & read-only finance views

**Allowed:** Fee totals, due amounts, payment status (read-only)  
**Not allowed:** Individual payment transactions as source of truth

**Redis key:** `fees:summary:{studentId}`  
**TTL:** 300 seconds

**Invalidate on:** New payment, fee update

---

### 5. Notifications & counters

Use Redis for:
- Unread notification count
- Live badge updates

**Redis key:** `notifications:count:{userId}`  
**TTL:** No TTL or refresh on update

---

### 6. API rate limiting (required)

Every public API MUST implement rate limiting using Redis when available.

**Redis key:** `rate:{ip}:{route}`  
**Expiration:** 60 seconds (sliding or fixed window)

---

## Where Redis MUST NOT be used

| Feature            | Reason                    |
|--------------------|---------------------------|
| Marks storage      | Data integrity            |
| Exam results       | Legal correctness         |
| Payment records    | Financial compliance      |
| Audit logs         | Must persist              |
| User profile writes| Strong consistency needed |

---

## Cache invalidation strategy (required)

On any write:

1. Write to Supabase first.
2. Immediately delete related Redis keys (or key pattern).
3. Never update Redis directly for persisted data.

**Example:**
```
UPDATE student profile
→ DEL dashboard:student:{id}
→ DEL auth:role:{id}
```

---

## Redis key naming convention (mandatory)

Format: **`<domain>:<entity>:<identifier>`**

**Examples:**
- `student:dashboard:123`
- `attendance:2026-02-04:10A`
- `auth:role:teacher_99`
- `fees:summary:student_456`
- `rate:192.168.1.1:auth-login`

No random or inconsistent keys allowed.

---

## Error handling rule

All Redis operations MUST be wrapped in try/catch.

**If Redis fails:**
1. Log the error
2. Continue using Supabase
3. Never break the user flow

---

## Performance targets

- Redis response: **< 30ms**
- DB hits reduced by **≥ 60%** for cacheable endpoints
- Dashboard APIs must be cacheable with TTL

---

## Code expectations

When writing code that uses Redis:

1. Always show: **Redis read → DB fallback → Redis write (on miss)**.
2. Always include **TTL** when setting keys.
3. Never skip **invalidation logic** on writes.
4. Use **meaningful cache keys** following the naming convention.

---

## Mental model

- **Supabase** stores facts.
- **Redis** stores convenience.
- Facts are permanent. Convenience expires.

---

## Environment

Set in production (optional; if unset, cache is skipped and rate limiting uses in-memory):

- **`REDIS_URL`** – Redis connection string (e.g. `redis://localhost:6379` or Redis Cloud URL)

## Implementation reference

- Redis client and safe fallback: `lib/redis.ts`
- Cache-first helper: `lib/cache.ts` (get → miss → fetch → set with TTL; invalidate)
- Rate limiting: `lib/rate-limit.ts` (uses Redis when `REDIS_URL` is set; otherwise in-memory)
