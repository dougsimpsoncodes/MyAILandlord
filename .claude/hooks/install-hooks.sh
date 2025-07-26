#!/bin/bash

# Install Contextual Development Assistant Hook
# This script sets up the intelligent development companion

echo "🤖 Installing Contextual Development Assistant Hook..."

# Create git hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Contextual Development Assistant - Pre-commit Integration
echo "🤖 Contextual Development Assistant analyzing changes..."

# Run the contextual assistant
node .claude/hooks/contextual-assistant.js

# Continue with commit if analysis succeeds
exit $?
EOF

# Make pre-commit hook executable
chmod +x .git/hooks/pre-commit

# Install post-commit hook for continuous learning
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash

# Contextual Development Assistant - Post-commit Learning
echo "📚 Contextual Assistant learning from successful commit..."

# Log successful patterns for future learning
if [ -f .claude/hooks/last-guidance.json ]; then
    # Append to learning log
    echo "$(date): Commit successful with guidance: $(cat .claude/hooks/last-guidance.json | jq -r '.contexts[]')" >> .claude/hooks/learning-log.txt
fi
EOF

chmod +x .git/hooks/post-commit

# Install file change watcher hook (if supported)
cat > .git/hooks/post-checkout << 'EOF'
#!/bin/bash

# Contextual Development Assistant - Branch Change Detection
echo "🔄 Contextual Assistant updating context for branch change..."

# Reset context for new branch
rm -f .claude/hooks/last-guidance.json
echo "Context reset for branch: $(git branch --show-current)" >> .claude/hooks/learning-log.txt
EOF

chmod +x .git/hooks/post-checkout

# Create configuration file
cat > .claude/hooks/config.json << 'EOF'
{
  "contextualAssistant": {
    "enabled": true,
    "autoInvoke": true,
    "learningMode": true,
    "verboseOutput": false,
    "contexts": {
      "tenant": {
        "priority": "user_experience",
        "advisors": ["ux-design-advisor", "react-native-expert", "security-auditor"]
      },
      "landlord": {
        "priority": "efficiency",
        "advisors": ["data-analytics-advisor", "ux-design-advisor", "security-auditor"]
      },
      "security": {
        "priority": "critical",
        "advisors": ["security-auditor", "supabase-specialist", "git-security-guardian"]
      }
    },
    "conflictResolution": {
      "securityFirst": true,
      "userExperienceOverComplexity": true,
      "performanceThresholds": true
    }
  }
}
EOF

# Initialize learning log
touch .claude/hooks/learning-log.txt
echo "$(date): Contextual Development Assistant installed and activated" >> .claude/hooks/learning-log.txt

# Test the installation
echo "🧪 Testing installation..."
if node .claude/hooks/contextual-assistant.js --test; then
    echo "✅ Contextual Development Assistant installed successfully!"
    echo ""
    echo "🎯 Features activated:"
    echo "  • Business context detection"
    echo "  • Multi-advisor synthesis"
    echo "  • Conflict resolution"
    echo "  • Continuous learning"
    echo ""
    echo "📋 Usage:"
    echo "  • Hook runs automatically on git commits"
    echo "  • View guidance: cat .claude/hooks/last-guidance.json"
    echo "  • View learning log: cat .claude/hooks/learning-log.txt"
    echo "  • Configuration: .claude/hooks/config.json"
else
    echo "❌ Installation test failed. Please check Node.js and dependencies."
    exit 1
fi