#!/usr/bin/env node
const fs = require('fs');

function generateDashboard() {
    console.log('📊 Development Hook System Dashboard\n');
    
    // Hook status
    const hooks = ['pre-commit', 'pre-push', 'post-commit', 'post-merge'];
    console.log('🔗 Git Hooks Status:');
    hooks.forEach(hook => {
        const exists = fs.existsSync(`.git/hooks/${hook}`);
        console.log(`  ${exists ? '✅' : '❌'} ${hook}`);
    });
    
    // Recent activity
    if (fs.existsSync('.claude/hooks/learning-log.txt')) {
        const log = fs.readFileSync('.claude/hooks/learning-log.txt', 'utf8');
        const lines = log.split('\n').filter(l => l.trim()).slice(-5);
        console.log('\n📚 Recent Activity:');
        lines.forEach(line => console.log(`  ${line}`));
    }
    
    // Latest results
    const resultFiles = [
        'last-guidance.json',
        'last-quality-check.json', 
        'last-security-audit.json',
        'last-secret-scan.json'
    ];
    
    console.log('\n🎯 Latest Results:');
    resultFiles.forEach(file => {
        if (fs.existsSync(`.claude/hooks/${file}`)) {
            try {
                const data = JSON.parse(fs.readFileSync(`.claude/hooks/${file}`, 'utf8'));
                const status = data.passed !== false ? '✅' : '❌';
                console.log(`  ${status} ${file.replace('last-', '').replace('.json', '')}`);
            } catch {
                console.log(`  ⚠️  ${file} (parse error)`);
            }
        } else {
            console.log(`  ⚪ ${file.replace('last-', '').replace('.json', '')} (not run)`);
        }
    });
}

generateDashboard();
