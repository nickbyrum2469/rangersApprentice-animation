// Character designs. Each one is meant to read instantly by silhouette and colour:
//   Will: small, wiry, shaggy brown hair, patched green tunic, freckles, huge curious eyes
//   Horace: broad, tall, blond crew cut, square jaw, red tunic
//   Alyss: tallest of the wards, long pale-blonde hair, sky-blue dress, calm
//   Jenny: round, rosy cheeks, auburn curls in a bun, yellow dress + apron
//   George: thin and gangly, neat dark hair, ink-grey tunic, big nervous eyes
//   Halt: short (shorter than Horace!), grizzled grey beard, mottled Ranger cloak, longbow
//   Baron Arald: huge, enormous brown beard, deep red robes with gold trim
//   Sir Rodney: chainmail, short dark beard, scar, square jaw
//   Lady Pauline: silver hair in an updo, silver-grey gown, poised
//   Master Chubb: short, round, red-faced, chef's hat, apron, ladle
//   Master Nigel: tall, thin, balding, spectacles, long black scribe's robe
//   Morgarath: very tall, deathly pale, long white-blond hair, black robes
import { Character } from './character.js';
import { tex } from './toon.js';

export const DESIGNS = {
  will: {
    face: { eyeW: 98, eyeH: 112 }, name: 'Will', kid: true, height: 1.42, shoulders: 0.92, hips: 0.95, headScale: 1.06, skin: '#f0c9a0', eyes: '#5b7a3a', hair: { style: 'messy', color: '#6b4426' }, freckles: true,
    tunic: '#5f8a4a', sleeve: '#4f7a3e', pants: '#6a5640', boots: '#4a3322', belt: '#5a3a22', tunicLen: 0.32, cuffs: '#4a6a36',
  },
  horace: {
    face: { eyeW: 86, eyeH: 92, browT: 12, narrow: 0.1 }, name: 'Horace', kid: true, height: 1.68, shoulders: 1.3, hips: 1.15, arms: 1.3, legs: 1.25, hands: 1.15, headScale: 0.98, jaw: true,
    skin: '#f2c49a', eyes: '#3a5a8a', hair: { style: 'crew', color: '#e0b860' }, tunic: '#a8382e', sleeve: '#8a2e26', pants: '#4a4038', boots: '#3a2a1e', belt: '#3a2a1e', tunicLen: 0.32,
  },
  alyss: {
    face: { eyeW: 92, eyeH: 104, lash: 1.3, mouthW: 28 }, name: 'Alyss', kid: true, height: 1.62, shoulders: 0.88, hips: 0.95, headScale: 0.96, skin: '#f6d8bc', eyes: '#4a7aa8', hair: { style: 'long', color: '#f0deaa' }, browColor: '#c8a870',
    tunic: '#6f9fd0', sleeve: '#5f8fc0', pants: '#5f8fc0', boots: '#4a3a5a', robe: true, robeColor: '#6f9fd0', skirtFlare: 0.9, belt: '#e8e0c8', },
  jenny: {
    face: { eyeW: 96, eyeH: 106, lash: 1.2 }, name: 'Jenny', kid: true, height: 1.45, shoulders: 1.0, hips: 1.2, belly: 0.4, headScale: 1.05, skin: '#f6cfa8', eyes: '#6a4a2a', hair: { style: 'curly_bun', color: '#b0552e' }, blush: '#ff7a6a',
    tunic: '#e8b84a', sleeve: '#e8b84a', pants: '#8a6a3a', boots: '#5a3a22', robe: true, robeColor: '#d9a33a', apron: '#f6efe0', shortSleeves: true,
  },
  george: {
    face: { eyeW: 92, eyeH: 100, browY: 140 }, name: 'George', kid: true, height: 1.6, shoulders: 0.8, hips: 0.85, arms: 0.85, legs: 0.85, headScale: 0.95, skin: '#e8c4a0', eyes: '#4a3a2a', hair: { style: 'neat', color: '#2e2620' }, nose: 'long',
    tunic: '#6a6e78', sleeve: '#5a5e68', pants: '#3a3a40', boots: '#2a2420', tunicLen: 0.45, belt: '#2a2420', gloves: null,
  },
  halt: {
    face: { eyeW: 84, eyeH: 74, narrow: 0.15, tired: 0.18, browT: 13, browY: 168 }, name: 'Halt', height: 1.6, shoulders: 1.05, hips: 1.0, headScale: 1.0, skin: '#d9a982', eyes: '#3a3020', hair: { style: 'shaggy', color: '#8a8478' }, beard: { style: 'grizzled', color: '#7d776c' }, nose: 'pointed', tunic: '#5a5a42', sleeve: '#4a4a36', pants: '#4a4232', boots: '#3a2a1e', tallBoots: true, belt: '#4a3020', tunicLen: 0.4,
    cloak: { map: null }, quiver: true,
  },
  baron: {
    face: { eyeW: 78, eyeH: 74, browT: 14, browY: 162 }, name: 'Baron Arald', height: 1.92, shoulders: 1.35, hips: 1.3, belly: 1.0, arms: 1.25, legs: 1.3, headScale: 1.05,
    skin: '#eab48e', eyes: '#3a2a1a', hair: { style: 'short_dark', color: '#5a3a24' }, beard: { style: 'big', color: '#5a3a24' }, nose: 'big', blush: '#e06a50',
    tunic: '#8a1e22', robe: true, robeColor: '#7a1a1e', pants: '#3a2020', boots: '#2a1a14', belt: '#d8b048', collar: '#d8b048', cuffs: '#d8b048',
  },
  rodney: {
    face: { eyeW: 80, eyeH: 70, narrow: 0.2, browT: 14, browY: 168 }, name: 'Sir Rodney', height: 1.84, shoulders: 1.3, hips: 1.1, arms: 1.25, legs: 1.2, scar: true,
    skin: '#d8a47c', eyes: '#2a2a2a', hair: { style: 'short_dark', color: '#2a221c' }, beard: { style: 'short', color: '#2a221c' }, tunic: '#3a4a6a', sleeve: '#8a9099', pants: '#3a3a3a', boots: '#2a2018', tallBoots: true, belt: '#2a2018', tunicLen: 0.38, mail: true,
  },
  pauline: {
    face: { eyeW: 86, eyeH: 86, lash: 1.4, narrow: 0.1 }, name: 'Lady Pauline', height: 1.72, shoulders: 0.85, hips: 0.95, skin: '#f2dcc8', eyes: '#5a6a7a', hair: { style: 'updo', color: '#a9aec2' },
    tunic: '#9aa0aa', sleeve: '#8a909a', robe: true, robeColor: '#8f96a3', pants: '#8a909a', boots: '#4a4a52', collar: '#e8e8ee', },
  chubb: {
    face: { eyeW: 74, eyeH: 70, browT: 14, browY: 166 }, name: 'Master Chubb', height: 1.5, shoulders: 1.15, hips: 1.35, belly: 1.2, headScale: 1.08, nose: 'big', blush: '#ff5a4a',
    skin: '#f0b892', eyes: '#3a2a1a', hair: { style: 'chef', color: '#4a3a2a' }, tunic: '#f4efe4', sleeve: '#f4efe4', pants: '#6a5a4a', boots: '#3a2a1e', apron: '#ffffff', tunicLen: 0.3, shortSleeves: true,
  },
  nigel: {
    face: { eyeW: 76, eyeH: 72, narrow: 0.15 }, name: 'Master Nigel', height: 1.85, shoulders: 0.82, hips: 0.85, arms: 0.85, glasses: true, nose: 'long',
    skin: '#ead0b4', eyes: '#3a3a3a', hair: { style: 'balding', color: '#9a9088' },
    tunic: '#262430', robe: true, robeColor: '#22202a', pants: '#222', boots: '#1a1a1a', collar: '#e0dccc', cuffs: '#6a4a8a',
  },
  morgarath: {
    face: { eyeW: 86, eyeH: 64, narrow: 0.3, lash: 1.3, browY: 175 }, name: 'Morgarath', height: 2.05, shoulders: 1.1, hips: 0.9, eyes: '#9ab8d8',
    skin: '#e6e2dc', hair: { style: 'long_pale', color: '#f0eee6' }, nose: 'pointed', browColor: '#c8c4bc',
    tunic: '#141218', robe: true, robeColor: '#0e0c12', pants: '#111', boots: '#111', collar: '#3a2a4a',
  },
  clerk: {
    name: 'Clerk', height: 1.7, shoulders: 0.9, skin: '#e6c0a0', eyes: '#3a2a1a', hair: { style: 'neat', color: '#6a5a4a' },
    tunic: '#5a4a7a', pants: '#3a3a3a', boots: '#2a2a2a', tunicLen: 0.5, belt: '#2a2a2a',
  },
  farmer1: {
    name: 'Farmer', height: 1.76, shoulders: 1.1, belly: 0.5, skin: '#d8a07a', eyes: '#3a2a1a', hair: { style: 'cap', color: '#5a4a3a', capColor: '#7a6a4a' },
    beard: { style: 'short', color: '#6a5040' }, tunic: '#8a7a5a', pants: '#5a4a3a', boots: '#3a2a1e', tunicLen: 0.4, belt: '#3a2a1e',
  },
  farmer2: {
    name: 'Farmer', height: 1.66, shoulders: 0.95, skin: '#e8b890', eyes: '#3a2a1a', hair: { style: 'cap', color: '#3a2a1a', capColor: '#4a5a3a' }, nose: 'big',
    tunic: '#6a7a5a', pants: '#4a3a2a', boots: '#3a2a1e', tunicLen: 0.4, belt: '#3a2a1e',
  },
};

// background cooks for the kitchens
DESIGNS.cook1 = { name: 'Cook', height: 1.7, shoulders: 1.05, belly: 0.4, skin: '#e8b890', eyes: '#3a2a1a', hair: { style: 'short_dark', color: '#5a3a2a' },
  tunic: '#e8e2d4', sleeve: '#e8e2d4', pants: '#5a4a3a', boots: '#3a2a1e', apron: '#ffffff', tunicLen: 0.4, shortSleeves: true, face: { eyeW: 80, eyeH: 78 } };
DESIGNS.cook2 = { name: 'Cook', height: 1.58, shoulders: 0.95, skin: '#f0c8a0', eyes: '#4a3a2a', hair: { style: 'updo', color: '#7a4a2a' },
  tunic: '#c8b090', robe: true, robeColor: '#a89070', pants: '#5a4a3a', boots: '#3a2a1e', apron: '#ffffff', shortSleeves: true, face: { eyeW: 86, eyeH: 88 } };

// Battleschool cadets in leather jerkins
const cadet = (hair, color, skin, extra = {}) => ({ name: 'Cadet', kid: true, height: 1.68, shoulders: 1.15, hips: 1.05, skin, eyes: '#3a3a3a',
  hair: { style: 'short_dark', color }, tunic: '#7a5a3a', sleeve: '#d8ccb4', pants: '#4a4038', boots: '#3a2a1e', belt: '#3a2a1e', tunicLen: 0.35,
  face: { eyeW: 84, eyeH: 86, narrow: 0.1 }, ...extra });
DESIGNS.cadet1 = cadet('#2a1e16', '#7a5a3a', '#e8b890');
DESIGNS.cadet2 = cadet('#c89a50', '#6a4a30', '#f0c8a0', { height: 1.74 });
DESIGNS.cadet3 = cadet('#5a2a1a', '#7a5a3a', '#d8a07a', { height: 1.64 });
DESIGNS.cadet4 = cadet('#1a1a1a', '#6a4a30', '#c88a64', { height: 1.72 });

// villagers for the market
DESIGNS.mother = { name: 'Mother', height: 1.62, shoulders: 0.9, skin: '#eec3a0', eyes: '#4a3a2a', hair: { style: 'updo', color: '#5a3a24' },
  tunic: '#7a8a5a', robe: true, robeColor: '#6a7a4a', pants: '#5a4a3a', boots: '#3a2a1e', apron: '#e8dcc0', face: { eyeW: 86, eyeH: 88 } };
DESIGNS.child = { name: 'Child', kid: true, height: 1.0, headScale: 1.25, shoulders: 0.9, skin: '#f6d0ac', eyes: '#3a5a8a', hair: { style: 'messy', color: '#c89a50' },
  tunic: '#8a5a8a', pants: '#5a4a3a', boots: '#3a2a1e', belt: '#3a2a1e', tunicLen: 0.4, face: { eyeW: 104, eyeH: 116 } };

export function makeCharacter(id) {
  const spec = structuredClone(DESIGNS[id]);
  if (spec.cloak) spec.cloak.map = tex.mottled();
  const c = new Character(spec);
  c.id = id;
  return c;
}
