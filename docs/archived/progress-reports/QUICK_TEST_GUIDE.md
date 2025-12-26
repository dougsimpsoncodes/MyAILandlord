# Quick Test Guide - Automated Fix Validation

## TL;DR

```bash
# Test the area photos persistence fix
npm run test:fix:area-photos
```

## The 5-Minute Process

### 1️⃣ Before Fixing
```bash
# Write E2E test that reproduces the bug
# Test should FAIL (confirms it catches the bug)
npm run test:fix:area-photos
```
Expected: ❌ TEST FAILED

### 2️⃣ Apply Fix
Make your code changes

### 3️⃣ After Fixing
```bash
# Run same test again
npm run test:fix:area-photos
```
Expected: ✅ TEST PASSED

### 4️⃣ Deploy
Only deploy after test passes!

## What This Does

The automated test:
- ✅ Starts real app (Metro/Expo)
- ✅ Simulates exact user flow
- ✅ Uses real database & auth
- ✅ Catches integration bugs
- ✅ Gives you confidence

## For This Fix

**Bug:** Kitchen photos disappear when adding asset

**Test Flow:**
1. Login as landlord
2. Add 3 photos to Kitchen
3. Add Fridge asset with photo
4. Verify Kitchen still shows 3 photos ✅

## Other Useful Commands

```bash
# Test any fix by pattern
npm run test:fix <pattern>

# Run all E2E tests
npm run test:e2e

# Debug mode (see browser)
npx playwright test --headed --grep="area-photos"
```

## Success Indicators

✅ Test passes before manual testing
✅ Fix works in real app flow
✅ Database state is correct
✅ No side effects on other features

## Failure Indicators

❌ Test times out → Server issue
❌ Photos not found → Upload logic broken
❌ Database error → RLS or schema issue
❌ Navigation fails → Routing problem

## Next Steps

1. ✅ Run the test
2. ✅ See it pass
3. ✅ Test manually (should work!)
4. ✅ Commit with confidence
5. ✅ Deploy knowing it works

## Full Documentation

See `docs/AUTOMATED_FIX_TESTING.md` for complete details.

---

**Remember:** Never declare a fix complete without E2E validation! 🎯
