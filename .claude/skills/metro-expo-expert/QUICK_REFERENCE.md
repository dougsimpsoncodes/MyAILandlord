# Metro/Expo Expert - Quick Reference

## 🚨 Emergency Fix (Code Not Updating)

```bash
# 1. Kill all Metro processes
pkill -f "expo start" && pkill -f "metro" && lsof -ti:8081 | xargs kill -9 2>/dev/null

# 2. Clear all caches
rm -rf ~/.metro ~/Library/Caches/Metro .metro-cache node_modules/.cache .expo/metro-cache

# 3. Restart with --clear flag
npx expo start --clear

# 4. On device: Force quit app → Reopen
```

## ⚡ Quick Decision Tree

```
Did I change native code or add native dependencies?
├─ YES → Run: npx expo run:ios --device
└─ NO → Run: npx expo start --clear
```

## 📋 Common Commands

### JavaScript Changes Only
```bash
npx expo start --clear
```

### Native Changes (libraries, config, native code)
```bash
npx expo run:ios --device "iPhone Name"
# or for simulator
npx expo run:ios
```

### Check if Metro is Running
```bash
lsof -i:8081 | grep LISTEN
```

### Kill Metro Process
```bash
lsof -ti:8081 | xargs kill -9
```

### View Metro Logs
```bash
tail -f /tmp/metro.log
```

## 🎯 When to Use `--clear` Flag

**ALWAYS use `--clear` when:**
- Code changes not appearing
- Debugging cache issues
- After fixing bugs
- After modifying metro.config.js or babel.config.js
- Behavior seems inconsistent
- "Old code" still running

**Example:**
```bash
npx expo start --clear
```

## 🔍 Verify Fix is Actually Running

```bash
# 1. Read the source file
cat src/hooks/useProfileSync.ts | grep "your fix text"

# 2. Check Metro logs for bundle requests
tail -f /tmp/metro.log | grep -E "(bundle|transform)"

# 3. Look for your console.log statements in app
# Make sure the NEW code's logs appear
```

## 📱 Device Workflow

### Force Quit App
1. Swipe up from bottom (hold on older iPhones)
2. Swipe app card away

### Connect to Metro
- Auto-connects usually
- Manual: Enter `YOUR_IP:8081` (get IP with `ipconfig getifaddr en0`)

### Reload App
- Shake device → "Reload"
- Or force quit and reopen

## 🐛 Troubleshooting Checklist

- [ ] Verified fix is saved in source file?
- [ ] Killed ALL Metro processes?
- [ ] Cleared cache directories?
- [ ] Restarted Metro with `--clear`?
- [ ] Force quit app and reopened?
- [ ] Metro logs showing bundle requests?
- [ ] Console logs show NEW code running?

## 📚 Official Docs Quick Links

- [Metro bundler - Expo](https://docs.expo.dev/guides/customizing-metro/)
- [Development builds - Expo](https://docs.expo.dev/develop/development-builds/use-development-builds/)
- [Fast Refresh - React Native](https://reactnative.dev/docs/fast-refresh)
- [Metro troubleshooting](https://metrobundler.dev/docs/troubleshooting/)

## 💡 Pro Tips

1. **Pipe Metro to file for easier debugging:**
   ```bash
   npx expo start --clear > /tmp/metro.log 2>&1 &
   tail -f /tmp/metro.log
   ```

2. **Filter logs for errors:**
   ```bash
   tail -f /tmp/metro.log | grep -i error
   ```

3. **Check which process is on 8081:**
   ```bash
   lsof -i:8081
   ```

4. **Nuclear option (clears everything):**
   ```bash
   rm -rf node_modules && npm install
   npx expo start --clear
   ```

## ⚠️ Common Mistakes to Avoid

❌ **Don't:** Run `npx expo run:ios` for every JavaScript change
✅ **Do:** Use `npx expo start --clear` for JS changes

❌ **Don't:** Restart Metro without `--clear` when debugging
✅ **Do:** Always use `--clear` flag when troubleshooting

❌ **Don't:** Assume cache is cleared automatically
✅ **Do:** Explicitly clear cache with commands or `--clear` flag

❌ **Don't:** Keep coding if changes aren't appearing
✅ **Do:** Stop and fix Metro first - verify each change loads
