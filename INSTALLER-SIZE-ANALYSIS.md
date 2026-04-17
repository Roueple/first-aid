# Windows Installer Size Analysis

## Current Size Breakdown

**Total Unpacked Size: ~640 MB**
- **app.asar (bundled app): 328 MB** ⚠️ CRITICAL ISSUE
- Electron runtime: 295 MB (normal)
- Locales (55 languages): 46 MB (can be optimized)
- Unpacked modules (jszip, electron-updater): ~2 MB (normal)

**Installer Size: ~700 MB** (includes compression overhead)

---

## Critical Issues Found

### 1. ⚠️ firebase-admin in Production Dependencies (MAJOR)

**Impact: ~100-150 MB**

`firebase-admin` is a server-side SDK that should NEVER be in an Electron renderer bundle. It's currently listed in `dependencies` in `package.json`.

**Why this is wrong:**
- firebase-admin is for Node.js servers/Cloud Functions only
- It includes the entire Google Cloud SDK
- Your app uses `firebase` (client SDK) which is correct
- firebase-admin is only needed in `/functions` folder

**Fix:**
```json
// In package.json, MOVE firebase-admin to devDependencies
"devDependencies": {
  "firebase-admin": "^13.6.0",  // Move here
  ...
}
```

Or better yet, remove it entirely from root package.json since it's already in `functions/package.json`.

---

### 2. ⚠️ Unused Locale Files (MEDIUM)

**Impact: ~40 MB**

Electron bundles 55 language packs, but you only need English and Indonesian.

**Fix:**
```json
// In electron-builder.json, add:
"electronLanguages": ["en", "id"]
```

---

### 3. ⚠️ Large AI Libraries in Renderer (MEDIUM)

**Impact: ~50-80 MB**

`@google/genai` and `@google/generative-ai` are both listed as dependencies. You're using `@google/genai` in services.

**Potential optimization:**
- Ensure only one AI library is used
- Consider moving AI processing to main process (Electron best practice)
- Use IPC to communicate between renderer and main

---

### 4. Potential Bundle Bloat (LOW-MEDIUM)

**Impact: ~20-50 MB**

Multiple large UI libraries:
- `@chatscope/chat-ui-kit-react`
- `framer-motion`
- `recharts`
- `@tanstack/react-table`
- `lottie-react` + `@lottiefiles/dotlottie-react` (two Lottie libraries?)

**Check:**
- Are both Lottie libraries needed?
- Can any UI libraries be lazy-loaded?

---

## Recommended Fixes (Priority Order)

### Priority 1: Remove firebase-admin (CRITICAL)
**Expected savings: 100-150 MB**

```bash
# 1. Remove from root dependencies
npm uninstall firebase-admin

# 2. Verify it's still in functions/package.json (it is)
# 3. Rebuild
npm run build
npm run dist:win
```

### Priority 2: Limit Electron Locales (EASY WIN)
**Expected savings: 40 MB**

Add to `electron-builder.json`:
```json
{
  "electronLanguages": ["en", "id"],
  ...
}
```

### Priority 3: Audit AI Libraries (MEDIUM EFFORT)
**Expected savings: 50-80 MB**

Check if you need both:
- `@google/genai` (currently used)
- `@google/generative-ai` (listed but maybe unused?)

```bash
# Check usage
npm ls @google/generative-ai
```

If unused, remove it:
```bash
npm uninstall @google/generative-ai
```

### Priority 4: Check for Duplicate Libraries (LOW EFFORT)
**Expected savings: 10-20 MB**

You have two Lottie libraries:
- `lottie-react`
- `@lottiefiles/dotlottie-react`

Pick one and remove the other if possible.

---

## Additional Optimizations

### 1. Enable Tree Shaking for Firebase
```typescript
// In vite.config.ts, update rollupOptions:
rollupOptions: {
  output: {
    manualChunks: {
      'firebase-core': ['firebase/app'],
      'firebase-auth': ['firebase/auth'],
      'firebase-firestore': ['firebase/firestore'],
      // Split Firebase into smaller chunks
    },
  },
}
```

### 2. Lazy Load Heavy Components
```typescript
// Example: Lazy load chart components
const BernardAggregationChart = lazy(() => import('./components/BernardAggregationChart'));
```

### 3. Analyze Bundle Size
```bash
# Add to package.json scripts:
"analyze": "vite build --mode analyze"

# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer
```

---

## Expected Results After Fixes

| Fix | Current | After | Savings |
|-----|---------|-------|---------|
| Remove firebase-admin | 328 MB | 200 MB | 128 MB |
| Limit locales | 46 MB | 6 MB | 40 MB |
| Remove unused AI lib | - | - | 50 MB |
| **Total** | **640 MB** | **~420 MB** | **~220 MB** |

**Expected installer size: ~450-500 MB** (down from 700 MB)

---

## Verification Steps

After each fix:
```bash
# 1. Clean build
npm run build

# 2. Package
npm run dist:win

# 3. Check size
dir release\win-unpacked\resources\app.asar
```

---

## Notes

- Electron runtime (295 MB) cannot be reduced - it's Chromium + Node.js
- Some bundle size is unavoidable with React + Firebase + AI
- Target: Get installer under 500 MB (currently 700 MB)
- Realistic minimum: ~400-450 MB for this feature set
