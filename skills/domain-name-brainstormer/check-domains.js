#!/usr/bin/env node

/**
 * Domain Availability Checker
 * Checks if domains are available using DNS resolution
 *
 * Usage:
 *   node check-domains.js example.com
 *   node check-domains.js example.com example.io example.dev
 *   cat domains.txt | node check-domains.js
 */

const dns = require('dns').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function checkDNS(domain) {
  try {
    await dns.resolve4(domain);
    return { method: 'DNS', status: 'taken', hasRecords: true };
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return { method: 'DNS', status: 'available', hasRecords: false };
    }
    return { method: 'DNS', status: 'unknown', error: error.code };
  }
}

async function checkWhois(domain) {
  try {
    const { stdout } = await execPromise(`whois ${domain}`, { timeout: 10000 });

    // Check for common "not found" patterns
    const notFoundPatterns = [
      /No match for/i,
      /NOT FOUND/i,
      /No Data Found/i,
      /Status: free/i,
      /No entries found/i,
      /Domain not found/i
    ];

    const isAvailable = notFoundPatterns.some(pattern => pattern.test(stdout));

    if (isAvailable) {
      return { method: 'WHOIS', status: 'available', raw: stdout.substring(0, 200) };
    }

    // Extract registrar if available
    const registrarMatch = stdout.match(/Registrar:\s*(.+)/i);
    const registrar = registrarMatch ? registrarMatch[1].trim() : null;

    return {
      method: 'WHOIS',
      status: 'taken',
      registrar,
      raw: stdout.substring(0, 200)
    };
  } catch (error) {
    return { method: 'WHOIS', status: 'error', error: error.message };
  }
}

async function checkDomain(domain) {
  const cleanDomain = domain.trim().toLowerCase();

  // Validate domain format
  if (!/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/i.test(cleanDomain)) {
    return {
      domain: cleanDomain,
      status: 'invalid',
      message: 'Invalid domain format'
    };
  }

  // Check DNS first (faster)
  const dnsResult = await checkDNS(cleanDomain);

  // If DNS says available, double-check with WHOIS for accuracy
  if (dnsResult.status === 'available') {
    const whoisResult = await checkWhois(cleanDomain);
    return {
      domain: cleanDomain,
      status: whoisResult.status === 'available' ? 'available' : 'taken',
      dnsCheck: dnsResult,
      whoisCheck: whoisResult,
      registrar: whoisResult.registrar
    };
  }

  // If DNS says taken, trust it (skip WHOIS to save time)
  return {
    domain: cleanDomain,
    status: 'taken',
    dnsCheck: dnsResult
  };
}

function formatResult(result) {
  const { domain, status } = result;

  if (status === 'available') {
    return `${colors.green}✓ ${domain}${colors.reset} - ${colors.bold}${colors.green}AVAILABLE${colors.reset}`;
  } else if (status === 'taken') {
    const registrar = result.registrar ? ` (${result.registrar})` : '';
    return `${colors.red}✗ ${domain}${colors.reset} - ${colors.red}TAKEN${colors.reset}${registrar}`;
  } else if (status === 'invalid') {
    return `${colors.yellow}⚠ ${domain}${colors.reset} - ${colors.yellow}INVALID${colors.reset}`;
  } else {
    return `${colors.yellow}? ${domain}${colors.reset} - ${colors.yellow}UNKNOWN${colors.reset}`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  let domains = [];

  // If no arguments, try to read from stdin
  if (args.length === 0) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    for await (const line of rl) {
      if (line.trim()) {
        domains.push(line.trim());
      }
    }
  } else {
    domains = args;
  }

  if (domains.length === 0) {
    console.error('Usage: node check-domains.js example.com [example.io ...]');
    console.error('   or: cat domains.txt | node check-domains.js');
    process.exit(1);
  }

  console.log(`${colors.blue}${colors.bold}Checking ${domains.length} domain(s)...${colors.reset}\n`);

  const results = [];

  for (const domain of domains) {
    const result = await checkDomain(domain);
    results.push(result);
    console.log(formatResult(result));

    // Add small delay to avoid rate limiting
    if (domains.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  const available = results.filter(r => r.status === 'available');
  const taken = results.filter(r => r.status === 'taken');

  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`${colors.green}Available: ${available.length}${colors.reset}`);
  console.log(`${colors.red}Taken: ${taken.length}${colors.reset}`);

  if (available.length > 0) {
    console.log(`\n${colors.bold}${colors.green}Available domains:${colors.reset}`);
    available.forEach(r => console.log(`  - ${r.domain}`));
  }

  // Output JSON for programmatic use
  if (process.env.JSON_OUTPUT === '1') {
    console.log('\n' + JSON.stringify(results, null, 2));
  }
}

main().catch(console.error);
