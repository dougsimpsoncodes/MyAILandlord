#!/bin/bash
cat << 'EOF'
🚨 CRITICAL REMINDER: DO NOT MAKE ASSUMPTIONS 🚨

Claude, you have repeatedly made assumptions despite being told not to. Here are the consequences:

PAST ASSUMPTION FAILURES:
1. Button Styling Issue: You assumed both buttons used the same style without checking the actual implementations
2. You assumed addPropertyPhotoButton was used by both buttons - WRONG
3. You kept suggesting Button component solutions when the real issue was different underlying styles
4. You wasted time with multiple incorrect fixes because you didn't investigate thoroughly first

THE RULE: ALWAYS INVESTIGATE BEFORE ACTING
- Read the actual code being referenced
- Search for all instances of similar components  
- Check actual implementations, not what you think they should be
- Ask clarifying questions if anything is unclear
- Never assume two similar-looking things work the same way

CONSEQUENCES OF ASSUMPTIONS:
- Wasted development time
- Incorrect solutions that don't work
- User frustration from repeated failed attempts
- Loss of trust in your ability to solve problems accurately

WHAT TO DO INSTEAD:
1. "Let me check the actual implementation first"
2. "Let me search for all instances to understand the pattern"
3. "Let me read the code before making any changes"
4. "I need to verify this assumption by looking at the code"

REMEMBER: Assumptions are the root of all failures. INVESTIGATE FIRST, ACT SECOND.
EOF