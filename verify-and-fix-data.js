// Script to verify and fix master-data.csv against Excel data
// Run with: node verify-and-fix-data.js

const fs = require('fs');

// Excel data from the user (source of truth)
const excelData = {
  'FOOTBATH': {
    date: '11/6/2025',
    scenes: [
      { type: '1A', title: 'Slug Assassin', scores: { Cory: 1, Teresa: 1, Jesa: 0, Brendan: 0, Jay: 0.5, Sean: 0, Lisa: 0, Zach: 0.5 }, initiations: 'Cory' },
      { type: '1B', title: 'Toilets First Date', scores: { Cory: 0, Teresa: 0, Jesa: 1, Brendan: 1, Jay: 0.5, Sean: 0, Lisa: 0, Zach: 0 }, initiations: 'Teresa+Jesa' },
      { type: '1C', title: 'Gambling on Nuclear Apocalypse', scores: { Cory: 0, Teresa: 0, Jesa: 0, Brendan: 0, Jay: 1, Sean: 1, Lisa: 0, Zach: 0 }, initiations: 'Lisa+Zach' },
      { type: 'D', title: 'Cartoon Titanic', scores: { Cory: 1, Teresa: 0.3, Jesa: 0.3, Brendan: 0.3, Jay: 0.3, Sean: 0.3, Lisa: 0.3, Zach: 0.3 }, initiations: 'Cory' },
      { type: '2A', title: 'Sloth Assassin', scores: { Cory: 1, Teresa: 1, Jesa: 0, Brendan: 0, Jay: 0.5, Sean: 0, Lisa: 0, Zach: 0.5 }, initiations: 'Cory+Sean' },
      { type: '2B', title: 'Open Office Toilet', scores: { Cory: 0, Teresa: 1, Jesa: 1, Brendan: 1, Jay: 0, Sean: 0, Lisa: 0, Zach: 0.5 }, initiations: 'Jesa+Brendan' },
      { type: '2C', title: 'Chaotic Office', scores: { Cory: 0, Teresa: 0.5, Jesa: 0, Brendan: 0, Jay: 1, Sean: 0, Lisa: 1, Zach: 0.5 }, initiations: 'Lisa' },
      { type: 'E', title: 'Retirement Home Haunted House', scores: { Cory: 0.3, Teresa: 0.3, Jesa: 0.3, Brendan: 0.3, Jay: 0.3, Sean: 1, Lisa: 0.3, Zach: 0.3 }, initiations: 'Sean' },
      { type: '3A', title: 'Titanic Toilets Ad', scores: { Cory: 1, Teresa: 0.5, Jesa: 0, Brendan: 0, Jay: 0, Sean: 0, Lisa: 0, Zach: 1 }, initiations: 'Cory' },
      { type: '3B', title: '', scores: { Cory: 0, Teresa: 0, Jesa: 0, Brendan: 1, Jay: 0, Sean: 0, Lisa: 1, Zach: 0 }, initiations: 'Teresa+Lisa' },
      { type: '4-R', title: '', scores: { Cory: 0.3, Teresa: 0, Jesa: 0, Brendan: 1, Jay: 0, Sean: 1, Lisa: 0.3, Zach: 0.3 }, initiations: '' },
      { type: '3C', title: '', scores: { Cory: 0, Teresa: 0, Jesa: 0, Brendan: 0, Jay: 0, Sean: 0, Lisa: 1, Zach: 1 }, initiations: 'Zach' }
    ]
  },
  'CHEESE CURLS': {
    date: '12/4/2025',
    scenes: [
      { type: '1A', title: 'Britney Spears Breakfast', scores: { Cory: 0, Teresa: 0, Jesa: 0, Brendan: 0, Jay: 0, Sean: 0, Lisa: 1, Zach: 1 }, initiations: 'Lisa' },
      { type: '1B', title: 'Shooting while Skiing', scores: { Cory: 0, Teresa: 0, Jesa: 1, Brendan: 1, Jay: 0, Sean: 0, Lisa: 0, Zach: 0 }, initiations: 'Jesa' },
      { type: '1C', title: 'True Crime Podcast about a Hamster', scores: { Cory: 1, Teresa: 1, Jesa: 0, Brendan: 0, Jay: 0, Sean: 0, Lisa: 0, Zach: 0 }, initiations: 'Cory' },
      { type: 'D', title: 'Sesame Street Olympics', scores: { Cory: 0.3, Teresa: 0.3, Jesa: 1, Brendan: 1, Jay: 0, Sean: 0, Lisa: 0.3, Zach: 0.3 }, initiations: 'Brendan' },
      { type: '2A', title: 'BBQ Babylon Office', scores: { Cory: 0, Teresa: 0, Jesa: 0, Brendan: 0.5, Jay: 0, Sean: 0.5, Lisa: 1, Zach: 1 }, initiations: 'Lisa' },
      { type: '2B', title: 'Slingshot while Hiking', scores: { Cory: 0.5, Teresa: 1, Jesa: 1, Brendan: 0.5, Jay: 0, Sean: 0, Lisa: 0, Zach: 0.5 }, initiations: 'Teresa' },
      { type: '2C', title: 'Blasted/Deadly Plant Mayflean+Blon', scores: { Cory: 0, Teresa: 0.5, Jesa: 0, Brendan: 0, Jay: 0, Sean: 0, Lisa: 1, Zach: 1 }, initiations: 'Lisa' },
      { type: 'E', title: 'Lip Backup Band', scores: { Cory: 0.3, Teresa: 0.3, Jesa: 0.3, Brendan: 1, Jay: 0, Sean: 0, Lisa: 0.3, Zach: 0.3 }, initiations: 'Brendan' }
    ]
  }
  // Add more shows as needed...
};

// Function to generate Players column from scores
function getPlayersFromScores(scores) {
  const players = [];
  const playerMap = { Cory: 'Cory', Teresa: 'Teresa', Jesa: 'Jesa', Brendan: 'Brendan', Jay: 'Jay', Sean: 'Sean', Lisa: 'Lisa', Zach: 'Zach' };
  
  for (const [player, score] of Object.entries(scores)) {
    if (score > 0) {
      players.push(playerMap[player]);
    }
  }
  
  return players.length > 0 ? players.join('+') : '';
}

// Generate CSV lines for a show
function generateShowCSV(showName, showData) {
  const lines = [];
  
  for (const scene of showData.scenes) {
    const players = getPlayersFromScores(scene.scores);
    const line = [
      showData.date,
      showName,
      scene.type,
      scene.title,
      players,
      scene.scores.Cory,
      scene.scores.Teresa,
      scene.scores.Jesa,
      scene.scores.Brendan,
      scene.scores.Jay,
      scene.scores.Sean,
      scene.scores.Lisa,
      scene.scores.Zach,
      scene.initiations
    ].join(',');
    
    lines.push(line);
  }
  
  return lines;
}

// Generate corrected CSV
console.log('ShowDate,ShowTitle,Scene,SceneTitle,Players,Cory,Teresa,Jesa,Brendan,Jay,Sean,Lisa,Zach,Initiations');

for (const [showName, showData] of Object.entries(excelData)) {
  const lines = generateShowCSV(showName, showData);
  lines.forEach(line => console.log(line));
}
