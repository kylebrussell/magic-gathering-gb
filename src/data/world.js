// The island of Dominaria: locations on the world map, room layouts, and the
// duelists who live in them.

export const MEDALS = [
  { id: 'G', name: 'FOREST MEDAL', color: '#18a018' },
  { id: 'R', name: 'MOUNTAIN MEDAL', color: '#f03010' },
  { id: 'U', name: 'ISLAND MEDAL', color: '#20a0f0' },
  { id: 'W', name: 'PLAINS MEDAL', color: '#e8d080' },
  { id: 'B', name: 'SWAMP MEDAL', color: '#584868' },
  { id: 'A', name: 'ARTIFACT MEDAL', color: '#a09880' },
];

// Character sprite palettes: h = hair/hood, s = skin, c = clothes, d = legs.
const SPR = {
  player: { h: '#e01808', s: '#301010', c: '#d01008', d: '#601008', eyes: '#301010' },
  barrin: { h: '#e8e8f0', s: '#f8d0a8', c: '#2050c0', d: '#183070' },
  rival: { h: '#7030a0', s: '#f8d0a8', c: '#303040', d: '#202028' },
  jhoira: { h: '#a05020', s: '#f0c098', c: '#e08020', d: '#704010' },
  nissa: { h: '#d8e8a0', s: '#e8e8c0', c: '#207020', d: '#104010' },
  chandra: { h: '#f8a020', s: '#f8d0a8', c: '#c01818', d: '#601010' },
  jace: { h: '#1848a0', s: '#101830', c: '#2060c0', d: '#183060' },
  gideon: { h: '#604020', s: '#f0c098', c: '#e8c850', d: '#806020' },
  liliana: { h: '#201020', s: '#f8e0e8', c: '#402050', d: '#201028' },
  karn: { h: '#b0b0a8', s: '#c0c0b8', c: '#686860', d: '#404040' },
  urza: { h: '#f0f0f0', s: '#f8d0a8', c: '#e8e8f0', d: '#4060a0' },
  mishra: { h: '#f0f0e0', s: '#d8a070', c: '#c06010', d: '#603010' },
  bolas: { h: '#503060', s: '#806080', c: '#c0a020', d: '#402050' },
  green: { h: '#305010', s: '#f8d0a8', c: '#58a830', d: '#305018' },
  red: { h: '#601008', s: '#f8d0a8', c: '#f05020', d: '#602010' },
  blue: { h: '#202020', s: '#f8d0a8', c: '#2898e8', d: '#f0f0f0' },
  white: { h: '#c09040', s: '#f8d0a8', c: '#f0f0e0', d: '#a09060' },
  black: { h: '#181818', s: '#e8d8e0', c: '#382848', d: '#181020' },
  grey: { h: '#404040', s: '#f0c098', c: '#888070', d: '#404038' },
  shop: { h: '#f0f0f0', s: '#f8d0a8', c: '#806040', d: '#403020' },
};

export const CLUB_COLORS = {
  academy: { floor: '#d8d0b0', floor2: '#c8c0a0', wall: '#8080a8', trim: '#4848a0', banner: '#3858c0' },
  forest: { floor: '#c8d8a0', floor2: '#b0c888', wall: '#507838', trim: '#304818', banner: '#18a018' },
  mountain: { floor: '#e0c8a8', floor2: '#d0b090', wall: '#985838', trim: '#602818', banner: '#e02010' },
  island: { floor: '#b8d8e8', floor2: '#a0c8e0', wall: '#4878a8', trim: '#204870', banner: '#1890f0' },
  plains: { floor: '#f0e8c8', floor2: '#e0d8b0', wall: '#c0a868', trim: '#806830', banner: '#f0e0a0' },
  swamp: { floor: '#a898a8', floor2: '#988898', wall: '#483850', trim: '#281830', banner: '#402060' },
  artifact: { floor: '#c8c4b8', floor2: '#b8b4a8', wall: '#787068', trim: '#383430', banner: '#a09880' },
  summit: { floor: '#d8c8e8', floor2: '#c8b8d8', wall: '#605080', trim: '#302048', banner: '#c0a020' },
  shop: { floor: '#e0d0b0', floor2: '#d0c0a0', wall: '#a07850', trim: '#604028', banner: '#e08020' },
};

// Room tiles: # wall, w window, b banner, s shelf, . floor, r rug, T table,
// p plant, x pillar, c counter, D exit, m carpet, k pc/terminal
// Members stand at (1,5) and (8,5); the master at (4,2).
const ROOMS = {
  forest: ['b#w#mm#w#b', '##########', 'pp..mm..pp', 'p...mm...p', '.TT.mm.TT.', '....mm....', '.TT....TT.', 'pp......pp', '....DD....'],
  mountain: ['b#b#mm#b#b', '##########', '....mm....', 'x...mm...x', '.TT.mm.TT.', '....mm....', '.TT....TT.', 'x........x', '....DD....'],
  island: ['w#w#mm#w#w', '##########', '....mm....', 'p.rrmmrr.p', '.TTrmmrTT.', '...rmmr...', '.TT....TT.', 'p........p', '....DD....'],
  plains: ['b#w#mm#w#b', '##########', 'x...mm...x', '....mm....', '.TT.mm.TT.', 'x...mm...x', '.TT....TT.', '..........', '....DD....'],
  swamp: ['s#b#mm#b#s', '##########', 'x...mm...x', '....mm....', '.TT.mm.TT.', '....mm....', '.TT....TT.', 'x..p..p..x', '....DD....'],
  artifact: ['s#w#mm#w#s', '##########', '....mm....', 'k...mm...k', '.TT.mm....', '....mm....', '.TT....xx.', '..........', '....DD....'],
};

export const LOCATIONS = {
  academy: {
    name: 'TOLARIAN ACADEMY',
    map: [80, 64],
    music: 'club',
    room: [
      's#w#ss#w#s',
      '##########',
      '..........',
      'p.rrrrrr.p',
      '..rrrrrr..',
      '..rrrrrr..',
      '.TT....k..',
      'p........p',
      '....DD....',
    ],
    entry: [4, 7],
    npcs: ['barrin', 'jhoira', 'rival1', 'rival2'],
    packSet: 'POR',
  },
  forest: { room: ROOMS.forest, name: 'FOREST CLUB', map: [26, 64], entry: [4, 7], npcs: ['elm', 'bo', 'nissa'], packSet: 'LEA', medal: 'G' },
  mountain: { room: ROOMS.mountain, name: 'MOUNTAIN CLUB', map: [128, 24], entry: [4, 7], npcs: ['rocco', 'pete', 'chandra'], packSet: 'DRK', medal: 'R' },
  island: { room: ROOMS.island, name: 'ISLAND CLUB', map: [30, 104], entry: [4, 7], npcs: ['finn', 'lin', 'jace'], packSet: 'LEG', medal: 'U' },
  plains: { room: ROOMS.plains, name: 'PLAINS CLUB', map: [34, 24], entry: [4, 7], npcs: ['ada', 'bertram', 'gideon'], packSet: 'ARN', medal: 'W' },
  swamp: { room: ROOMS.swamp, name: 'SWAMP CLUB', map: [134, 66], entry: [4, 7], npcs: ['mort', 'nyx', 'liliana'], packSet: 'DRK', medal: 'B' },
  artifact: { room: ROOMS.artifact, name: 'ARTIFACT CLUB', map: [126, 102], entry: [4, 7], npcs: ['tess', 'karn'], packSet: 'ATQ', medal: 'A' },
  shop: {
    name: 'CARD SHOP',
    map: [80, 100],
    music: 'club',
    room: [
      's#s#ss#s#s',
      '##########',
      '..........',
      'cccccccc..',
      '..........',
      'p........p',
      '..rrrrrr..',
      'p.rrrrrr.p',
      '....DD....',
    ],
    entry: [4, 7],
    npcs: ['shopkeeper', 'trader'],
  },
  summit: {
    name: 'PLANESWALKER SUMMIT',
    map: [80, 18],
    music: 'boss',
    room: [
      'x#b#mm#b#x',
      '##########',
      'x...mm...x',
      '....mm....',
      'x...mm...x',
      '....mm....',
      'x...mm...x',
      '....mm....',
      '....DD....',
    ],
    entry: [4, 7],
    npcs: ['gatekeeper', 'urza', 'mishra', 'bolas', 'rival3'],
    packSet: 'LEA',
  },
};

export const PATHS = [
  ['academy', 'forest'],
  ['academy', 'swamp'],
  ['academy', 'shop'],
  ['academy', 'summit'],
  ['forest', 'plains'],
  ['forest', 'island'],
  ['plains', 'summit'],
  ['summit', 'mountain'],
  ['mountain', 'swamp'],
  ['island', 'shop'],
  ['shop', 'artifact'],
  ['artifact', 'swamp'],
];

const has = (save, flag) => !!save.flags[flag];
const beat = (save, id) => (save.beaten[id] || 0) > 0;
const medals = (save) => save.medals.length;

// Duelists and other characters.
export const NPCS = {
  // ------------------------------------------------------------ Academy
  barrin: {
    name: 'BARRIN', portrait: 'barrin', sprite: SPR.barrin, pos: [4, 3], face: 'down',
    talk: (save) => {
      if (!has(save, 'starter')) return { script: 'chooseStarter' };
      if (medals(save) >= 6) return { lines: ['YOU HAVE ALL SIX MEDALS!', 'THE PLANESWALKER SUMMIT TO THE NORTH AWAITS YOU. GO, AND MAKE TOLARIA PROUD.'] };
      return {
        lines: [
          `YOU HAVE ${medals(save)} OF 6 MEDALS.`,
          'EACH CLUB MASTER GUARDS A MEDAL. DEFEAT THEIR MEMBERS FIRST, AND THE MASTER WILL ACCEPT YOUR CHALLENGE.',
          'WIN DUELS TO EARN BOOSTER PACKS, THEN PRESS START TO BUILD A STRONGER DECK.',
        ],
      };
    },
  },
  jhoira: {
    name: 'JHOIRA', portrait: 'girl_pony', sprite: SPR.jhoira, pos: [1, 5], face: 'right',
    deck: 'practice', deckName: 'PRACTICE DECK', skill: 0.25, music: 'duel',
    prize: { packs: ['POR'], gold: 40 }, rematch: { packs: ['POR'], gold: 20 },
    intro: ["I'M JHOIRA, BARRIN'S APPRENTICE. WANT A PRACTICE DUEL? I'LL GO EASY ON YOU!"],
    win: ['NICE! YOU LEARN FAST. HERE, TAKE THIS PACK.'],
    lose: ["DON'T WORRY. EVERYONE LOSES THEIR FIRST FEW DUELS!"],
    requires: (save) => (has(save, 'starter') ? null : 'TALK TO BARRIN FIRST. HE HAS SOMETHING FOR YOU!'),
  },
  rival1: {
    name: 'RHYS', portrait: 'rival', sprite: SPR.rival, pos: [7, 4], face: 'left',
    present: (save) => medals(save) >= 1 && !beat(save, 'rival1'),
    deck: 'rival_1', deckName: 'RIVAL DECK', skill: 0.6, music: 'duel',
    prize: { packs: ['LEA', 'LEA'], gold: 80 },
    intro: ['HEY! I HEARD YOU WON A MEDAL. LUCKY BREAK.', "I'M RHYS. I'LL BE THE ONE WHO REACHES THE SUMMIT. LET'S DUEL!"],
    win: ["WHAT?! FINE. YOU'RE NOT BAD... FOR NOW.", "I'LL BE BACK WITH A BETTER DECK!"],
    lose: ['HA! TOLD YOU. COME BACK WHEN YOU HAVE A REAL DECK.'],
  },
  rival2: {
    name: 'RHYS', portrait: 'rival', sprite: SPR.rival, pos: [7, 4], face: 'left',
    present: (save) => medals(save) >= 4 && beat(save, 'rival1') && !beat(save, 'rival2'),
    deck: 'rival_2', deckName: 'RIVAL DECK II', skill: 0.8, music: 'duel',
    prize: { packs: ['LEA', 'LEA', 'LEG'], gold: 120 },
    intro: ['FOUR MEDALS, HUH? ME TOO. ALMOST.', 'MY NEW DECK HAS COUNTERSPELLS. YOU WON\'T EVEN GET TO CAST ANYTHING!'],
    win: ["UGH! HOW DO YOU KEEP DOING THAT?", 'SEE YOU AT THE SUMMIT. NEXT TIME I WIN.'],
    lose: ['HAHA! MY COUNTERSPELLS ARE TOO MUCH FOR YOU!'],
  },

  // ------------------------------------------------------------ Forest Club
  elm: {
    name: 'RANGER ELM', portrait: 'wild', sprite: SPR.green, pos: [1, 5], face: 'right',
    deck: 'elf_warband', deckName: 'ELF WARBAND', skill: 0.4,
    prize: { packs: ['LEA', 'LEA'], gold: 60 }, rematch: { packs: ['LEA'], gold: 30 },
    intro: ['THE ELVES OF LLANOWAR STRIKE FAST. CAN YOU KEEP UP?'],
    win: ['THE FOREST BOWS TO YOU... THIS TIME.'],
    lose: ['THE WOODS PROTECT THEIR OWN!'],
  },
  bo: {
    name: 'BIG BO', portrait: 'kid_cap', sprite: SPR.green, pos: [8, 5], face: 'left',
    deck: 'big_wurms', deckName: 'BIG WURMS', skill: 0.45,
    prize: { packs: ['LEA', 'LEA'], gold: 60 }, rematch: { packs: ['LEA'], gold: 30 },
    intro: ['I ONLY PLAY BIG CREATURES. THE BIGGER THE BETTER!'],
    win: ['AW, MAN. MY WURMS WERE TOO SLOW.'],
    lose: ['CRAW WURM SAYS HI!'],
  },
  nissa: {
    name: 'NISSA', fullName: 'NISSA REVANE', portrait: 'nissa', sprite: SPR.nissa, pos: [4, 2], face: 'down', master: true, medal: 'G',
    deck: 'mana_ramp', deckName: 'MANA RAMP DECK', skill: 0.9, music: 'boss',
    prize: { packs: ['LEA', 'LEA', 'LEA'], gold: 150, cards: ['birds_of_paradise'] }, rematch: { packs: ['LEA', 'LEA'], gold: 60 },
    requires: (save) => (beat(save, 'elm') && beat(save, 'bo') ? null : 'THE FOREST TESTS ALL WHO ENTER. DEFEAT MY CLUB MEMBERS, THEN COME TO ME.'),
    intro: ['I AM NISSA REVANE, MASTER OF THE FOREST CLUB.', 'THE LAND ITSELF IS MY ALLY. SHOW ME YOUR STRENGTH!'],
    win: ['YOU HAVE EARNED THE FOREST MEDAL.', 'TAKE THESE BIRDS OF PARADISE AS WELL. MAY THEY GUIDE YOU.'],
    lose: ['THE FOREST IS PATIENT. RETURN WHEN YOU HAVE GROWN.'],
  },

  // ------------------------------------------------------------ Mountain Club
  rocco: {
    name: 'ROCCO', portrait: 'hothead', sprite: SPR.red, pos: [1, 5], face: 'right',
    deck: 'goblin_gang', deckName: 'GOBLIN GANG', skill: 0.4,
    prize: { packs: ['DRK', 'DRK'], gold: 60 }, rematch: { packs: ['DRK'], gold: 30 },
    intro: ['GOBLINS! GOBLINS EVERYWHERE! ...THAT\'S MY WHOLE STRATEGY.'],
    win: ['MY GOBLINS... THEY RAN AWAY.'],
    lose: ['RAGING GOBLIN NEVER WAITS!'],
  },
  pete: {
    name: 'PYRO PETE', portrait: 'smith', sprite: SPR.red, pos: [8, 5], face: 'left',
    deck: 'burn_baby_burn', deckName: 'BURN BABY BURN', skill: 0.5,
    prize: { packs: ['DRK', 'DRK'], gold: 60 }, rematch: { packs: ['DRK'], gold: 30 },
    intro: ['WHY ATTACK WHEN YOU CAN JUST... BURN?'],
    win: ['I RAN OUT OF FIREBALLS!'],
    lose: ['THAT\'S WHAT YOU GET FOR STANDING NEAR A LIGHTNING BOLT.'],
  },
  chandra: {
    name: 'CHANDRA', fullName: 'CHANDRA NALAAR', portrait: 'chandra', sprite: SPR.chandra, pos: [4, 2], face: 'down', master: true, medal: 'R',
    deck: 'dragons_fire', deckName: "DRAGON'S FIRE", skill: 0.85, music: 'boss',
    prize: { packs: ['LEA', 'LEA', 'DRK'], gold: 150, cards: ['shivan_dragon'] }, rematch: { packs: ['LEA', 'DRK'], gold: 60 },
    requires: (save) => (beat(save, 'rocco') && beat(save, 'pete') ? null : 'HAH! YOU HAVEN\'T EVEN BEATEN MY STUDENTS. GO PLAY WITH ROCCO AND PETE FIRST.'),
    intro: ["I'M CHANDRA, AND THIS IS THE MOUNTAIN CLUB!", 'HOPE YOU LIKE IT HOT!'],
    win: ['OKAY, OKAY, YOU WIN! TAKE THE MOUNTAIN MEDAL.', 'AND THIS SHIVAN DRAGON. TREAT HER WELL!'],
    lose: ['BURNED TO A CRISP! TRY AGAIN SOMETIME.'],
  },

  // ------------------------------------------------------------ Island Club
  finn: {
    name: 'SAILOR FINN', portrait: 'sailor', sprite: SPR.blue, pos: [1, 5], face: 'right',
    deck: 'merfolk_tide', deckName: 'MERFOLK TIDE', skill: 0.35,
    prize: { packs: ['LEG', 'LEG'], gold: 60 }, rematch: { packs: ['LEG'], gold: 30 },
    intro: ['AHOY! THE MERFOLK OF ATLANTIS SAIL WITH ME!'],
    win: ['SUNK! YOU SAILED RIGHT PAST MY FLEET.'],
    lose: ['ISLANDWALK, MATEY! CAN\'T BLOCK WHAT YOU CAN\'T CATCH!'],
  },
  lin: {
    name: 'CAPTAIN LIN', portrait: 'glasses', sprite: SPR.blue, pos: [8, 5], face: 'left',
    deck: 'sky_patrol', deckName: 'SKY PATROL', skill: 0.45,
    prize: { packs: ['LEG', 'LEG'], gold: 60 }, rematch: { packs: ['LEG'], gold: 30 },
    intro: ['GROUND CREATURES ARE SO... GROUNDED. MY DECK FLIES.'],
    win: ['GROUNDED. HOW EMBARRASSING.'],
    lose: ['THE SKY BELONGS TO ME!'],
  },
  jace: {
    name: 'JACE', fullName: 'JACE BELEREN', portrait: 'jace', sprite: SPR.jace, pos: [4, 2], face: 'down', master: true, medal: 'U',
    deck: 'mind_games', deckName: 'MIND GAMES', skill: 0.9, music: 'boss',
    prize: { packs: ['LEA', 'LEA', 'LEG'], gold: 150, cards: ['counterspell'] }, rematch: { packs: ['LEA', 'LEG'], gold: 60 },
    requires: (save) => (beat(save, 'finn') && beat(save, 'lin') ? null : 'I ALREADY KNOW HOW THIS ENDS. BEAT FINN AND LIN, THEN WE\'LL TALK.'),
    intro: ['I AM JACE BELEREN. I KNOW EVERY CARD IN YOUR DECK.', 'AND EVERY MISTAKE YOU ARE ABOUT TO MAKE.'],
    win: ["...I DIDN'T SEE THAT COMING. THE ISLAND MEDAL IS YOURS.", 'TAKE THIS COUNTERSPELL. KNOWING WHEN TO SAY NO IS POWER.'],
    lose: ['PREDICTABLE.'],
  },

  // ------------------------------------------------------------ Plains Club
  ada: {
    name: 'SISTER ADA', portrait: 'nun', sprite: SPR.white, pos: [1, 5], face: 'right',
    deck: 'holy_order', deckName: 'HOLY ORDER', skill: 0.4,
    prize: { packs: ['ARN', 'ARN'], gold: 60 }, rematch: { packs: ['ARN'], gold: 30 },
    intro: ['BLESSINGS, TRAVELER. SHALL WE HAVE A FRIENDLY DUEL?'],
    win: ['A FINE DUEL. MAY THE LIGHT GUIDE YOU.'],
    lose: ['THE CRUSADE MARCHES ON!'],
  },
  bertram: {
    name: 'SIR BERTRAM', portrait: 'knight_m', sprite: SPR.white, pos: [8, 5], face: 'left',
    deck: 'pegasus_wing', deckName: 'PEGASUS WING', skill: 0.55,
    prize: { packs: ['ARN', 'ARN'], gold: 60 }, rematch: { packs: ['ARN'], gold: 30 },
    intro: ['HALT! A KNIGHT OF THE PLAINS CHALLENGES YOU!'],
    win: ['I YIELD! YOU FIGHT WITH HONOR.'],
    lose: ['FOR BENALIA!'],
  },
  gideon: {
    name: 'GIDEON', fullName: 'GIDEON JURA', portrait: 'gideon', sprite: SPR.gideon, pos: [4, 2], face: 'down', master: true, medal: 'W',
    deck: 'knights_crusade', deckName: "KNIGHT'S CRUSADE", skill: 0.85, music: 'boss',
    prize: { packs: ['LEA', 'LEA', 'ARN'], gold: 150, cards: ['serra_angel'] }, rematch: { packs: ['LEA', 'ARN'], gold: 60 },
    requires: (save) => (beat(save, 'ada') && beat(save, 'bertram') ? null : 'PROVE YOURSELF AGAINST MY KNIGHTS FIRST. THAT IS THE WAY OF THE PLAINS.'),
    intro: ['I AM GIDEON JURA. I DO NOT FIGHT FOR GLORY, ONLY FOR WHAT IS RIGHT.', 'SHOW ME YOUR RESOLVE!'],
    win: ['WELL FOUGHT. THE PLAINS MEDAL IS YOURS.', 'MAY THIS SERRA ANGEL WATCH OVER YOU.'],
    lose: ['STAND UP. A TRUE CHAMPION ALWAYS STANDS BACK UP.'],
  },

  // ------------------------------------------------------------ Swamp Club
  mort: {
    name: 'MORT', portrait: 'old_man', sprite: SPR.black, pos: [1, 5], face: 'right',
    deck: 'graveyard_shift', deckName: 'GRAVEYARD SHIFT', skill: 0.4,
    prize: { packs: ['DRK', 'DRK'], gold: 60 }, rematch: { packs: ['DRK'], gold: 30 },
    intro: ["HEH HEH. MY SKELETONS DON'T STAY DOWN FOR LONG."],
    win: ['BURIED! WELL, THEY\'LL BE BACK.'],
    lose: ['REGENERATE, MY PRETTIES!'],
  },
  nyx: {
    name: 'LADY NYX', portrait: 'goth', sprite: SPR.black, pos: [8, 5], face: 'left',
    deck: 'night_terrors', deckName: 'NIGHT TERRORS', skill: 0.55,
    prize: { packs: ['DRK', 'DRK'], gold: 60 }, rematch: { packs: ['DRK'], gold: 30 },
    intro: ['DO YOU FEAR THE DARK? YOU WILL.'],
    win: ['THE NIGHT... ENDS. HOW DULL.'],
    lose: ['SWEET DREAMS.'],
  },
  liliana: {
    name: 'LILIANA', fullName: 'LILIANA VESS', portrait: 'liliana', sprite: SPR.liliana, pos: [4, 2], face: 'down', master: true, medal: 'B',
    deck: 'necromancy', deckName: 'NECROMANCY', skill: 0.9, music: 'boss',
    prize: { packs: ['LEA', 'LEA', 'DRK'], gold: 150, cards: ['sengir_vampire'] }, rematch: { packs: ['LEA', 'DRK'], gold: 60 },
    requires: (save) => (beat(save, 'mort') && beat(save, 'nyx') ? null : "MY SERVANTS WILL DEAL WITH YOU. DON'T WASTE MY TIME UNTIL YOU'VE BEATEN THEM."),
    intro: ['LILIANA VESS. YOU MAY HAVE HEARD OF ME.', 'EVERYTHING DIES. LET ME SHOW YOU.'],
    win: ['HOW... IRRITATING. FINE. TAKE THE SWAMP MEDAL.', 'AND THIS VAMPIRE. HE WAS GETTING ON MY NERVES.'],
    lose: ['DEATH COMES FOR EVERYONE. TODAY IT CAME FOR YOU.'],
  },

  // ------------------------------------------------------------ Artifact Club
  tess: {
    name: 'TINKER TESS', portrait: 'smith', sprite: SPR.grey, pos: [1, 5], face: 'right',
    deck: 'clockwork', deckName: 'CLOCKWORK', skill: 0.5,
    prize: { packs: ['ATQ', 'ATQ'], gold: 60 }, rematch: { packs: ['ATQ'], gold: 30 },
    intro: ['EVERY GEAR IN ITS PLACE. EVERY CARD A MACHINE.'],
    win: ['A LOOSE SPRING... I\'LL FIX IT FOR NEXT TIME.'],
    lose: ['CLOCKWORK PRECISION!'],
  },
  karn: {
    name: 'KARN', fullName: 'KARN, SILVER GOLEM', portrait: 'karn', sprite: SPR.karn, pos: [4, 2], face: 'down', master: true, medal: 'A',
    deck: 'workshop', deckName: "MISHRA'S WORKSHOP", skill: 0.9, music: 'boss',
    prize: { packs: ['LEA', 'ATQ', 'ATQ'], gold: 150, cards: ['juggernaut', 'sol_ring'] }, rematch: { packs: ['LEA', 'ATQ'], gold: 60 },
    requires: (save) => (beat(save, 'tess') ? null : 'I WILL DUEL YOU AFTER YOU HAVE BEATEN TESS. SHE BUILT HALF OF MY DECK.'),
    intro: ['I AM KARN. I WAS BUILT BY URZA HIMSELF.', 'ARTIFACTS ANSWER TO NO COLOR. LET US BEGIN.'],
    win: ['IMPRESSIVE. THE ARTIFACT MEDAL IS YOURS, ALONG WITH A JUGGERNAUT AND A SOL RING.'],
    lose: ['YOUR STRATEGY HAD... A DESIGN FLAW.'],
  },

  // ------------------------------------------------------------ Shop
  shopkeeper: {
    name: 'SHOPKEEPER', portrait: 'old_man', sprite: SPR.shop, pos: [3, 2], face: 'down',
    talk: () => ({ script: 'shop' }),
  },
  trader: {
    name: 'COLLECTOR', portrait: 'glasses', sprite: SPR.grey, pos: [7, 5], face: 'left',
    talk: (save) => ({ lines: [`I COLLECT EVERY CARD. YOU'VE FOUND ${Object.keys(save.collection).length} DIFFERENT CARDS SO FAR!`, 'CHECK YOUR ALBUM FROM THE START MENU TO SEE WHICH ONES YOU\'RE MISSING.'] }),
  },

  // ------------------------------------------------------------ Summit
  gatekeeper: {
    name: 'GATEKEEPER', portrait: 'knight_m', sprite: SPR.white, pos: [4, 6], face: 'down',
    present: (save) => save.medals.length < 6,
    talk: (save) => ({ lines: [`ONLY THOSE WITH ALL SIX MEDALS MAY CHALLENGE THE GRAND MASTERS. YOU HAVE ${save.medals.length}.`] }),
    blocks: true,
  },
  urza: {
    name: 'URZA', fullName: 'URZA, LORD HIGH ARTIFICER', portrait: 'urza', sprite: SPR.urza, pos: [2, 3], face: 'right', grand: 1,
    present: (save) => save.medals.length >= 6,
    deck: 'urza', deckName: 'TOLARIAN ORDER', skill: 1, music: 'boss',
    prize: { packs: ['LEA', 'LEA'], gold: 200, cards: ['mox_sapphire'] },
    intro: ['THE GRAND MASTERS FIGHT ONE AFTER ANOTHER. LOSE ONCE AND YOU START AGAIN FROM ME.', 'I AM URZA. BEGIN.'],
    win: ['A WORTHY STUDENT. GO ON TO MY BROTHER.'],
    lose: ['RETURN WHEN YOUR DESIGN IS COMPLETE.'],
    requires: (save) => null,
  },
  mishra: {
    name: 'MISHRA', fullName: 'MISHRA, ARTIFICER PRODIGY', portrait: 'mishra', sprite: SPR.mishra, pos: [7, 3], face: 'left', grand: 2,
    present: (save) => save.medals.length >= 6,
    deck: 'mishra', deckName: 'BROTHERS WAR', skill: 1, music: 'boss',
    prize: { packs: ['LEA', 'LEA'], gold: 200, cards: ['mox_ruby'] },
    requires: (save) => (save.flags.grand >= 1 ? null : 'FACE MY BROTHER URZA FIRST. ALWAYS URZA FIRST.'),
    intro: ['MY BROTHER LOST? HA! I WILL NOT BE SO GENTLE.'],
    win: ['IMPOSSIBLE... GO, THEN. THE DRAGON WAITS.'],
    lose: ['YOU WILL HAVE TO BEGIN AGAIN. FROM URZA.'],
  },
  bolas: {
    name: 'BOLAS', fullName: 'NICOL BOLAS', portrait: 'bolas', sprite: SPR.bolas, pos: [4, 2], face: 'down', grand: 3,
    present: (save) => save.medals.length >= 6,
    deck: 'bolas', deckName: 'ELDER DRAGON', skill: 1, music: 'boss',
    prize: { packs: ['LEA', 'LEA', 'LEA'], gold: 300, cards: ['mox_jet'] },
    requires: (save) => (save.flags.grand >= 2 ? null : 'INSECT. BEAT THE BROTHERS BEFORE YOU WASTE MY TIME.'),
    intro: ['I AM NICOL BOLAS. I WAS ANCIENT WHEN YOUR WORLD WAS YOUNG.', 'KNEEL... OR DUEL.'],
    win: ['...THIS IS NOT THE END, PLANESWALKER.'],
    lose: ['AS EXPECTED. START OVER, INSECT.'],
  },
  rival3: {
    name: 'RHYS', portrait: 'rival', sprite: SPR.rival, pos: [4, 4], face: 'down', grand: 4,
    present: (save) => save.medals.length >= 6 && save.flags.grand >= 3 && !save.flags.champion,
    deck: 'rival_3', deckName: 'RIVAL DECK III', skill: 1, music: 'boss',
    prize: { packs: ['LEA', 'LEA', 'LEA', 'LEA'], gold: 500, cards: ['black_lotus', 'ancestral_recall', 'time_walk', 'mox_pearl', 'mox_emerald'] },
    intro: ['YOU BEAT ALL THREE GRAND MASTERS?!', "THEN THERE'S ONE LAST DUEL. ME. FOR THE TITLE OF PLANESWALKER!"],
    win: ['...YOU WIN. FOR REAL THIS TIME.', "YOU'RE THE PLANESWALKER. I GUESS... CONGRATULATIONS."],
    lose: ["HA! I'M THE PLANESWALKER! ...BUT YOU'LL HAVE TO START FROM URZA AGAIN."],
  },
};

export function npcsIn(locId, save) {
  return LOCATIONS[locId].npcs.filter((id) => {
    const n = NPCS[id];
    return !n.present || n.present(save);
  });
}

export { SPR };
