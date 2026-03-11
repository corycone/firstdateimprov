# First Date! Improv Team App

A React web application for tracking and visualizing performance data for the First Date! Harold team at Baltimore Improv Group.

## Features

- **Show Timeline**: Browse all shows in a grid layout with show names, dates, and cast members
- **Show Details**: Click any show to see detailed scene breakdowns with player assignments
- **Interactive Scenes**: View which players were in each scene (1A, 1B, 1C, D, 2A, 2B, 2C, E, 3A, 3B, 3C, 3D)
- **Player Highlighting**: Hover over player names to see which scenes they appeared in
- **Statistics Dashboard**: View comprehensive stats including:
  - Player performance over time (line chart)
  - Player pairing heatmap (click cells to see all shows for a pairing)
  - Walk-on rate analysis
  - Scene participation metrics
- **Theater-Themed Design**: Warm, theatrical aesthetic with the team photo in the header

## Tech Stack

- React 19
- Vite
- CSS3 with custom theater theme
- XLSX for data parsing

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This app is deployed to GitHub Pages at: https://corysone.github.io/firstdateimprov/

To deploy manually:
```bash
npm run deploy
```

Automatic deployment happens via GitHub Actions when pushing to the main branch.

## Data Structure

The app reads show data from `src/assets/master-data.csv` which includes:
- Show names and dates
- Player names
- Scene types and assignments
- Scene titles and scores

## Team Members

- Sean
- Lisa
- Jesa
- Teresa
- Zach
- Cory
- Brendan

