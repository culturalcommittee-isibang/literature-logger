import React, { useState, useEffect, useRef } from 'react';
import PlayerCardGrid from './components/PlayerCardGrid';
import useMakeCallDragDrop from './hooks/useMakeCallDragDrop';
import { downloadLogsAsText } from './utils/downloadLogs';
import GameState from './logic.js';
import './Game.css';

// Card alias map
const SUIT_NAMES = { H: 'Hearts', D: 'Diamonds', S: 'Spades', C: 'Clubs' };
const RANK_NAMES = { 'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack' };
function cardAlias(card) {
  if (card === 'JJ') return 'Joker';
  if (card === 'JG') return 'Guarantee';
  const m = card.match(/^(\d+|[JQKA])([HDCS])$/);
  if (!m) return card;
  const rank = RANK_NAMES[m[1]] || m[1];
  const suit = SUIT_NAMES[m[2]] || m[2];
  return `${rank} of ${suit}`;
}

// Proper suit order helper for sorting cards: H, D, S, C; ranks 2..10, J, Q, K, A; Jokers last
const SUIT_ORDER = { H: 0, D: 1, S: 2, C: 3 };
const RANK_ORDER = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
function sortCards(cards) {
  return cards.slice().sort((a, b) => {
    if (a === 'JJ' || a === 'JG') return 1;
    if (b === 'JJ' || b === 'JG') return -1;
    const ma = a.match(/^(\d+|[JQKA])([HDCS])$/);
    const mb = b.match(/^(\d+|[JQKA])([HDCS])$/);
    if (!ma || !mb) return a.localeCompare(b);
    const [ , ra, sa ] = ma;
    const [ , rb, sb ] = mb;
    if (SUIT_ORDER[sa] !== SUIT_ORDER[sb]) return SUIT_ORDER[sa] - SUIT_ORDER[sb];
    return (RANK_ORDER[ra] || 0) - (RANK_ORDER[rb] || 0);
  });
}

const game = new GameState();

function Game() {
    const [logs, setLogs] = useState([]);
    const [players, setPlayers] = useState({});
    const [method, setMethod] = useState('set-players-form');
    const [_, setForceUpdate] = useState(0);

    const setPlayersFormRef = useRef(null);
    const setCallerFormRef = useRef(null);
    const makeCallFormRef = useRef(null);
    const pitDropFormRef = useRef(null);
    const pitBurnFormRef = useRef(null);
    const passCardFormRef = useRef(null);
    const forceShiftFormRef = useRef(null);

    const rerender = () => setForceUpdate(f => f + 1);

    const teamAIds = ['team-a-top', 'team-a-center', 'team-a-bottom'];
    const teamBIds = ['team-b-top', 'team-b-center', 'team-b-bottom'];

    const teamA = Object.keys(players).slice(0, 3);
    const teamB = Object.keys(players).slice(3, 6);

    function getTeams() {
        const names = Object.keys(game.players).filter(Boolean);
        return { teamA: names.slice(0, 3), teamB: names.slice(3, 6) };
    }

    const allCards = sortCards(Array.from(new Set(Object.values(players).flat())));
    const playerNames = Object.keys(players).filter(Boolean);

    // Event Handlers
    const handleSetPlayers = (e) => {
        e.preventDefault();
        const p = Array.from(setPlayersFormRef.current.elements).filter(el => el.name.startsWith('player')).map(el => el.value.trim());
        game.setPlayers(...p);
        setPlayers({ ...game.players });
        setLogs([...game.logs]);
    };

    const handleShuffle = () => {
        game.setShuffleCards();
        setPlayers({ ...game.players });
        setLogs([...game.logs]);
    };

    const handleSetCaller = (e) => {
        e.preventDefault();
        const player = setCallerFormRef.current.elements['caller'].value;
        try {
            game.setCaller(player);
        } catch (err) { alert(err.message); }
        setLogs([...game.logs]);
    };

    const handleMakeCall = (e) => {
        e.preventDefault();
        const caller = makeCallFormRef.current.elements['caller'].value;
        const callee = makeCallFormRef.current.elements['callee'].value;
        const card = makeCallFormRef.current.elements['card'].value;
        try {
            game.makeCall(caller, callee, card);
        } catch (err) { alert(err.message); }
        setPlayers({ ...game.players });
        setLogs([...game.logs]);
    };

    const handlePitDrop = (e) => {
        e.preventDefault();
        const dropper = pitDropFormRef.current.elements['dropper'].value;
        const card = pitDropFormRef.current.elements['card'].value;
        try {
            game.setPitDrop(dropper, card);
        } catch (err) { alert(err.message); }
        setPlayers({ ...game.players });
        setLogs([...game.logs]);
    };

    const handlePitBurn = (e) => {
        e.preventDefault();
        const burner = pitBurnFormRef.current.elements['burner'].value;
        const card = pitBurnFormRef.current.elements['card'].value;
        try {
            game.setPitBurn(burner, card);
        } catch (err) { alert(err.message); }
        setPlayers({ ...game.players });
        setLogs([...game.logs]);
    };

    const handlePassCard = (e) => {
        e.preventDefault();
        const passer = passCardFormRef.current.elements['passer'].value;
        const passee = passCardFormRef.current.elements['passee'].value;
        try {
            game.passCard(passer, passee);
        } catch (err) { alert(err.message); }
        setPlayers({ ...game.players });
        setLogs([...game.logs]);
    };

    const handleForceShift = (e) => {
        e.preventDefault();
        const fromPlayer = forceShiftFormRef.current.elements['fromPlayer'].value;
        const toPlayer = forceShiftFormRef.current.elements['toPlayer'].value;
        const card = forceShiftFormRef.current.elements['card'].value;
        try {
            game.forceCardShift(fromPlayer, toPlayer, card);
        } catch (err) { alert(err.message); }
        setPlayers({ ...game.players });
        setLogs([...game.logs]);
    };

    const handleDownloadLogs = () => {
        downloadLogsAsText(logs);
    };

    const [makeCallCaller, setMakeCallCaller] = useState('');
    const { teamA: teamANames, teamB: teamBNames } = getTeams();
    const oppositeTeam = teamANames.includes(makeCallCaller) ? teamBNames : teamANames;

    const [passer, setPasser] = useState('');
    const { teamA: passerTeamA, teamB: passerTeamB } = getTeams();
    const sameTeam = passerTeamA.includes(passer) ? passerTeamA.filter(p => p !== passer) : passerTeamB.filter(p => p !== passer);

    const getTeamOf = (player) => {
        if (teamA.includes(player)) return 'A';
        if (teamB.includes(player)) return 'B';
        return null;
    };

    const dragDrop = useMakeCallDragDrop({
        isEnabled: method === 'make-call-form',
        gameInstance: game,
        setPlayers,
        setLogs,
        getTeamOf,
    });


    return (
        <div>
            <h1 id="main-title">Literature Logger</h1>

            <div id="central-ui">
                <label htmlFor="method-select"><strong>Select Log Method:</strong></label>
                <select id="method-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="set-players-form">Set Players</option>
                    <option value="shuffle-btn">Shuffle & Deal Cards</option>
                    <option value="set-caller-form">Set Caller</option>
                    <option value="make-call-form">Make Call</option>
                    <option value="pit-drop-form">Pit Drop</option>
                    <option value="pit-burn-form">Pit Burn</option>
                    <option value="pass-card-form">Pass Card</option>
                    <option value="force-shift-form">Force Card Shift</option>
                </select>

                {method === 'set-players-form' && (
                    <form id="set-players-form" ref={setPlayersFormRef} onSubmit={handleSetPlayers}>
                        <h2>Set Players</h2>
                        <input name="player_1A" placeholder="Team 1 - Player A" required />
                        <input name="player_1B" placeholder="Team 1 - Player B" required />
                        <input name="player_1C" placeholder="Team 1 - Player C" required />
                        <input name="player_2A" placeholder="Team 2 - Player A" required />
                        <input name="player_2B" placeholder="Team 2 - Player B" required />
                        <input name="player_2C" placeholder="Team 2 - Player C" required />
                        <button type="submit">Set Players</button>
                    </form>
                )}

                {method === 'shuffle-btn' && <button id="shuffle-btn" onClick={handleShuffle}>Shuffle & Deal Cards</button>}

                {method === 'set-caller-form' && (
                    <form id="set-caller-form" ref={setCallerFormRef} onSubmit={handleSetCaller}>
                        <h2>Set Caller</h2>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Caller</label>
                            <select name="caller" required style={{ flex: 1 }}>
                                {playerNames.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <button type="submit">Set Caller</button>
                    </form>
                )}

                {method === 'make-call-form' && (
                    <form id="make-call-form" ref={makeCallFormRef} onSubmit={handleMakeCall}>
                        <h2>Make Call</h2>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Caller</label>
                            <select name="caller" required style={{ flex: 1 }} onChange={e => setMakeCallCaller(e.target.value)}>
                                {playerNames.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Callee (Opposite Team)</label>
                            <select name="callee" required style={{ flex: 1 }}>
                                {oppositeTeam.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Card</label>
                            <select name="card" required style={{ flex: 1 }}>
                                {allCards.map(c => <option key={c} value={c}>{cardAlias(c)}</option>)}
                            </select>
                        </div>
                        <button type="submit">Log Call</button>
                    </form>
                )}

                {method === 'pit-drop-form' && (
                    <form id="pit-drop-form" ref={pitDropFormRef} onSubmit={handlePitDrop}>
                        <h2>Pit Drop</h2>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Dropper</label>
                            <select name="dropper" required style={{ flex: 1 }}>
                                {playerNames.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Card</label>
                            <select name="card" required style={{ flex: 1 }}>
                                {allCards.map(c => <option key={c} value={c}>{cardAlias(c)}</option>)}
                            </select>
                        </div>
                        <button type="submit">Log Pit Drop</button>
                    </form>
                )}

                {method === 'pit-burn-form' && (
                    <form id="pit-burn-form" ref={pitBurnFormRef} onSubmit={handlePitBurn}>
                        <h2>Pit Burn</h2>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Burner</label>
                            <select name="burner" required style={{ flex: 1 }}>
                                {playerNames.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Card</label>
                            <select name="card" required style={{ flex: 1 }}>
                                {allCards.map(c => <option key={c} value={c}>{cardAlias(c)}</option>)}
                            </select>
                        </div>
                        <button type="submit">Log Pit Burn</button>
                    </form>
                )}

                {method === 'pass-card-form' && (
                    <form id="pass-card-form" ref={passCardFormRef} onSubmit={handlePassCard}>
                        <h2>Pass Card</h2>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Passer</label>
                            <select name="passer" required style={{ flex: 1 }} onChange={e => setPasser(e.target.value)}>
                                {playerNames.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Passee (Same Team)</label>
                            <select name="passee" required style={{ flex: 1 }}>
                                {sameTeam.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <button type="submit">Log Pass</button>
                    </form>
                )}

                {method === 'force-shift-form' && (
                    <form id="force-shift-form" ref={forceShiftFormRef} onSubmit={handleForceShift}>
                        <h2>Force Card Shift</h2>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>From</label>
                            <select name="fromPlayer" required style={{ flex: 1 }}>
                                {playerNames.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>To</label>
                            <select name="toPlayer" required style={{ flex: 1 }}>
                                {playerNames.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ minWidth: '120px' }}>Card</label>
                            <select name="card" required style={{ flex: 1 }}>
                                {allCards.map(c => <option key={c} value={c}>{cardAlias(c)}</option>)}
                            </select>
                        </div>
                        <button type="submit">Log Force Shift</button>
                    </form>
                )}

                <div id="event-log-container">
                    <h2>Event Log</h2>
                    <button
                        id="download-logs-btn"
                        type="button"
                        onClick={handleDownloadLogs}
                        disabled={!logs.length}
                    >
                        Download Logs
                    </button>
                    <ol id="log-list">
                        {logs.map((entry, idx) => {
                            const [type, msg] = Object.entries(entry)[0];
                            return <li key={idx}>{`[${type}] ${msg}`}</li>;
                        })}
                    </ol>
                </div>
            </div>

            <div id="teams-layout">
                {teamA.map((p, i) => (
                    <div id={teamAIds[i]} key={p} className={`player-panel team-a ${game.caller === p ? 'is-caller' : ''}`} data-pos={i}>
                        {p && (
                            <>
                                <div className="player-name">
                                    <strong>{p}</strong>
                                    {game.caller === p && <span className="caller-chip">Caller</span>}
                                </div>
                                <PlayerCardGrid
                                    playerName={p}
                                    cards={sortCards(players[p] || [])}
                                    cardScale={0.23}
                                    draggableEnabled={method === 'make-call-form'}
                                    onCardDragStart={dragDrop.onCardDragStart}
                                    onCardDragEnd={dragDrop.onCardDragEnd}
                                    onPanelDragOver={dragDrop.onPanelDragOver}
                                    onPanelDrop={dragDrop.onPanelDrop}
                                    title={sortCards(players[p] || []).map(cardAlias).join(', ')}
                                />
                            </>
                        )}
                    </div>
                ))}
                {teamB.map((p, i) => (
                    <div id={teamBIds[i]} key={p} className={`player-panel team-b ${game.caller === p ? 'is-caller' : ''}`} data-pos={i}>
                        {p && (
                            <>
                                <div className="player-name">
                                    <strong>{p}</strong>
                                    {game.caller === p && <span className="caller-chip">Caller</span>}
                                </div>
                                <PlayerCardGrid
                                    playerName={p}
                                    cards={sortCards(players[p] || [])}
                                    cardScale={0.23}
                                    draggableEnabled={method === 'make-call-form'}
                                    onCardDragStart={dragDrop.onCardDragStart}
                                    onCardDragEnd={dragDrop.onCardDragEnd}
                                    onPanelDragOver={dragDrop.onPanelDragOver}
                                    onPanelDrop={dragDrop.onPanelDrop}
                                    title={sortCards(players[p] || []).map(cardAlias).join(', ')}
                                />
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Game;
