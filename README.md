# everloved

A companion application for Alzheimer's care, designed with clinical UX principles.

## Structure

- `/` - Patient Comfort page (breathing puppy companion)
- `/caregiver` - Avatar Configuration wizard
- `/caregiver/monitoring` - Real-time monitoring dashboard
- `/caregiver/analytics` - Cognitive analytics
- `/science` - The Science of Care resource hub

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Deploy to Vercel

1. Push this code to a GitHub repository
2. Go to vercel.com and import the repository
3. Click Deploy

No environment variables needed for the UI-only version.

## Design Principles

This app follows clinical UX guidelines for dementia care:

- **Circadian-aware theming** - Colors shift based on time of day
- **Low cognitive load** - No complex navigation for patients
- **Warm, organic aesthetics** - Soft colors, gentle animations
- **Stylized companions** - Avoids photorealistic avatars per clinical guidance

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- No external UI libraries (pure CSS-in-JS)
