// Episode 1 "The Choosing": scene number → scene definition.
import s01 from './s01_dawn.js';
import s02 from './s02_kitchen.js';
import s03 from './s03_yard.js';
import s04 from './s04_training.js';
import s05 from './s05_library.js';
import s06 from './s06_gate.js';
import s07 from './s07_dorm.js';
import s08 from './s08_corridor.js';
import s09 from './s09_hall.js';
import s10 from './s10_walls.js';
import s11 from './s11_climb.js';
import s12 from './s12_office.js';
import { morgarath as s13, nextTime } from './s13_morgarath.js';
export const AUDIO = '/out/ep01/episode_audio.mp3';
export const TIMELINE = '/out/ep01/timeline.json';
export const SCENES = { 1: s01, 2: s02, 3: s03, 4: s04, 5: s05, 6: s06, 7: s07, 8: s08, 9: s09, 10: s10, 11: s11, 12: s12, 13: s13, 99: nextTime };
