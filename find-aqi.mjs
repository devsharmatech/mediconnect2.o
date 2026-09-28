import fs from 'fs';

const content = fs.readFileSync('src/app/(website)/(main)/cardio-connect/page.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('telemetry') || line.toLowerCase().includes('air quality') || line.toLowerCase().includes('aqi') || line.toLowerCase().includes('open-meteo')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
