---
name: domain-name-brainstormer
description: Generates creative domain name ideas and checks their availability using DNS lookups and WHOIS data. Use when brainstorming domain names, checking if domains are available, finding brand names, or searching for available domains for a startup, product, or brand.
allowed-tools: Bash(whois:*), Bash(dig:*), Bash(node:*), WebSearch
---

# Domain Name Brainstormer

A skill for generating creative, memorable domain names and checking their availability in real-time.

## Quick Start

Describe your business or brand, and I'll:
1. Generate 12-20 creative domain name ideas
2. Check availability for each using DNS/WHOIS
3. Highlight the best available options with reasoning
4. Suggest alternative TLDs (.com, .io, .dev, .ai, etc.)

## How to Use

Tell me:
- What your business/brand does
- Target audience or industry
- Preferred TLD (.com, .io, .co, etc.)
- Any specific keywords you want included
- Budget considerations (standard vs premium domains)

## Example Usage

**User**: "I'm making a productivity app for remote teams"

**I'll generate**:
- focusflow.com (checking availability...)
- syncteams.io (checking availability...)
- remotepulse.co (checking availability...)
- teamflow.app (checking availability...)

Then recommend the 3-5 best available options with detailed reasoning.

**User**: "Check if pizzanearme.com is available"

**I'll check**:
- DNS resolution to see if domain is registered
- WHOIS data for registration details
- Alternative TLDs if .com is taken
- Similar available variations

## Domain Naming Principles

When brainstorming, I follow these principles:

### Good Domain Characteristics
- **Short**: 6-12 characters ideal (15 max)
- **Memorable**: Easy to recall and spell
- **Relevant**: Keywords or metaphors related to your business
- **Pronounceable**: Can be said aloud naturally
- **Brandable**: Unique, not generic
- **No Hyphens**: Harder to communicate verbally
- **No Numbers**: Can be confusing (2 vs two)

### Brainstorming Techniques
- **Combination**: Merge two words (Dropbox, LinkedIn)
- **Truncation**: Shorten phrases (Instagram, YouTube)
- **Metaphors**: Analogies to your business (Twitter, Slack)
- **Neologisms**: Made-up words (Google, Kodak)
- **Portmanteaus**: Blend words (Pinterest = Pin + Interest)

## Availability Checking

I use multiple methods to verify domain availability:

1. **DNS Lookup**: Quick check if domain resolves
   ```bash
   dig +short example.com
   ```
   - Returns IP = Domain is registered
   - Returns nothing = Likely available

2. **WHOIS Query**: Detailed registration info
   ```bash
   whois example.com
   ```
   - Shows registrar, creation date, expiry
   - "No match" or "Not found" = Available

3. **Bulk Checking**: For lists of domains
   - Loop through each domain
   - Report available vs taken
   - Suggest alternatives for taken domains

## TLD Recommendations

I'll suggest appropriate TLDs based on your industry:

| TLD | Best For | Cost/Year |
|-----|----------|-----------|
| .com | Universal, most trusted | $10-15 |
| .io | Tech startups, developer tools | $30-50 |
| .ai | AI/ML companies | $50-80 |
| .dev | Developer products | $12-20 |
| .app | Applications, software | $12-18 |
| .co | Modern alternative to .com | $15-30 |
| .me | Personal brand/portfolio | $10-20 |
| .xyz | Creative, modern projects | $5-15 |

## Domain Status Codes

When checking availability, you'll see:

- ✅ **Available**: Not registered, you can buy it now
- ❌ **Taken**: Registered and in use
- 💰 **Premium**: Available but at higher price ($100s-$1000s)
- 🔒 **Reserved**: Special restrictions (e.g., geographic TLDs)
- ⚠️ **Parked**: Registered but not actively used (may be for sale)

## Batch Checking

For checking multiple domains at once:

**User**: "Check these domains: example.com, example.io, example.dev"

I'll:
1. Parse the list
2. Check each domain sequentially
3. Report results in a table format
4. Highlight all available options
5. Suggest next steps

## Premium/Taken Domain Alternatives

If your ideal domain is taken, I'll:
1. Check alternative TLDs
2. Suggest variations (prefixes/suffixes)
3. Try synonyms and related words
4. Check hyphenated versions (as last resort)
5. Research if domain is for sale

## Next Steps After Finding Available Domain

Once we find the perfect domain:
1. **Register immediately** - Good domains get taken quickly
2. **Buy multiple TLDs** - Protect your brand (.com + .io)
3. **Check social handles** - Ensure @username is available
4. **Verify trademarks** - No legal conflicts
5. **Consider privacy** - WHOIS privacy protection

## Example Workflow

**User**: "I'm building directory websites for 'near me' searches like icecreamnearme.com"

**My Response**:
1. Check icecreamnearme.com availability
2. Generate similar ideas:
   - coffeenearme.com
   - pizzanearme.com
   - gymsnearme.com
   - etc.
3. Batch check all domains
4. Report which are available
5. Suggest best options based on search volume
6. Provide registration links

## Advanced Features

### Competitor Analysis
Research successful competitors' naming patterns and suggest similar available domains.

### SEO Considerations
Analyze keyword search volume and suggest domains that match high-traffic searches.

### Multilingual Options
Generate names in multiple languages for global brands.

### Exact Match Domains
Find domains that exactly match search queries (valuable for SEO).

## Technical Implementation

This skill uses:
- `whois` command for registration lookups
- `dig` command for DNS resolution
- Node.js scripts for bulk checking
- Web search for premium domain pricing
- API calls to registrar services (when available)

## Troubleshooting

**Issue**: WHOIS lookup fails
- **Solution**: Try alternative WHOIS servers or use DNS lookup as fallback

**Issue**: Rate limiting on bulk checks
- **Solution**: Add delays between checks (1-2 seconds)

**Issue**: Private registration hides details
- **Solution**: Use DNS as primary indicator of availability

## Related Skills

After finding a domain:
- Use logo design skills for branding
- Check social media handle availability
- Research trademark conflicts
- Plan brand identity (colors, fonts, style)

## Quick Reference

```bash
# Check single domain
whois example.com

# Quick DNS check
dig +short example.com

# Bulk check (requires list.txt with one domain per line)
while read domain; do
  echo -n "$domain: "
  dig +short "$domain" > /dev/null && echo "TAKEN" || echo "AVAILABLE"
done < list.txt
```

---

**Ready to brainstorm?** Just describe your project and I'll find you the perfect domain name!
