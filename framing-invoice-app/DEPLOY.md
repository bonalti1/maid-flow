# Putting the app on the web (Render)

Goal: a real web link your team opens from any phone or computer, protected by a
password — no terminal, no Mac left running.

### Why not Netlify / Vercel?
Those host *static websites and short JavaScript functions only*. This app is a
**Python server** with a database, file uploads, and AI calls that take 20–30
seconds — they can't run it. **Render** runs Python apps properly, gives free
HTTPS, and lets you start free and upgrade when ready. (The repo is already set
up for Render.)

---

## One-time setup (~10 minutes)

1. Go to **render.com** → sign up (free) → connect your **GitHub** account.
2. Click **New + → Web Service**.
3. Choose the repo **bonalti1/maid-flow**. If it asks "Blueprint" vs "Web
   Service", pick **Web Service**.
4. Fill in these settings:
   | Field | Value |
   |---|---|
   | **Name** | `stb-invoice-check` (or anything) |
   | **Branch** | `claude/framing-invoice-review-app-7m3jb5` |
   | **Root Directory** | `framing-invoice-app` |
   | **Language / Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | **Instance Type** | `Free` (start here) — or `Starter` for saved data |
5. Open **Advanced → Environment Variables** and add three:
   | Key | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your `sk-ant-...` key |
   | `APP_USERNAME` | a username you choose (e.g. `alto`) |
   | `APP_PASSWORD` | a password you choose for your team |
6. Click **Create Web Service** and wait ~3–5 minutes for the status to say
   **Live**.
7. Open the URL Render gives you (like `https://stb-invoice-check.onrender.com`).
   Your browser will ask for the **username + password** you set — enter them and
   you're in. **It's on the web.** 🎉

Share the link + password with your team. On a phone, open it in Safari/Chrome →
**Share → Add to Home Screen** to use it like an app.

---

## Saving your data permanently (Starter plan, ~$7/mo)

The **Free** plan sleeps after ~15 min idle (slow first load) and resets saved
data when the app updates. Your baseline auto-reloads either way, but to keep
**invoice history** permanently:

1. Render → your service → **Settings → Instance Type → Starter**.
2. **Settings → Disks → Add Disk** → Name `data`, Mount Path `/var/data`,
   Size `1 GB`.
3. **Environment → Add** two variables:
   - `FRAMING_DB` = `/var/data/framing.db`
   - `FRAMING_UPLOADS` = `/var/data/uploads`
4. Save — it redeploys and now keeps everything between updates.

---

## Updating later
Render watches the branch and can **auto-deploy** new changes, or use
**Manual Deploy → Deploy latest commit** anytime.

## Security notes
- The entire app sits behind your password, sent over **HTTPS** (automatic on
  Render).
- Keep `ANTHROPIC_API_KEY` and `APP_PASSWORD` **only** in Render's dashboard —
  never in screenshots, emails, or chats.
- Change the password anytime by editing `APP_PASSWORD` and redeploying.
