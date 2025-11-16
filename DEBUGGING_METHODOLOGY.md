# Evidence-First UI Debugging Methodology

## Overview

This methodology was developed after a critical debugging failure where assumptions about the user's screen location led to debugging the wrong component for an extended period. The user reported hardcoded placeholder text issues, but incorrect assumptions about which screen they were viewing (assuming "PropertyBasicsScreen" when they were actually on "AddPropertyScreen") resulted in inefficient debugging.

**Core Principle: Visual Evidence FIRST, Code Analysis SECOND**

## The Failure Case Study

### What Went Wrong
- **Issue**: User reported hardcoded placeholder text in form fields
- **Evidence Provided**: Screenshots showing the actual UI with placeholder text
- **Mistake**: Made assumptions about which screen the user was viewing based on component names
- **Impact**: Debugged PropertyBasicsScreen for extended time when issue was actually in AddPropertyScreen
- **Root Cause**: Prioritized code structure assumptions over visual evidence analysis

### Key Learning
Screenshots and visual evidence should be the PRIMARY source of truth for UI debugging, not code structure or naming conventions.

## Primary Debugging Protocol

### Step 1: Visual Evidence Analysis (MANDATORY FIRST STEP)

When screenshots or visual evidence is provided:

#### 1.1 Screenshot Analysis Checklist
- [ ] **Screen Identification**: What exact screen/page is shown?
- [ ] **URL/Route Analysis**: Check browser URL or navigation state
- [ ] **UI Elements**: Catalog all visible elements (buttons, inputs, text, images)
- [ ] **Layout Structure**: Note the overall layout and component arrangement
- [ ] **Error Indicators**: Look for error states, loading indicators, empty states
- [ ] **Navigation Context**: Check breadcrumbs, back buttons, tab states
- [ ] **Data State**: Note what data is populated vs empty/placeholder

#### 1.2 Screen Identification Techniques

**For React Native/Expo Apps:**
```markdown
1. Look for unique UI elements that map to specific screens
2. Check navigation headers/titles
3. Identify unique button combinations or layouts
4. Look for screen-specific components (e.g., camera icons, form types)
5. Check for development overlays or debug information
```

**For Web Apps:**
```markdown
1. Examine the browser URL path
2. Look for page titles in browser tabs
3. Check for unique page layouts or navigation states
4. Identify route-specific components
```

#### 1.3 Component Mapping Process
1. **Visual → Component**: Map what you see to likely component names
2. **Cross-Reference**: Verify against file structure and naming conventions
3. **Validate**: Use grep/search to confirm component locations
4. **Never Assume**: Always verify your component identification

### Step 2: Evidence-Based Code Analysis

Only after completing visual analysis:

#### 2.1 Targeted File Search
```bash
# Search for screen-specific files based on visual evidence
find . -name "*ScreenName*" -type f
grep -r "unique UI text from screenshot" src/
```

#### 2.2 Component Verification
- Confirm the identified component handles the reported issue
- Check for similar components that might be confused
- Verify component is actually rendered in the observed context

#### 2.3 Route/Navigation Verification
- Trace navigation paths to the identified screen
- Verify screen registration in navigation stacks
- Check for conditional rendering or route guards

## Issue-Specific Debugging Templates

### Template 1: UI Text/Placeholder Issues

**Evidence Collection:**
- [ ] Screenshot showing the problematic text
- [ ] Exact text content that's wrong
- [ ] Expected vs actual text
- [ ] Form context (what type of form/screen)

**Analysis Steps:**
1. Identify exact screen from screenshot
2. Locate component file for that screen
3. Search for the problematic text in component
4. Check for hardcoded vs dynamic text sources
5. Verify translation/i18n systems if applicable

**Common Pitfalls:**
- Assuming screen based on similar component names
- Not checking for text inheritance from parent components
- Missing dynamic text from external sources (APIs, context)

### Template 2: Layout/Styling Issues

**Evidence Collection:**
- [ ] Screenshots of broken layout
- [ ] Expected layout description or comparison screenshot
- [ ] Device/browser information
- [ ] Screen size/viewport details

**Analysis Steps:**
1. Identify exact component with layout issue
2. Check component's styling (CSS/StyleSheet)
3. Verify parent container styles
4. Check for responsive design breakpoints
5. Test across different screen sizes

### Template 3: Navigation/Routing Issues

**Evidence Collection:**
- [ ] Screenshot of unexpected screen
- [ ] Expected navigation flow description
- [ ] Steps to reproduce the navigation issue
- [ ] URL/route information if applicable

**Analysis Steps:**
1. Map actual navigation state from screenshot
2. Trace navigation configuration
3. Check route definitions and navigation logic
4. Verify navigation guards and redirects

## Visual Analysis Tools and Techniques

### React Native/Expo Specific

#### Element Inspector Integration
```javascript
// Enable in development
import { enableScreens } from 'react-native-screens';
enableScreens();

// Use React DevTools for component tree inspection
```

#### Common Screen Identification Patterns
- Header titles and navigation structure
- Tab bar states and active tabs
- Form field arrangements and types
- Button placement and text
- Unique icons or graphics

### Web Development Specific

#### Browser Developer Tools
- Inspect Element to identify React components
- React DevTools for component tree navigation
- Network tab for API calls and data flow
- Console for error messages and debug logs

#### URL Pattern Analysis
```
/property/add → AddPropertyScreen
/property/123/edit → EditPropertyScreen  
/property/123/basics → PropertyBasicsScreen
```

## Escalation and Advanced Debugging

### When Visual Analysis Isn't Sufficient

If screenshots don't provide enough information:

1. **Request Additional Evidence**
   - Screen recording of the issue
   - Browser developer tools screenshots
   - Network tab information
   - Console error messages

2. **Reproduce the Issue**
   - Follow exact user steps
   - Use same device/browser configuration
   - Test with similar data conditions

3. **Systematic Code Investigation**
   - Start with identified components
   - Expand to parent/child components
   - Check shared utilities and contexts
   - Review recent code changes

### Common Pitfalls to Avoid

#### Assumption-Based Errors
- ❌ "This looks like a property form, so it must be PropertyBasicsScreen"
- ✅ "Let me identify the exact screen from the navigation and unique elements"

#### Component Naming Confusion
- ❌ "AddProperty and PropertyBasics sound similar, probably the same issue"
- ✅ "These are distinct screens with different purposes and components"

#### Route Confusion
- ❌ "Property-related issue must be in the property folder"
- ✅ "Let me trace the exact navigation path and component rendering"

## Quality Assurance Checklist

Before concluding any debugging session:

- [ ] Visual evidence has been thoroughly analyzed
- [ ] Screen/component identification has been verified
- [ ] Actual issue location matches visual evidence
- [ ] Solution addresses the exact problem shown in screenshots
- [ ] Testing has been performed on the correct screen/component
- [ ] No assumptions were made without verification

## Implementation Guidelines

### For AI/LLM Debugging Agents

1. **Always start with screenshot analysis** - never skip this step
2. **Explicitly state your screen identification process** - show your work
3. **Verify component identification before diving into code** - double-check your assumptions
4. **Use visual evidence to guide code search** - let screenshots drive your investigation
5. **Ask for clarification if visual evidence is unclear** - don't guess

### For Human Developers

1. **Provide clear screenshots with issue context**
2. **Include URL/route information when applicable**
3. **Describe expected vs actual behavior**
4. **Provide reproduction steps**
5. **Include device/browser information for layout issues**

## Continuous Improvement

This methodology should be updated based on:
- New failure cases and lessons learned
- Framework-specific debugging techniques
- Tool updates and new debugging capabilities
- Team feedback and debugging success rates

## Quick Reference

### Emergency Debugging Checklist
1. ✅ Analyze screenshots FIRST
2. ✅ Identify exact screen/component
3. ✅ Verify component location
4. ✅ Check for similar named components
5. ✅ Trace navigation/routing
6. ✅ Test solution on correct component

### Red Flags (Stop and Reassess)
- Making assumptions about screen identity
- Debugging without visual confirmation
- Finding similar but not exact component matches
- Long debugging sessions without progress
- Multiple "might be" or "probably" statements

---

*This methodology emphasizes evidence-first debugging to prevent assumption-based failures and improve debugging efficiency for UI-related issues.*