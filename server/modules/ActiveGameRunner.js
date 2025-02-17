const { fork } = require('child_process');
const path = require('path');
const globals = require('../config/globals');

class ActiveGameRunner {
    constructor (logger) {
        this.activeGames = new Map();
        this.timerThreads = {};
        this.logger = logger;
    }

    /* We're only going to fork a child process for games with a timer. They will report back to the parent process whenever
        the timer is up.
     */
    runGame = (game, namespace) => {
        this.logger.debug('running game ' + game.accessCode);
        const gameProcess = fork(path.join(__dirname, '/GameProcess.js'));
        this.timerThreads[game.accessCode] = gameProcess;
        gameProcess.on('message', (msg) => {
            switch (msg.command) {
                case globals.GAME_PROCESS_COMMANDS.END_TIMER:
                    game.timerParams.paused = false;
                    game.timerParams.timeRemaining = 0;
                    this.logger.trace('PARENT: END TIMER');
                    break;
                case globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER:
                    game.timerParams.paused = true;
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.trace('PARENT: PAUSE TIMER');
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER, game.timerParams.timeRemaining);
                    break;
                case globals.GAME_PROCESS_COMMANDS.RESUME_TIMER:
                    game.timerParams.paused = false;
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.trace('PARENT: RESUME TIMER');
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.RESUME_TIMER, game.timerParams.timeRemaining);
                    break;
                case globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING:
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.trace('PARENT: GET TIME REMAINING');
                    namespace.to(msg.socketId).emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, game.timerParams.timeRemaining, game.timerParams.paused);
                    break;
            }
        });

        gameProcess.on('exit', () => {
            this.logger.debug('Game ' + game.accessCode + ' timer has expired.');
            delete this.timerThreads[game.accessCode];
        });
        gameProcess.send({
            command: globals.GAME_PROCESS_COMMANDS.START_TIMER,
            accessCode: game.accessCode,
            logLevel: this.logger.logLevel,
            hours: game.timerParams.hours,
            minutes: game.timerParams.minutes
        });
        game.startTime = new Date().toJSON();
    };
}

class Singleton {
    constructor (logger) {
        if (!Singleton.instance) {
            logger.info('CREATING SINGLETON ACTIVE GAME RUNNER');
            Singleton.instance = new ActiveGameRunner(logger);
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}

module.exports = Singleton;
