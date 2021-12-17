export const globals = {
    USER_SIGNATURE_LENGTH: 25,
    CLOCK_TICK_INTERVAL_MILLIS: 10,
    TOAST_DURATION_DEFAULT: 6,
    ACCESS_CODE_LENGTH: 6,
    PLAYER_ID_COOKIE_KEY: 'play-werewolf-anon-id',
    ACCESS_CODE_CHAR_POOL: 'abcdefghijklmnopqrstuvwxyz0123456789',
    COMMANDS: {
        FETCH_GAME_STATE: 'fetchGameState',
        GET_ENVIRONMENT: 'getEnvironment',
        START_GAME: 'startGame',
        PAUSE_TIMER: 'pauseTimer',
        RESUME_TIMER: 'resumeTimer',
        GET_TIME_REMAINING: 'getTimeRemaining',
        KILL_PLAYER: 'killPlayer',
        REVEAL_PLAYER: 'revealPlayer',
        TRANSFER_MODERATOR: 'transferModerator'
    },
    STATUS: {
        LOBBY: "lobby",
        IN_PROGRESS: "in progress"
    },
    ALIGNMENT: {
        GOOD: "good",
        EVIL: "evil"
    },
    EVENTS: {
        PLAYER_JOINED: "playerJoined",
        SYNC_GAME_STATE: "syncGameState",
        START_TIMER: "startTimer",
        KILL_PLAYER: "killPlayer",
        REVEAL_PLAYER: 'revealPlayer'
    },
    USER_TYPES: {
        MODERATOR: "moderator",
        PLAYER: "player",
        TEMPORARY_MODERATOR: "player / temp mod",
        KILLED_PLAYER: "killed",
        SPECTATOR: "spectator"
    },
    ENVIRONMENT: {
        LOCAL: "local",
        PRODUCTION: "production"
    },
    USER_TYPE_ICONS: {
        player: ' \uD83C\uDFAE',
        moderator: ' \uD83D\uDC51',
        'player / temp mod': ' \uD83C\uDFAE\uD83D\uDC51',
        spectator: ' \uD83D\uDC7B'
    }
};
