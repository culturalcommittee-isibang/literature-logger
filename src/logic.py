import random
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MINOR_HEARTS = [f"{i}" + "H" for i in range(2, 7+1)]
MINOR_DIAMONDS = [f"{i}" + "D" for i in range(2, 7+1)]
MINOR_SPADES = [f"{i}" + "S" for i in range(2, 7+1)]
MINOR_CLUBS = [f"{i}" + "C" for i in range(2, 7+1)]
MAJOR_HEARTS = [f"{i}" + "H" for i in range(9, 10+1)] + ["JH", "QH", "KH", "AH"]
MAJOR_DIAMONDS = [f"{i}" + "D" for i in range(9, 10+1)] + ["JD", "QD", "KD", "AD"]
MAJOR_SPADES = [f"{i}" + "S" for i in range(9, 10+1)] + ["JS", "QS", "KS", "AS"]
MAJOR_CLUBS = [f"{i}" + "C" for i in range(9, 10+1)] + ["JC", "QC", "KC", "AC"]
EIGHTS = ["8H", "8D", "8S", "8C", "JJ", "JG"]
ALL_CARDS = MINOR_HEARTS + MINOR_DIAMONDS + MINOR_SPADES + MINOR_CLUBS + MAJOR_HEARTS + MAJOR_DIAMONDS + MAJOR_SPADES + MAJOR_CLUBS + EIGHTS


# Helper function to find the pit of a card.
def find_pit(card):
    if card in MINOR_HEARTS:
        return "MINOR_HEARTS", MINOR_HEARTS
    elif card in MINOR_DIAMONDS:
        return "MINOR_DIAMONDS", MINOR_DIAMONDS
    elif card in MINOR_SPADES:
        return "MINOR_SPADES", MINOR_SPADES
    elif card in MINOR_CLUBS:
        return "MINOR_CLUBS", MINOR_CLUBS
    elif card in MAJOR_HEARTS:
        return "MAJOR_HEARTS", MAJOR_HEARTS
    elif card in MAJOR_DIAMONDS:
        return "MAJOR_DIAMONDS", MAJOR_DIAMONDS
    elif card in MAJOR_SPADES:
        return "MAJOR_SPADES", MAJOR_SPADES
    elif card in MAJOR_CLUBS:
        return "MAJOR_CLUBS", MAJOR_CLUBS
    elif card in EIGHTS:
        return "EIGHTS", EIGHTS
    else:
        return "UNKNOWN"
    
def find_team(player, teams):
    for team, members in teams.items():
        if player in members:
            return team
    return None


class GameState:
    def __init__(self):
        self.players = {}
        self.teams = {}
        self.caller = None
        self.dropped_pits = []
        self.logs = []

    # Set the player names in the game.
    def set_players(self, player_1A = None, player_1B = None, player_1C = None, player_2A = None, player_2B = None, player_2C = None):
        self.players = {
            player_1A : [],
            player_1B : [],
            player_1C : [],
            player_2A : [],
            player_2B : [],
            player_2C : []
        }
        self.teams["team_1"] = {
            player_1A : {"pits_dropped" : [], "pits_burned" : []},
            player_1B : {"pits_dropped" : [], "pits_burned" : []},
            player_1C : {"pits_dropped" : [], "pits_burned" : []},
            "total_pits" : 0
        }
        self.teams["team_2"] = {
            player_2A : {"pits_dropped" : [], "pits_burned" : []},
            player_2B : {"pits_dropped" : [], "pits_burned" : []},
            player_2C : {"pits_dropped" : [], "pits_burned" : []},
            "total_pits" : 0
        }

    # Distribute 9 cards to each player.
    def set_shuffle_cards(self):
        deck = ALL_CARDS.copy()
        random.shuffle(deck)

        player_names = list(self.players.keys())
        cards_per_player = 9

        for i, player in enumerate(player_names):
            start = i * cards_per_player
            end = start + cards_per_player
            self.players[player] = deck[start:end]

        logging.info("Cards shuffled and dealt to players.")

        self.logs.append({"INITIAL":"Shuffled cards to players."})

    # Set the current caller. Use only at start of game.
    def set_caller(self, player):
        if player not in self.players:
            raise ValueError("Player not found in the game state.")
        self.caller = player
        logging.info(f"Caller set to {player}.")
        self.logs.append({"CALLER_SET":f"Caller set to {player}."})

    # Log a call.
    def make_call(self, caller, callee, card):
        # Caller has to make the call.
        if caller != self.caller:
            raise ValueError("Check caller again!")
        
        # Players must exist.
        if caller not in self.players or callee not in self.players:
            raise ValueError("Caller or callee not found in the game state.")
        
        # Ensure calls can only be made to players on the other team.
        caller_team = find_team(caller, self.teams)
        callee_team = find_team(callee, self.teams)
        if caller_team == callee_team:
            raise ValueError("Calls can only be made to players on the other team.")

        if card not in ALL_CARDS:
            raise ValueError("Check card again!")
        
        pit, _ = find_pit(card)
        if pit == "UNKNOWN":
            raise ValueError("Card not found in any pit.")
        
        # Caller called a card they have: pit burn.
        if card in self.players[caller]:
            logging.warning(f"Possible pit burn: {pit}.")
            logging.warning("Reason: Caller called a card they have.")

        # Caller has no card from that pit: pit burn.
        if set(pit).isdisjoint(self.players[caller]):
            logging.warning(f"Possible pit burn: {pit}")
            logging.warning("Reason: Caller has no card from the pit called")

        # If callee has the card, transfer it to the caller.
        if card in self.players[callee]:
            self.players[callee].remove(card)
            self.players[caller].append(card)
            logging.info(f"Card {card} transferred from {callee} to {caller}.")
            self.logs.append({"CALL":f"{caller} called {callee} for {card}."})

        else:
            self.caller = callee
            logging.info(f"Caller shifted to {callee} as they do not have the card {card}.")
            self.logs.append({"CALL":f"{caller} called {callee} for {card}."})


    # Set a pit burn.
    def set_pit_burn(self, burner, card):
        pit, pit_cards = find_pit(card)
        if pit == "UNKNOWN":
            raise ValueError("Card not found in any pit.")
        
        # Player must exist.
        if burner not in self.players:
            raise ValueError("Burner not found in the game state.")

        # Remove all cards from all players' hands that belong to the pit.
        for player in self.players:
            self.players[player] = [c for c in self.players[player] if c not in pit_cards]

        # Add the pit to the dropped pits list.
        if pit not in self.dropped_pits:
            self.dropped_pits.append(pit)
            # Append the burned pit to the player's record in self.teams.
            team = find_team(burner, self.teams)
            if team is None:
                raise ValueError("Burner not found in any team.")

            self.teams[team][burner]["pits_burned"].append(pit)

            # Add a pits_dropped point for the opposing team.
            opposing_team = "team_1" if team == "team_2" else "team_2"
            self.teams[opposing_team]["total_pits"] += 1

        logging.info(f"Pit {pit} burned by {burner}.")
        self.logs.append({"BURN":f"{burner} burned pit {pit}."})


    # Set a pit drop.
    def set_pit_drop(self, dropper, card):
        pit, pit_cards = find_pit(card)
        if pit == "UNKNOWN":
            logging.error("Card not found in any pit.")
            raise ValueError("Card not found in any pit.")
        
        if dropper not in self.players:
            logging.error("Dropper not found in the game state.")
            raise ValueError("Dropper not found in the game state.")

        if pit in self.dropped_pits:
            logging.warning(f"Pit {pit} has already been dropped.")
            return

        # Remove all cards from all players' hands that belong to the pit.
        for player in self.players:
            self.players[player] = [c for c in self.players[player] if c not in pit_cards]

        # Add the pit to the dropped pits list.
        if pit not in self.dropped_pits:
            self.dropped_pits.append(pit)
            # Append the dropped pit to the player's record in self.teams.
            team = find_team(dropper, self.teams)
            if team is None:
                raise ValueError("Dropper not found in any team.")

            self.teams[team][dropper]["pits_dropped"].append(pit)

            # Increment the team's total pits count.
            self.teams[team]["total_pits"] += 1

        logging.info(f"Pit {pit} dropped by {dropper}.")
        self.logs.append({"DROP":f"{dropper} dropped pit {pit}."})

    
    def pass_card(self, passer, passee):
        # Passer must be the current caller.
        if passer != self.caller:
            logging.error("Passer must be the current caller.")
            raise ValueError("Passer must be the current caller.")

        # Both passer and passee must exist in the game.
        if passer not in self.players or passee not in self.players:
            logging.error("Passer or passee not found in the game state.")
            raise ValueError("Passer or passee not found in the game state.")
        
        # Ensure cards can only be passed to players on the same team.
        passer_team = find_team(passer, self.teams)
        passee_team = find_team(passee, self.teams)
        if passer_team != passee_team:
            logging.error("Cards can only be passed to players on the same team.")
            raise ValueError("Cards can only be passed to players on the same team.")

        # Passer must have exactly one card to pass.
        if len(self.players[passer]) != 1:
            logging.error("Passer must have exactly one card to pass.")
            raise ValueError("Passer must have exactly one card to pass.")

        # Transfer the card from passer to passee.
        card = self.players[passer].pop()
        self.players[passee].append(card)
        logging.info(f"Card {card} passed from {passer} to {passee}.")

        # Set the passee as the new caller.
        self.caller = passee
        logging.info(f"Caller shifted to {passee}.")
        self.logs.append({"PASS":f"{passer} passed card {card} to {passee}."})


    # Use if mismatch of cards.
    def force_card_shift(self, from_player, to_player, card):
        # Both players must exist in the game.
        if from_player not in self.players or to_player not in self.players:
            logging.error("Both players must be in the game.")
            raise ValueError("Both players must be in the game.")

        if card not in self.players[from_player]:
            logging.error(f"Card {card} not found in {from_player}'s hand.")
            raise ValueError(f"Card {card} not found in {from_player}'s hand.")

        # Transfer all cards from the from_player to the to_player.
        if card in self.players[from_player]:
            self.players[to_player].append(card)
            self.players[from_player].remove(card)
            logging.info(f"Card {card} transferred from {from_player} to {to_player}.")
            self.logs.append({"FORCE_SHIFT":f"Clean-up; shifted {card} from {from_player} to {to_player}."})

        else:
            raise ValueError(f"Card {card} not found in {from_player}'s hand.")
    
    # Reset the game state for a new game.
    def reset_game_state(self):
        self.players = {}
        self.teams = {}
        self.caller = None
        self.dropped_pits = []
        self.logs = []
        logging.info("Game state has been reset.")

