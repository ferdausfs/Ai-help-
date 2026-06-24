# DesignChat PWA — Real AI App

Eta ekta Android-ready PWA + real AI backend proxy. Apni OpenAI API key server-e set korle app real assistant-er moto chat kore design suggestion, UX flow, color palette, component list, and live mobile/web preview generate korbe.

## Important truth: 0 taka possible?

- App code + hosting: free tier diye 0 taka-te possible.
- OpenAI API: usually paid. Free trial/credit thakle sei credit sesh na howa porjonto khoroch hobe na. Credit na thakle API call-e charge hobe.
- 100% 0 taka forever chaile OpenAI na — local AI/Ollama or kono free-tier model use korte hobe.

## Local run — apnar computer-e

1. Node.js install korun: https://nodejs.org
2. Folder-e jan:

```bash
cd design-chat-pwa
```

3. OpenAI key file banan:

```bash
cp .env.example .env.local
```

4. `.env.local` open kore ei line-e apnar key paste korun:

```bash
OPENAI_API_KEY=sk-your-real-key-here
```

5. App run korun:

```bash
npm run dev
```

6. Browser-e open korun:

```text
http://localhost:8080
```

## Free deploy — Vercel easiest

1. Ei folder GitHub repo-te push korun.
2. https://vercel.com e login korun.
3. **Add New → Project** → GitHub repo select korun.
4. Environment Variables-e add korun:

```text
OPENAI_API_KEY = sk-your-real-key-here
OPENAI_MODEL = gpt-4o-mini
```

5. Deploy click korun.
6. Vercel HTTPS link Android Chrome-e open korun → menu → **Add to Home screen**.

## GitHub push commands

```bash
cd design-chat-pwa
git init
git add .
git commit -m "Initial real DesignChat PWA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Files

- `index.html` — PWA UI
- `styles.css` — design
- `app.js` — chat + preview logic
- `server.js` — local backend proxy for OpenAI
- `api/chat.js` — Vercel serverless backend proxy
- `.env.example` — key setup template
- `manifest.webmanifest` + `sw.js` — Android install/offline support

## Safety

Production-e OpenAI API key frontend/browser-e deben na. Ei app default `/api/chat` backend proxy use kore — key server/hosting environment variable-e thakbe.
