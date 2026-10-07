// Pure game constants/definitions; reusable by a future authoritative server.
export const GRID = 21, CELL = 2.4, HALF = (GRID - 1) / 2;
export const PLANE_R = (GRID / 2) * CELL * 1.13;
export const DEF_TYPES = ['turret','pulse','missile','cannon','tesla','sniper','shield'];
export const BUILDINGS = {
  // resources
  extractor:{name:'Crystal Extractor',em:'⛏️',cat:'resource',cost:{energy:100,crystal:50},hp:260,out:'Crystal'},
  reactor:  {name:'Fusion Reactor',  em:'⚡',cat:'resource',cost:{energy:150,crystal:80}, hp:320,out:'Energy'},
  solar:    {name:'Solar Array',     em:'☀️',cat:'resource',cost:{energy:120,crystal:40}, hp:240,out:'Energy'},
  drill:    {name:'Deep Drill',      em:'🛠️',cat:'resource',cost:{energy:130,crystal:70}, hp:260,out:'Crystal'},
  storage:  {name:'Storage Vault',   em:'📦',cat:'resource',cost:{energy:120,crystal:120},hp:420,out:'+Capacity'},
  // defense
  wall:     {name:'Defense Wall',    em:'🧱',cat:'defense', cost:{energy:40, crystal:20}, hp:700,out:'Bulkhead'},
  turret:   {name:'Laser Turret',    em:'🔫',cat:'defense', cost:{energy:120,crystal:60}, hp:220,out:'Defense'},
  pulse:    {name:'Pulse Tower',     em:'📡',cat:'defense', cost:{energy:160,crystal:90}, hp:240,out:'Rapid'},
  missile:  {name:'Missile Battery', em:'🚀',cat:'defense', cost:{energy:220,crystal:140},hp:260,out:'Heavy'},
  cannon:   {name:'Plasma Cannon',   em:'💥',cat:'defense', cost:{energy:260,crystal:160},hp:300,out:'Heavy'},
  tesla:    {name:'Tesla Coil',      em:'⚡',cat:'defense', cost:{energy:200,crystal:120},hp:240,out:'Chain'},
  sniper:   {name:'Railgun',         em:'🎯',cat:'defense', cost:{energy:300,crystal:200},hp:260,out:'Long'},
  shield:   {name:'Shield Projector', em:'🛡️',cat:'defense', cost:{energy:200,crystal:120},hp:280,out:'Aegis'},
  // army
  barracks: {name:'Barracks',  em:'🪖',cat:'army',cost:{energy:200,crystal:150},hp:320,out:'Train',trains:true},
  starport: {name:'Starport',  em:'🛰️',cat:'army',cost:{energy:350,crystal:260},hp:360,out:'Fleet',trains:true},
  camp: {name:'Fleet Camp',cat:'army',cost:{energy:180,crystal:120},hp:380,out:'Capacity'},
  builder: {name:'Builder Workshop',cat:'army',cost:{energy:160,crystal:90},hp:320,out:'Builders'},
  habitat:  {name:'Crew Habitat',em:'🏠',cat:'army',cost:{energy:80, crystal:40}, hp:200,out:'Crew'},
};
export const COMMAND_DEF = { name:'Command Center', hp:2400, out:'HQ', cost:{energy:300,crystal:180} };
export const CATS = [['all','All'],['resource','Resources'],['defense','Defense'],['army','Army']];


export const inBuildBounds=(i,j)=>Number.isInteger(i)&&Number.isInteger(j)&&i>=0&&j>=0&&i<GRID&&j<GRID&&Math.hypot((i-HALF)*CELL,(j-HALF)*CELL)<=PLANE_R-2.2;
