# Vercel Environment Variable Setup for MobiTrak Frontend

## Required Environment Variable

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com` |

---

## Steps to Add in Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) and open your **mobitrak-frontend** project.
2. Click **Settings** → **Environment Variables**.
3. Click **Add New**.
4. Set:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com`
   - **Environment:** Check all three — ✅ Production, ✅ Preview, ✅ Development
5. Click **Save**.
6. Go to **Deployments** → click **⋮** on the latest deployment → **Redeploy** to apply the new variable.

> [!IMPORTANT]
> Vercel does NOT auto-redeploy when you add/change environment variables. You must manually trigger a redeploy.

---

## Required GitHub Secrets (for Backend CI/CD)

Go to **GitHub → mobitrak-backend repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name | Value |
|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173,https://<your-vercel-domain>.vercel.app` |
| `FRONTEND_URL` | `https://<your-vercel-domain>.vercel.app` |

Replace `<your-vercel-domain>` with your actual Vercel project URL (e.g. `mobitrak-abc123`).

> [!NOTE]
> `ALLOWED_ORIGINS` accepts a **comma-separated** list. This enables both local dev (`localhost:5173`) and production (`vercel.app`) to call the API without CORS errors.

After adding the secret, push any commit to `master` to trigger the CI/CD pipeline which will redeploy Lambda with the updated CORS config.

---

## Local Development

For local development against **serverless-offline** (recommended):
```
# mobitrak-frontend/.env
VITE_API_URL=http://localhost:3000
```

For local development against the **live AWS** backend (also works):
```
# mobitrak-frontend/.env
VITE_API_URL=https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com
```

> [!TIP]
> The `.env` file is gitignored. Any developer can set their own `VITE_API_URL` without affecting other team members.

---

## Rollback Instructions

### Frontend Rollback
1. In Vercel → Deployments, click any previous deployment → **Promote to Production**.

### Backend Rollback (CORS)
- The `ALLOWED_ORIGINS` env var controls CORS. To temporarily allow all origins for debugging:
  - Set `ALLOWED_ORIGINS` GitHub Secret to `*` and redeploy.
  - **Never leave wildcard in production** — revert after debugging.
- To revert code changes: `git revert HEAD` in `mobitrak-backend`, push to `master`.

---

## Validation Checklist

After deployment, verify:

- [ ] `https://g5ly7nfs0m.execute-api.ap-south-1.amazonaws.com/health` returns `{"status":"ok"}`
- [ ] Login works on the Vercel frontend with no CORS errors in DevTools Console
- [ ] Network requests in DevTools show AWS endpoint (not localhost)
- [ ] `x-auth-token` header is sent on authenticated requests
- [ ] Protected routes load correctly after login
- [ ] No hardcoded localhost URLs remain: run `Select-String -Path ".\src\services\*.js" -Pattern "localhost"` — should return nothing
