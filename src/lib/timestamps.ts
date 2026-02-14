/**
 * Atmospheric timestamp generator.
 * Produces fake late-night timestamps (1:00 AM - 3:59 AM) to match
 * the unsettling atmosphere of Eden Goshiwon.
 */

let minuteCounter = 0;
let baseHour = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3

export function getAtmosphericTimestamp(): string {
  const minute = minuteCounter % 60;
  const hourOffset = Math.floor(minuteCounter / 60);
  const hour = ((baseHour - 1 + hourOffset) % 3) + 1; // cycle through 1-3

  minuteCounter += 1 + Math.floor(Math.random() * 4); // 1-4 min increments

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${hour}:${pad(minute)} AM`;
}

export function resetTimestampCounter(): void {
  minuteCounter = 0;
  baseHour = 1 + Math.floor(Math.random() * 3);
}
