# My AI Landlord Project Plan

**Generated:** 2025-07-25 00:05:44

## Overview

My AI Landlord is a dual-mode property management app designed to serve both traditional long-term landlords and short-term rental hosts (e.g., Airbnb). Users select their mode at onboarding or through a backend flag, and the app tailors the UX/UI and functionality accordingly.

## Primary Tenant/Guest Homepage Features

For both Airbnb and traditional tenants, a shared simplified homepage includes:

- **Welcome Banner:** Property image, greeting, and any host/landlord notes.
- **Maintenance Request Access:** Quick button to report issues (e.g., "Toilet clogged").
- **Communication Hub:** View/send messages, see upcoming visits, reminders.
- **Property Info Library:** Wi-Fi, trash day, appliance manuals, house rules, videos, etc.

## App Modes

### 1. Traditional Landlord Mode
Key screens include:
- Maintenance dashboard
- Lease document management
- Payment tracking
- Property inspection checklists
- Tenant communication center

### 2. Airbnb Host Mode
Key screens include:
- Cleaning & check-in/out schedule
- Automated guest messaging
- House rules & property info
- Maintenance tracking
- Guest arrival/departure timelines

## Notification Types

### Shared Notifications
- Maintenance updates
- Move-in/move-out checklist reminders
- Inspection results
- Scheduled work alerts

### Airbnb-Specific
- Booking confirmations
- Check-in/out reminders
- House rules before arrival
- Cleaning task reminders
- Payment receipt notifications
- Compliance/listing quality alerts

### Landlord-Specific
- Rent due and received notices
- Lease renewal reminders
- Late rent alerts

All notifications are customizable by time/frequency.

## UX Goals

- Minimize typing; maximize buttons, toggles, voice prompts, video
- Clean and intuitive homepage with 3-4 actions max
- Notification fatigue reduction via customizable settings

## Next Step for Claude Code

This `.md` file provides the structured reference needed to conditionally render screens and logic in the front end based on user role (host vs. landlord). Claude Code can use this to begin layout and conditional routing logic.
