# Domain Name Brainstormer Skill

A Claude Code skill for generating creative domain names and checking their availability.

## Installation

This skill is already installed in your project at:
```
/Users/dougsimpson/Projects/MyAILandlord/skills/domain-name-brainstormer/
```

To use it globally (across all projects), copy to:
```bash
cp -r skills/domain-name-brainstormer ~/.claude/skills/
```

## Files

- **SKILL.md** - Main skill definition (required by Claude Code)
- **check-domains.js** - Helper script for bulk domain checking
- **README.md** - This file

## How to Use

### Activate the Skill

Simply ask Claude about domain names and the skill will activate automatically:

```
"I need a domain name for my AI chatbot startup"

"Check if pizzanearme.com is available"

"Brainstorm domain names for a productivity app"

"Check these domains: example.com, example.io, example.dev"
```

### Manual Domain Checking

You can also use the helper script directly:

```bash
# Single domain
node skills/domain-name-brainstormer/check-domains.js example.com

# Multiple domains
node skills/domain-name-brainstormer/check-domains.js example.com example.io example.dev

# From a file
cat domains.txt | node skills/domain-name-brainstormer/check-domains.js

# Get JSON output
JSON_OUTPUT=1 node skills/domain-name-brainstormer/check-domains.js example.com
```

### Example: Check "Near Me" Domains

Create a file with your domain list:

```bash
cat > nearme-domains.txt << 'EOF'
pizzanearme.com
coffeenearme.com
breakfastnearme.com
sushinearme.com
tacosnearme.com
bakeriesnearme.com
plumbersnearme.com
electriciansnearme.com
dentistsnearme.com
gymsnearme.com
EOF
```

Then check them all:

```bash
node skills/domain-name-brainstormer/check-domains.js < nearme-domains.txt
```

Or ask Claude:

```
"Check these 'near me' domains for availability:
- pizzanearme.com
- coffeenearme.com
- plumbersnearme.com
[etc...]"
```

## Features

✅ **Creative Brainstorming** - Generates memorable, brandable domain names
✅ **Real-time Availability** - Checks DNS and WHOIS for accurate results
✅ **Bulk Checking** - Check multiple domains at once
✅ **Multi-TLD Support** - Suggests .com, .io, .dev, .ai, and more
✅ **Naming Principles** - Follows best practices for domain selection
✅ **Alternative Suggestions** - Provides backups if preferred domains are taken

## Requirements

- Node.js (for check-domains.js script)
- `whois` command (pre-installed on macOS/Linux)
- `dig` command (pre-installed on macOS/Linux)
- Internet connection for lookups

## Tips

1. **Act Fast** - Good domains get registered quickly
2. **Check Multiple TLDs** - If .com is taken, try .io, .dev, .ai
3. **Avoid Hyphens** - Harder to communicate verbally
4. **Keep it Short** - 6-12 characters is ideal
5. **Say it Out Loud** - Make sure it's pronounceable
6. **Check Trademarks** - Avoid legal conflicts
7. **Secure Social Handles** - Make sure @username is available too

## Common TLD Pricing

| TLD | Annual Cost | Best For |
|-----|-------------|----------|
| .com | $10-15 | Universal, most trusted |
| .io | $30-50 | Tech startups |
| .ai | $50-80 | AI/ML companies |
| .dev | $12-20 | Developer tools |
| .app | $12-18 | Applications |

## Troubleshooting

**Skill doesn't activate?**
- Make sure SKILL.md exists in the correct location
- Restart Claude Code to reload skills
- Try using specific trigger words: "domain", "availability", "brand name"

**WHOIS lookups failing?**
- DNS check will still work as a fallback
- Try running manually: `whois example.com`
- Some TLDs have restricted WHOIS access

**Rate limiting on bulk checks?**
- Script includes 500ms delay between checks
- For large lists, consider breaking into smaller batches
- Use registrar bulk tools for 100+ domains

## Next Steps

After finding an available domain:

1. **Register immediately** at:
   - [Namecheap](https://www.namecheap.com)
   - [Google Domains](https://domains.google)
   - [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)

2. **Protect your brand**:
   - Buy multiple TLDs (.com + .io)
   - Enable WHOIS privacy
   - Set auto-renewal

3. **Build your brand**:
   - Design a logo
   - Secure social media handles
   - Set up email forwarding

## License

MIT - Free to use and modify
