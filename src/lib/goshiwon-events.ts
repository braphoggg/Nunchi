/**
 * Goshiwon Events — atmospheric interruptions
 *
 * Random environmental events that appear between chat messages,
 * describing sounds, sights, and happenings in Eden Goshiwon.
 * These are NOT from Moon-jo — they are environmental narration.
 */

export interface GoshiwonEvent {
  korean: string;
  english: string;
}

const EVENTS: GoshiwonEvent[] = [
  { korean: "313호에서 소리가 들립니다...", english: "A sound from Room 313..." },
  { korean: "복도의 불이 깜빡입니다.", english: "The hallway light flickers." },
  { korean: "누군가 문을 두드립니다.", english: "Someone knocks on a door." },
  { korean: "옥상에서 발소리가 들립니다.", english: "Footsteps on the rooftop." },
  { korean: "화장실에서 물이 흐르는 소리...", english: "Running water from the bathroom..." },
  { korean: "얇은 벽 너머로 웃음소리가 들립니다.", english: "Laughter through the thin walls." },
  { korean: "엘리베이터가 멈췄습니다.", english: "The elevator has stopped." },
  { korean: "바퀴벌레 한 마리가 벽을 타고 올라갑니다.", english: "A cockroach climbs the wall." },
  { korean: "어디선가 라면 끓이는 냄새...", english: "The smell of ramyeon from somewhere..." },
  { korean: "형광등이 윙윙거립니다.", english: "The fluorescent light hums." },
  { korean: "누군가 계단을 내려갑니다.", english: "Someone goes down the stairs." },
  { korean: "문 밑으로 그림자가 지나갑니다.", english: "A shadow passes under the door." },
  { korean: "잠깐 정전이 되었습니다.", english: "A brief power outage." },
  { korean: "쌍둥이가 복도에서 속삭이고 있습니다.", english: "The twins are whispering in the hallway." },
  { korean: "밖에서 비가 내리기 시작합니다.", english: "It starts raining outside." },
];

let lastIndex = -1;

/**
 * Pick a random event from the pool, avoiding the immediately previous one.
 */
export function getRandomEvent(): GoshiwonEvent {
  if (EVENTS.length <= 1) return EVENTS[0];

  let idx: number;
  do {
    idx = Math.floor(Math.random() * EVENTS.length);
  } while (idx === lastIndex);

  lastIndex = idx;
  return EVENTS[idx];
}

/**
 * Reset the last-used tracker (useful for testing).
 */
export function resetEventTracker(): void {
  lastIndex = -1;
}
