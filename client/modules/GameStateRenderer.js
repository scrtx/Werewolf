import { globals } from "../config/globals.js";
import { toast } from "./Toast.js";
import {templates} from "./Templates.js";

export class GameStateRenderer {
    constructor(gameState, socket) {
        this.gameState = gameState;
        this.socket = socket;
        this.killPlayerHandlers = {};
        this.cardFlipped = false;
    }

    renderLobbyPlayers() {
        document.querySelectorAll('.lobby-player').forEach((el) => el.remove())
        let lobbyPlayersContainer = document.getElementById("lobby-players");
        if (this.gameState.client.userType === globals.USER_TYPES.PLAYER) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(this.gameState.moderator.name, this.gameState.moderator.userType))
        }
        for (let person of this.gameState.people) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(person.name,person.userType))
        }
        let playerCount = this.gameState.people.filter((person) => person.userType === globals.USER_TYPES.PLAYER).length;
        if (this.gameState.moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
            playerCount += 1;
        }
        if (this.gameState.client.userType === globals.USER_TYPES.PLAYER) {
            playerCount += 1;
        }
        document.querySelector("label[for='lobby-players']").innerText =
            "People (" + playerCount + "/" + getGameSize(this.gameState.deck) + " Players)";
    }

    renderLobbyHeader() {
        removeExistingTitle();
        let title = document.createElement("h1");
        title.innerText = "Lobby";
        document.getElementById("game-title").appendChild(title);
        let gameLinkContainer = document.getElementById("game-link");
        gameLinkContainer.innerText = window.location;
        gameLinkContainer.addEventListener('click', () => {
            navigator.clipboard.writeText(gameLinkContainer.innerText).then(() => {
                toast('Link copied!', 'success', true);
            });
        });
        let copyImg = document.createElement("img");
        copyImg.setAttribute("src", "../images/copy.svg");
        gameLinkContainer.appendChild(copyImg);
    }

    renderLobbyFooter() {
        let gameDeckContainer = document.getElementById("game-deck");
        for (let card of this.gameState.deck) {
            let cardEl = document.createElement("div");
            cardEl.innerText = card.quantity + 'x ' + card.role;
            cardEl.classList.add('lobby-card')
        }
    }

    renderGameHeader() {
        removeExistingTitle();
        // let title = document.createElement("h1");
        // title.innerText = "Game";
        // document.getElementById("game-title").appendChild(title);
    }

    renderModeratorView() {
        let div = document.createElement("div");
        div.innerHTML = templates.END_GAME_PROMPT;
        document.body.appendChild(div);
        this.renderPlayersWithRoleAndAlignmentInfo();
    }

    renderPlayerView() {
        renderPlayerRole(this.gameState);
        this.renderPlayersWithNoRoleInformation();
    }

    refreshPlayerList(isModerator) {
        if (isModerator) {
            this.renderPlayersWithRoleAndAlignmentInfo()
        } else {
            this.renderPlayersWithNoRoleInformation();
        }
    }

    renderPlayersWithRoleAndAlignmentInfo() {
        document.querySelectorAll('.game-player').forEach((el) => {
            let pointer = el.dataset.pointer;
            if (pointer && this.killPlayerHandlers[pointer]) {
                el.removeEventListener('click', this.killPlayerHandlers[pointer])
            }
            el.remove();
        });
        this.gameState.people.sort((a, b) => {
            return a.name >= b.name ? 1 : -1;
        });
        let teamGood = this.gameState.people.filter((person) => person.alignment === globals.ALIGNMENT.GOOD);
        let teamEvil = this.gameState.people.filter((person) => person.alignment === globals.ALIGNMENT.EVIL);
        renderGroupOfPlayers(teamEvil, this.killPlayerHandlers, this.gameState.accessCode, globals.ALIGNMENT.EVIL, true, this.socket);
        renderGroupOfPlayers(teamGood, this.killPlayerHandlers, this.gameState.accessCode, globals.ALIGNMENT.GOOD, true, this.socket);
        document.getElementById("players-alive-label").innerText =
            'Players: ' + this.gameState.people.filter((person) => !person.out).length + ' / ' + this.gameState.people.length + ' Alive';

    }

    renderPlayersWithNoRoleInformation() {
        document.querySelectorAll('.game-player').forEach((el) => el.remove());
        this.gameState.people.sort((a, b) => {
            return a.name >= b.name ? 1 : -1;
        });
        renderGroupOfPlayers(this.gameState.people, this.killPlayerHandlers);
        document.getElementById("players-alive-label").innerText =
            'Players: ' + this.gameState.people.filter((person) => !person.out).length + ' / ' + this.gameState.people.length + ' Alive';

    }

}

function renderLobbyPerson(name, userType) {
    let el = document.createElement("div");
    let personNameEl = document.createElement("div");
    let personTypeEl = document.createElement("div");
    personNameEl.innerText = name;
    personTypeEl.innerText = userType + globals.USER_TYPE_ICONS[userType];
    el.classList.add('lobby-player');

    el.appendChild(personNameEl);
    el.appendChild(personTypeEl);

    return el;
}

function getGameSize(cards) {
    let quantity = 0;
    for (let card of cards) {
        quantity += card.quantity;
    }

    return quantity;
}

function removeExistingTitle() {
    let existingTitle = document.querySelector('#game-title h1');
    if (existingTitle) {
        existingTitle.remove();
    }
}

function renderGroupOfPlayers(players, handlers, accessCode=null, alignment=null, moderator=false, socket=null) {
    for (let player of players) {
        let container = document.createElement("div");
        container.classList.add('game-player');
        container.dataset.pointer = player.id;
        if (alignment) {
            container.innerHTML = templates.MODERATOR_PLAYER;
        } else {
            container.innerHTML = templates.GAME_PLAYER;
        }
        container.querySelector('.game-player-name').innerText = player.name;
        let roleElement = container.querySelector('.game-player-role')

        if (alignment) {
            roleElement.classList.add(alignment);
            roleElement.innerText = player.gameRole;
            document.getElementById("player-list-moderator-team-" + alignment).appendChild(container);
        } else {
            roleElement.innerText = "Unknown"
            document.getElementById("game-player-list").appendChild(container);
        }

        if (player.out) {
            container.classList.add('killed');
            if (moderator) {
                container.querySelector('.kill-player-button')?.remove();
            }
        } else {
            if (moderator) {
                handlers[player.id] = () => {
                    if (confirm("KILL " + player.name + "?")) {
                        socket.emit(globals.COMMANDS.KILL_PLAYER, accessCode, player.id);
                    }
                }
                container.querySelector('.kill-player-button').addEventListener('click', handlers[player.id]);
            }
        }
    }
}

function renderPlayerRole(gameState) {
    let name = document.querySelector('#role-name');
    name.innerText = gameState.client.gameRole;
    if (gameState.client.alignment === globals.ALIGNMENT.GOOD) {
        name.classList.add('good');
    } else {
        name.classList.add('evil');
    }
    name.setAttribute("title", gameState.client.gameRole);
    if (gameState.client.out) {
        document.querySelector('#role-description').innerText = "You have been killed.";
        document.getElementById("role-image").setAttribute(
            'src',
            '../images/tombstone.png'
        );
    } else {
        document.querySelector('#role-description').innerText = gameState.client.gameRoleDescription;
        document.getElementById("role-image").setAttribute(
            'src',
            '../images/roles/' + gameState.client.gameRole.replaceAll(' ', '') + '.png'
        );
    }

    document.getElementById("game-role-back").addEventListener('click', () => {
        document.getElementById("game-role").style.display = 'flex';
        document.getElementById("game-role-back").style.display = 'none';
    });

    document.getElementById("game-role").addEventListener('click', () => {
        document.getElementById("game-role-back").style.display = 'flex';
        document.getElementById("game-role").style.display = 'none';
    });
}
