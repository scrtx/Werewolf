const globals = require("../config/globals")

/* The purpose of this component is to only return the game state information that is necessary. For example, we only want to return player role information
    to moderators. This avoids any possibility of a player having access to information that they shouldn't.
 */
const GameStateCurator = {
    getGameStateFromPerspectiveOfPerson: (game, person, gameRunner, socket, logger) => {
        return getGameStateBasedOnPermissions(game, person, gameRunner);
    }
}

function getGameStateBasedOnPermissions(game, person, gameRunner) {
    let client = game.status === globals.STATUS.LOBBY // people won't be able to know their role until past the lobby stage.
        ? { name: person.name, cookie: person.cookie, userType: person.userType }
        : {
            name: person.name,
            id: person.id,
            cookie: person.cookie,
            userType: person.userType,
            gameRole: person.gameRole,
            gameRoleDescription: person.gameRoleDescription,
            alignment: person.alignment,
            out: person.out
        }
    switch (person.userType) {
        case globals.USER_TYPES.PLAYER:
        case globals.USER_TYPES.KILLED_PLAYER:
            return {
                accessCode: game.accessCode,
                status: game.status,
                moderator: mapPerson(game.moderator),
                client: client,
                deck: game.deck,
                people: game.people
                    .filter((person) => {
                        return person.assigned === true
                            && (person.userType !== globals.USER_TYPES.MODERATOR && person.userType !== globals.USER_TYPES.TEMPORARY_MODERATOR)
                    })
                    .map((filteredPerson) => mapPerson(filteredPerson)),
                timerParams: game.timerParams,
                isFull: game.isFull,
            }
        case globals.USER_TYPES.MODERATOR:
            return {
                accessCode: game.accessCode,
                status: game.status,
                moderator: mapPerson(game.moderator),
                client: client,
                deck: game.deck,
                people: mapPeopleForModerator(game.people, client),
                timerParams: game.timerParams,
                isFull: game.isFull
            }
        case globals.USER_TYPES.TEMPORARY_MODERATOR:
            return {
                accessCode: game.accessCode,
                status: game.status,
                moderator: mapPerson(game.moderator),
                client: client,
                deck: game.deck,
                people: mapPeopleForTempModerator(game.people, client),
                timerParams: game.timerParams,
                isFull: game.isFull
            }
        default:
            break;
    }
}

function mapPeopleForModerator(people, client) {
    return people
        .filter((person) => {
            return person.assigned === true && person.cookie !== client.cookie
        })
        .map((person) => ({
        name: person.name,
        id: person.id,
        userType: person.userType,
        gameRole: person.gameRole,
        gameRoleDescription: person.gameRoleDescription,
        alignment: person.alignment,
        out: person.out,
        revealed: person.revealed
    }));
}

function mapPeopleForTempModerator(people, client) {
    return people
        .filter((person) => {
            return person.assigned === true && person.cookie !== client.cookie
        })
        .map((person) => ({
            name: person.name,
            id: person.id,
            userType: person.userType,
            out: person.out,
            revealed: person.revealed
        }));
}

function mapPerson(person) {
    if (person.revealed) {
        return {
            name: person.name,
            id: person.id,
            userType: person.userType,
            out: person.out,
            revealed: person.revealed,
            gameRole: person.gameRole,
            alignment: person.alignment
        };
    } else {
        return { name: person.name, id: person.id, userType: person.userType, out: person.out, revealed: person.revealed };
    }
}

module.exports = GameStateCurator;
