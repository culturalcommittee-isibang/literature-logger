// logic.js
// Converted from logic.py

const MINOR_HEARTS = Array.from({length: 6}, (_,i) => `${2+i}H`);   // 2..7
const MINOR_DIAMONDS = Array.from({length: 6}, (_,i) => `${2+i}D`);
const MINOR_SPADES = Array.from({length: 6}, (_,i) => `${2+i}S`);
const MINOR_CLUBS = Array.from({length: 6}, (_,i) => `${2+i}C`);

const MAJOR_HEARTS = [...Array.from({length: 2}, (_,i) => `${9+i}H`), "JH","QH","KH","AH"];
const MAJOR_DIAMONDS = [...Array.from({length: 2}, (_,i) => `${9+i}D`), "JD","QD","KD","AD"];
const MAJOR_SPADES = [...Array.from({length: 2}, (_,i) => `${9+i}S`), "JS","QS","KS","AS"];
const MAJOR_CLUBS = [...Array.from({length: 2}, (_,i) => `${9+i}C`), "JC","QC","KC","AC"];

const EIGHTS = ["8H","8D","8S","8C","JJ","JG"];

export const ALL_CARDS = [
  ...MINOR_HEARTS, ...MINOR_DIAMONDS, ...MINOR_SPADES, ...MINOR_CLUBS,
  ...MAJOR_HEARTS, ...MAJOR_DIAMONDS, ...MAJOR_SPADES, ...MAJOR_CLUBS,
  ...EIGHTS
];

// findPit: returns { pitName, pitCards } or { pitName: "UNKNOWN" }
export function findPit(card) {
  if (MINOR_HEARTS.includes(card)) return { pitName: "MINOR_HEARTS", pitCards: MINOR_HEARTS };
  if (MINOR_DIAMONDS.includes(card)) return { pitName: "MINOR_DIAMONDS", pitCards: MINOR_DIAMONDS };
  if (MINOR_SPADES.includes(card)) return { pitName: "MINOR_SPADES", pitCards: MINOR_SPADES };
  if (MINOR_CLUBS.includes(card)) return { pitName: "MINOR_CLUBS", pitCards: MINOR_CLUBS };
  if (MAJOR_HEARTS.includes(card)) return { pitName: "MAJOR_HEARTS", pitCards: MAJOR_HEARTS };
  if (MAJOR_DIAMONDS.includes(card)) return { pitName: "MAJOR_DIAMONDS", pitCards: MAJOR_DIAMONDS };
  if (MAJOR_SPADES.includes(card)) return { pitName: "MAJOR_SPADES", pitCards: MAJOR_SPADES };
  if (MAJOR_CLUBS.includes(card)) return { pitName: "MAJOR_CLUBS", pitCards: MAJOR_CLUBS };
  if (EIGHTS.includes(card)) return { pitName: "EIGHTS", pitCards: EIGHTS };
  return { pitName: "UNKNOWN" };
}

// findTeam: returns team key (e.g. "team_1") or null
export function findTeam(player, teams) {
  for (const [teamKey, members] of Object.entries(teams)) {
    // members includes player-keys and a "total_pits" field
    if (player in members && player !== "total_pits") return teamKey;
  }
  return null;
}

export default class GameState {
  constructor() {
    this.players = {};      // { playerName: [cards] }
    this.teams = {};        // { team_1: { playerName: {...}, total_pits: number }, team_2: {...} }
    this.caller = null;
    this.droppedPits = [];  // list of pit names
    this.logs = [];         // history array of small objects like {CALL: "..." }
  }

  // Set player names. (Defaults to null if not provided, like original.)
  setPlayers(player_1A = null, player_1B = null, player_1C = null, player_2A = null, player_2B = null, player_2C = null) {
    this.players = {
      [player_1A]: [], [player_1B]: [], [player_1C]: [],
      [player_2A]: [], [player_2B]: [], [player_2C]: []
    };

    this.teams = {
      team_1: {
        [player_1A]: { pits_dropped: [], pits_burned: [] },
        [player_1B]: { pits_dropped: [], pits_burned: [] },
        [player_1C]: { pits_dropped: [], pits_burned: [] },
        total_pits: 0
      },
      team_2: {
        [player_2A]: { pits_dropped: [], pits_burned: [] },
        [player_2B]: { pits_dropped: [], pits_burned: [] },
        [player_2C]: { pits_dropped: [], pits_burned: [] },
        total_pits: 0
      }
    };
  }

  // Fisher-Yates shuffle, deal 9 cards to each player
  setShuffleCards() {
    const deck = ALL_CARDS.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const playerNames = Object.keys(this.players);
    const cardsPerPlayer = 9;

    for (let i = 0; i < playerNames.length; i++) {
      const player = playerNames[i];
      const start = i * cardsPerPlayer;
      const end = start + cardsPerPlayer;
      this.players[player] = deck.slice(start, end);
    }

    console.info("Cards shuffled and dealt to players.");
    this.logs.push({ INITIAL: "Shuffled cards to players." });
  }

  setCaller(player) {
    if (!Object.prototype.hasOwnProperty.call(this.players, player)) {
      throw new Error("Player not found in the game state.");
    }
    this.caller = player;
    console.info(`Caller set to ${player}.`);
    this.logs.push({ CALLER_SET: `Caller set to ${player}.` });
  }

  makeCall(caller, callee, card) {
    if (caller !== this.caller) throw new Error("Check caller again!");
    if (!Object.prototype.hasOwnProperty.call(this.players, caller) || !Object.prototype.hasOwnProperty.call(this.players, callee)) {
      throw new Error("Caller or callee not found in the game state.");
    }

    const callerTeam = findTeam(caller, this.teams);
    const calleeTeam = findTeam(callee, this.teams);
    if (callerTeam === calleeTeam) throw new Error("Calls can only be made to players on the other team.");

    if (!ALL_CARDS.includes(card)) throw new Error("Check card again!");

    const { pitName, pitCards } = findPit(card);
    if (pitName === "UNKNOWN") throw new Error("Card not found in any pit.");

    // Caller called a card they have: pit burn
    if (this.players[caller].includes(card)) {
      console.warn(`Possible pit burn: ${pitName}.`);
      console.warn("Reason: Caller called a card they have.");
    }

    // Caller has no card from that pit: pit burn.
    // (Fixed: check intersection with pitCards, original python had a bug using set(pit).)
    const callerHasAnyFromPit = pitCards.some(c => this.players[caller].includes(c));
    if (!callerHasAnyFromPit) {
      console.warn(`Possible pit burn: ${pitName}`);
      console.warn("Reason: Caller has no card from the pit called");
    }

    // If callee has the card, transfer it to the caller.
    if (this.players[callee].includes(card)) {
      // remove card from callee
      this.players[callee] = this.players[callee].filter(c => c !== card);
      // add to caller
      this.players[caller].push(card);
      console.info(`Card ${card} transferred from ${callee} to ${caller}.`);
      this.logs.push({ CALL: `${caller} called ${callee} for ${card}.` });
    } else {
      // shift caller
      this.caller = callee;
      console.info(`Caller shifted to ${callee} as they do not have the card ${card}.`);
      this.logs.push({ CALL: `${caller} called ${callee} for ${card}.` });
    }
  }

  setPitBurn(burner, card) {
    const { pitName, pitCards } = findPit(card);
    if (pitName === "UNKNOWN") throw new Error("Card not found in any pit.");

    if (!Object.prototype.hasOwnProperty.call(this.players, burner)) {
      throw new Error("Burner not found in the game state.");
    }

    // Remove all cards from all players' hands that belong to the pit.
    for (const p of Object.keys(this.players)) {
      this.players[p] = this.players[p].filter(c => !pitCards.includes(c));
    }

    // Add the pit to droppedPits and update team records
    if (!this.droppedPits.includes(pitName)) {
      this.droppedPits.push(pitName);

      const team = findTeam(burner, this.teams);
      if (team === null) throw new Error("Burner not found in any team.");

      // ensure player's record exists
      if (!this.teams[team][burner]) this.teams[team][burner] = { pits_dropped: [], pits_burned: [] };
      this.teams[team][burner].pits_burned.push(pitName);

      const opposing = team === "team_1" ? "team_2" : "team_1";
      this.teams[opposing].total_pits += 1;
    }

    console.info(`Pit ${pitName} burned by ${burner}.`);
    this.logs.push({ BURN: `${burner} burned pit ${pitName}.` });
  }

  setPitDrop(dropper, card) {
    const { pitName, pitCards } = findPit(card);
    if (pitName === "UNKNOWN") {
      console.error("Card not found in any pit.");
      throw new Error("Card not found in any pit.");
    }

    if (!Object.prototype.hasOwnProperty.call(this.players, dropper)) {
      console.error("Dropper not found in the game state.");
      throw new Error("Dropper not found in the game state.");
    }

    if (this.droppedPits.includes(pitName)) {
      console.warn(`Pit ${pitName} has already been dropped.`);
      return;
    }

    // Remove all cards from all players' hands that belong to the pit.
    for (const p of Object.keys(this.players)) {
      this.players[p] = this.players[p].filter(c => !pitCards.includes(c));
    }

    if (!this.droppedPits.includes(pitName)) {
      this.droppedPits.push(pitName);

      const team = findTeam(dropper, this.teams);
      if (team === null) throw new Error("Dropper not found in any team.");

      if (!this.teams[team][dropper]) this.teams[team][dropper] = { pits_dropped: [], pits_burned: [] };
      this.teams[team][dropper].pits_dropped.push(pitName);

      this.teams[team].total_pits += 1;
    }

    console.info(`Pit ${pitName} dropped by ${dropper}.`);
    this.logs.push({ DROP: `${dropper} dropped pit ${pitName}.` });
  }

  passCard(passer, passee) {
    if (passer !== this.caller) {
      console.error("Passer must be the current caller.");
      throw new Error("Passer must be the current caller.");
    }

    if (!Object.prototype.hasOwnProperty.call(this.players, passer) || !Object.prototype.hasOwnProperty.call(this.players, passee)) {
      console.error("Passer or passee not found in the game state.");
      throw new Error("Passer or passee not found in the game state.");
    }

    const passerTeam = findTeam(passer, this.teams);
    const passeeTeam = findTeam(passee, this.teams);
    if (passerTeam !== passeeTeam) {
      console.error("Cards can only be passed to players on the same team.");
      throw new Error("Cards can only be passed to players on the same team.");
    }

    if (this.players[passer].length !== 1) {
      console.error("Passer must have exactly one card to pass.");
      throw new Error("Passer must have exactly one card to pass.");
    }

    const card = this.players[passer].pop();
    this.players[passee].push(card);

    console.info(`Card ${card} passed from ${passer} to ${passee}.`);
    this.caller = passee;
    console.info(`Caller shifted to ${passee}.`);
    this.logs.push({ PASS: `${passer} passed card ${card} to ${passee}.` });
  }

  forceCardShift(fromPlayer, toPlayer, card) {
    if (!Object.prototype.hasOwnProperty.call(this.players, fromPlayer) || !Object.prototype.hasOwnProperty.call(this.players, toPlayer)) {
      console.error("Both players must be in the game.");
      throw new Error("Both players must be in the game.");
    }

    if (!this.players[fromPlayer].includes(card)) {
      console.error(`Card ${card} not found in ${fromPlayer}'s hand.`);
      throw new Error(`Card ${card} not found in ${fromPlayer}'s hand.`);
    }

    // Transfer the card
    this.players[toPlayer].push(card);
    this.players[fromPlayer] = this.players[fromPlayer].filter(c => c !== card);

    console.info(`Card ${card} transferred from ${fromPlayer} to ${toPlayer}.`);
    this.logs.push({ FORCE_SHIFT: `Clean-up; shifted ${card} from ${fromPlayer} to ${toPlayer}.` });
  }

  resetGameState() {
    this.players = {};
    this.teams = {};
    this.caller = null;
    this.droppedPits = [];
    this.logs = [];
    console.info("Game state has been reset.");
  }
}
