import { Game } from '../../model/Game.js';
import { cancelCurrentToast, toast } from '../front_end_components/Toast.js';
import { ModalManager } from '../front_end_components/ModalManager.js';
import { XHRUtility } from '../utility/XHRUtility.js';
import { globals } from '../../config/globals.js';
import { HTMLFragments } from '../front_end_components/HTMLFragments.js';
import { UserUtility } from '../utility/UserUtility.js';
import { RoleBox } from './RoleBox.js';

export class GameCreationStepManager {
    constructor (deckManager) {
        this.step = 1;
        this.currentGame = new Game(null, null, null, null);
        this.deckManager = deckManager;
        this.roleBox = null;
        this.defaultBackHandler = () => {
            cancelCurrentToast();
            this.removeStepElementsFromDOM(this.step);
            this.decrementStep();
            this.renderStep('creation-step-container', this.step);
        };
        this.steps = {
            1: {
                title: 'Select your method of moderation:',
                forwardHandler: () => {
                    if (this.currentGame.hasDedicatedModerator !== null) {
                        cancelCurrentToast();
                        this.removeStepElementsFromDOM(this.step);
                        this.incrementStep();
                        this.renderStep('creation-step-container', this.step);
                    } else {
                        toast('You must select a moderation option.', 'error', true);
                    }
                }
            },
            2: {
                title: 'Create your deck of cards:',
                forwardHandler: () => {
                    if (this.deckManager.getDeckSize() >= 3 && this.deckManager.getDeckSize() <= 50) {
                        this.currentGame.deck = this.deckManager.deck.filter((card) => card.quantity > 0);
                        cancelCurrentToast();
                        this.removeStepElementsFromDOM(this.step);
                        this.incrementStep();
                        this.renderStep('creation-step-container', this.step);
                    } else {
                        toast('You must have a deck for between 3 and 50 players', 'error', true);
                    }
                },
                backHandler: this.defaultBackHandler
            },
            3: {
                title: 'Set an optional timer:',
                forwardHandler: (e) => {
                    if (e.type === 'click' || e.code === 'Enter') {
                        const hours = parseInt(document.getElementById('game-hours').value);
                        const minutes = parseInt(document.getElementById('game-minutes').value);
                        if ((isNaN(hours) && isNaN(minutes))
                            || (isNaN(hours) && minutes > 0 && minutes < 60)
                            || (isNaN(minutes) && hours > 0 && hours < 6)
                            || (hours === 0 && minutes > 0 && minutes < 60)
                            || (minutes === 0 && hours > 0 && hours < 6)
                            || (hours > 0 && hours < 6 && minutes >= 0 && minutes < 60)
                        ) {
                            if (hasTimer(hours, minutes)) {
                                this.currentGame.hasTimer = true;
                                this.currentGame.timerParams = {
                                    hours: hours,
                                    minutes: minutes
                                };
                            } else {
                                this.currentGame.hasTimer = false;
                                this.currentGame.timerParams = null;
                            }
                            cancelCurrentToast();
                            this.removeStepElementsFromDOM(this.step);
                            this.incrementStep();
                            this.renderStep('creation-step-container', this.step);
                        } else {
                            if (hours === 0 && minutes === 0) {
                                toast('You must enter a non-zero amount of time.', 'error', true);
                            } else {
                                toast('Invalid timer options. Hours can be a max of 5, Minutes a max of 59.', 'error', true);
                            }
                        }
                    }
                },
                backHandler: this.defaultBackHandler
            },
            4: {
                title: 'Enter your name:',
                forwardHandler: (e) => {
                    if (e.type === 'click' || e.code === 'Enter') {
                        const name = document.getElementById('moderator-name').value;
                        if (validateName(name)) {
                            this.currentGame.moderatorName = name;
                            this.removeStepElementsFromDOM(this.step);
                            this.incrementStep();
                            this.renderStep('creation-step-container', this.step);
                        } else {
                            toast('Name must be between 1 and 30 characters.', 'error', true);
                        }
                    }
                },
                backHandler: this.defaultBackHandler
            },
            5: {
                title: 'Review and submit:',
                backHandler: this.defaultBackHandler,
                forwardHandler: () => {
                    const button = document.getElementById('create-game');
                    button.removeEventListener('click', this.steps['5'].forwardHandler);
                    button.classList.add('submitted');
                    button.innerText = 'Creating...';
                    const restoreButton = () => {
                        button.innerText = 'Create';
                        button.classList.remove('submitted');
                        button.addEventListener('click', this.steps['5'].forwardHandler);
                    };
                    XHRUtility.xhr(
                        '/api/games/create',
                        'POST',
                        null,
                        JSON.stringify(
                            new Game(
                                this.currentGame.deck.filter((card) => card.quantity > 0),
                                this.currentGame.hasTimer,
                                this.currentGame.hasDedicatedModerator,
                                this.currentGame.moderatorName,
                                this.currentGame.timerParams
                            )
                        )
                    )
                        .then((res) => {
                            if (res.status === 201) {
                                try {
                                    const json = JSON.parse(res.content);
                                    UserUtility.setAnonymousUserId(json.cookie, json.environment);
                                    window.location.replace(
                                        window.location.protocol + '//' + window.location.host +
                                        '/game/' + json.accessCode
                                    );
                                } catch (e) {
                                    restoreButton();
                                    toast(
                                        'There was a problem creating the game. Please contact the developers.',
                                        'error',
                                        true,
                                        true
                                    );
                                }
                            }
                        }).catch((e) => {
                            restoreButton();
                            toast(e.content, 'error', true, true, 'medium');
                            if (e.status === 429) {
                                toast('You\'ve sent this request too many times.', 'error', true, true, 'medium');
                            }
                        });
                }
            }
        };
    }

    incrementStep () {
        if (this.step < Object.keys(this.steps).length) {
            this.step += 1;
        }
    }

    decrementStep () {
        if (this.step > 1) {
            this.step -= 1;
        }
    }

    renderStep (containerId, step) {
        document.querySelectorAll('.animated-placeholder').forEach((el) => el.remove());
        document.querySelectorAll('.placeholder-row').forEach((el) => el.remove());
        document.getElementById('step-title').innerText = this.steps[step].title;
        switch (step) {
            case 1:
                renderModerationTypeStep(this.currentGame, containerId, step);
                showButtons(false, true, this.steps[step].forwardHandler, null);
                break;
            case 2:
                this.renderRoleSelectionStep(this.currentGame, containerId, step, this.deckManager);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler);
                break;
            case 3:
                renderTimerStep(containerId, step, this.currentGame, this.steps);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler);
                break;
            case 4:
                renderNameStep(containerId, step, this.currentGame, this.steps);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler);
                break;
            case 5:
                renderReviewAndCreateStep(containerId, step, this.currentGame, this.deckManager);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler, this.currentGame);
                break;
            default:
                break;
        }
        updateTracker(step);
    }

    removeStepElementsFromDOM (stepNumber) {
        document.getElementById('step-' + stepNumber)?.remove();
    }

    renderRoleSelectionStep = (game, containerId, step, deckManager) => {
        const stepContainer = document.createElement('div');

        setAttributes(stepContainer, { id: 'step-' + step, class: 'flex-row-container-left-align step' });

        stepContainer.innerHTML += HTMLFragments.CREATE_GAME_DECK_STATUS;

        document.getElementById(containerId).appendChild(stepContainer);

        this.roleBox = new RoleBox(stepContainer, deckManager);
        deckManager.roleBox = this.roleBox;
        this.roleBox.loadDefaultRoles();
        this.roleBox.loadCustomRolesFromCookies();
        this.roleBox.displayDefaultRoles(document.getElementById('role-select'));

        deckManager.loadDeckTemplates(this.roleBox);

        const exportHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                e.preventDefault();
                this.roleBox.downloadCustomRoles('play-werewolf-custom-roles', JSON.stringify(
                    this.roleBox.customRoles
                        .map((option) => (
                            { role: option.role, team: option.team, description: option.description, custom: option.custom }
                        ))
                ));
                toast('Custom roles downloading', 'success', true, true);
                document.getElementById('custom-role-actions').style.display = 'none';
            }
        };

        document.querySelector('#custom-roles-export').addEventListener('click', exportHandler);
        document.querySelector('#custom-roles-export').addEventListener('keyup', exportHandler);

        const importHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                e.preventDefault();
                ModalManager.displayModal('upload-custom-roles-modal', 'modal-background', 'close-upload-custom-roles-modal-button');
            }
        };
        document.querySelector('#custom-roles-import').addEventListener('click', importHandler);
        document.querySelector('#custom-roles-import').addEventListener('keyup', importHandler);

        document.getElementById('upload-custom-roles-form').onsubmit = (e) => {
            e.preventDefault();
            const fileList = document.getElementById('upload-custom-roles').files;
            if (fileList.length > 0) {
                const file = fileList[0];
                if (file.size > 1000000) {
                    toast('Your file is too large (max 1MB)', 'error', true, true, 'medium');
                    return;
                }
                if (file.type !== 'text/plain') {
                    toast('Your file must be a text file', 'error', true, true, 'medium');
                    return;
                }

                this.roleBox.loadCustomRolesFromFile(file);
            } else {
                toast('You must upload a text file', 'error', true, true, 'medium');
            }
        };

        const clickHandler = () => {
            const actions = document.getElementById('custom-role-actions');
            if (window.getComputedStyle(actions, null).display !== 'none') {
                actions.style.display = 'none';
            } else {
                actions.style.display = 'block';
            }
        };

        document.getElementById('custom-role-hamburger').addEventListener('click', clickHandler);

        deckManager.updateDeckStatus();

        initializeRemainingEventListeners(deckManager, this.roleBox);
    };
}

function renderNameStep (containerId, step, game, steps) {
    const stepContainer = document.createElement('div');
    setAttributes(stepContainer, { id: 'step-' + step, class: 'flex-row-container step' });

    stepContainer.innerHTML = HTMLFragments.ENTER_NAME_STEP;
    document.getElementById(containerId).appendChild(stepContainer);
    const nameInput = document.querySelector('#moderator-name');
    nameInput.value = game.moderatorName;
    nameInput.addEventListener('keyup', steps['4'].forwardHandler);
}

function renderModerationTypeStep (game, containerId, stepNumber) {
    const stepContainer = document.createElement('div');
    setAttributes(stepContainer, { id: 'step-' + stepNumber, class: 'flex-row-container step' });

    stepContainer.innerHTML =
        "<div tabindex=\"0\" id='moderation-dedicated'>I will be the <strong>dedicated mod.</strong> Don't deal me a card.</div>" +
        "<div tabindex=\"0\" id='moderation-self'>I will be the <strong>temporary mod</strong>. Deal me into the game.</div>";

    const dedicatedOption = stepContainer.querySelector('#moderation-dedicated');
    if (game.hasDedicatedModerator) {
        dedicatedOption.classList.add('option-selected');
    }
    const selfOption = stepContainer.querySelector('#moderation-self');
    if (game.hasDedicatedModerator === false) {
        selfOption.classList.add('option-selected');
    }

    const dedicatedHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            dedicatedOption.classList.add('option-selected');
            selfOption.classList.remove('option-selected');
            game.hasDedicatedModerator = true;
        }
    };

    const tempModHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            selfOption.classList.add('option-selected');
            dedicatedOption.classList.remove('option-selected');
            game.hasDedicatedModerator = false;
        }
    };

    dedicatedOption.addEventListener('click', dedicatedHandler);
    dedicatedOption.addEventListener('keyup', dedicatedHandler);

    selfOption.addEventListener('click', tempModHandler);
    selfOption.addEventListener('keyup', tempModHandler);

    document.getElementById(containerId).appendChild(stepContainer);
}

function renderTimerStep (containerId, stepNumber, game, steps) {
    const div = document.createElement('div');
    div.setAttribute('id', 'step-' + stepNumber);
    div.classList.add('step');

    const timeContainer = document.createElement('div');
    timeContainer.setAttribute('id', 'game-time');

    const hoursDiv = document.createElement('div');
    const hoursLabel = document.createElement('label');
    hoursLabel.setAttribute('for', 'game-hours');
    hoursLabel.innerText = 'Hours (max 5)';
    const hours = document.createElement('input');
    hours.addEventListener('keyup', steps[stepNumber].forwardHandler);
    setAttributes(hours, { type: 'number', id: 'game-hours', name: 'game-hours', min: '0', max: '5', value: game.timerParams?.hours });

    const minutesDiv = document.createElement('div');
    const minsLabel = document.createElement('label');
    minsLabel.setAttribute('for', 'game-minutes');
    minsLabel.innerText = 'Minutes';
    const minutes = document.createElement('input');
    minutes.addEventListener('keyup', steps[stepNumber].forwardHandler);
    setAttributes(minutes, { type: 'number', id: 'game-minutes', name: 'game-minutes', min: '1', max: '60', value: game.timerParams?.minutes });

    hoursDiv.appendChild(hoursLabel);
    hoursDiv.appendChild(hours);
    minutesDiv.appendChild(minsLabel);
    minutesDiv.appendChild(minutes);
    timeContainer.appendChild(hoursDiv);
    timeContainer.appendChild(minutesDiv);
    div.appendChild(timeContainer);

    document.getElementById(containerId).appendChild(div);
}

function renderReviewAndCreateStep (containerId, stepNumber, game, deckManager) {
    const div = document.createElement('div');
    div.setAttribute('id', 'step-' + stepNumber);
    div.classList.add('step');

    div.innerHTML =
        '<div>' +
            "<label for='mod-name'>Your name</label>" +
            "<div id='mod-name' class='review-option'></div>" +
        '</div>' +
        '<div>' +
            "<label for='mod-option'>Moderation</label>" +
            "<div id='mod-option' class='review-option'></div>" +
        '</div>' +
        '<div>' +
            "<label for='timer-option'>Timer</label>" +
            "<div id='timer-option' class='review-option'></div>" +
        '</div>' +
        '<div>' +
            "<label id='roles-option-label' for='roles-option'>Game Deck</label>" +
            "<div id='roles-option' class='review-option'></div>" +
        '</div>';

    div.querySelector('#mod-option').innerText = game.hasDedicatedModerator
        ? "Dedicated Moderator - don't deal me a card."
        : 'Temporary Moderator - deal me into the game.';

    if (game.hasTimer) {
        const formattedHours = !isNaN(game.timerParams.hours)
            ? game.timerParams.hours + ' Hours'
            : '0 Hours';

        const formattedMinutes = !isNaN(game.timerParams.minutes)
            ? game.timerParams.minutes + ' Minutes'
            : '0 Minutes';

        div.querySelector('#timer-option').innerText = formattedHours + ' ' + formattedMinutes;
    } else {
        div.querySelector('#timer-option').innerText = 'untimed';
    }

    for (const card of game.deck) {
        const roleEl = document.createElement('div');
        roleEl.innerText = card.quantity + 'x ' + card.role;
        if (card.team === globals.ALIGNMENT.GOOD) {
            roleEl.classList.add(globals.ALIGNMENT.GOOD);
        } else {
            roleEl.classList.add(globals.ALIGNMENT.EVIL);
        }
        div.querySelector('#roles-option').appendChild(roleEl);
    }

    div.querySelector('#roles-option-label').innerText += ' (' + deckManager.getDeckSize() + ' Players)';
    div.querySelector('#mod-name').innerText = game.moderatorName;

    document.getElementById(containerId).appendChild(div);
}

function setAttributes (element, attributeObject) {
    for (const key of Object.keys(attributeObject)) {
        element.setAttribute(key, attributeObject[key]);
    }
}

function updateTracker (step) {
    document.querySelectorAll('.creation-step').forEach((element, i) => {
        if ((i + 1) <= step) {
            element.classList.add('creation-step-filled');
        } else {
            element.classList.remove('creation-step-filled');
        }
    });
}

function showButtons (back, forward, forwardHandler, backHandler, builtGame = null) {
    document.querySelectorAll('.tracker-placeholder').forEach((el) => el.remove());
    document.querySelector('#step-back-button')?.remove();
    document.querySelector('#step-forward-button')?.remove();
    document.querySelector('#create-game')?.remove();
    if (back) {
        const backButton = document.createElement('button');
        backButton.innerHTML = '<img alt="back" src="../../images/caret-back.svg"/>';
        backButton.addEventListener('click', backHandler);
        backButton.setAttribute('id', 'step-back-button');
        backButton.classList.add('cancel');
        backButton.classList.add('app-button');
        document.getElementById('tracker-container').prepend(backButton);
    }

    if (forward && builtGame === null) {
        const fwdButton = document.createElement('button');
        fwdButton.innerHTML = '<img alt="next" src="../../images/caret-forward.svg"/>';
        fwdButton.addEventListener('click', forwardHandler);
        fwdButton.setAttribute('id', 'step-forward-button');
        fwdButton.classList.add('app-button');
        document.getElementById('tracker-container').appendChild(fwdButton);
    } else if (forward && builtGame !== null) {
        const createButton = document.createElement('button');
        createButton.innerText = 'Create';
        createButton.setAttribute('id', 'create-game');
        createButton.classList.add('app-button');
        createButton.addEventListener('click', forwardHandler);
        document.getElementById('tracker-container').appendChild(createButton);
    }

    insertPlaceHolderButtonsIfNeeded(back);
}

function insertPlaceHolderButtonsIfNeeded (back) {
    const placeholder = document.createElement('div');
    placeholder.classList.add('tracker-placeholder');
    if (!back) {
        document.getElementById('tracker-container').prepend(placeholder);
    }
}

function initializeRemainingEventListeners (deckManager, roleBox) {
    document.getElementById('role-form').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('role-name').value.trim();
        const description = document.getElementById('role-description').value.trim();
        const team = document.getElementById('role-alignment').value.toLowerCase().trim();
        if (roleBox.createMode) {
            if (!roleBox.getCustomRole(name) && !roleBox.getDefaultRole(name)) { // confirm there is no existing custom role with the same name
                processNewCustomRoleSubmission(name, description, team, deckManager, false, roleBox);
            } else {
                toast('There is already a default or custom role with this name', 'error', true, true, 'short');
            }
        } else {
            const entry = roleBox.getCustomRole(roleBox.currentlyEditingRoleName);
            if (name === entry.role) { // did they edit the name?
                processNewCustomRoleSubmission(name, description, team, deckManager, true, roleBox, entry);
            } else {
                if (!roleBox.getCustomRole(name) && !roleBox.getDefaultRole(name)) {
                    processNewCustomRoleSubmission(name, description, team, deckManager, true, roleBox, entry);
                } else {
                    toast('There is already a role with this name', 'error', true, true, 'short');
                }
            }
        }
    };
    document.getElementById('deck-template-button').addEventListener('click', () => {
        ModalManager.displayModal(
            'deck-template-modal',
            'modal-background',
            'close-deck-template-modal-button'
        );
    });
    document.getElementById('custom-role-btn').addEventListener(
        'click', () => {
            const createBtn = document.getElementById('create-role-button');
            createBtn.setAttribute('value', 'Create');
            roleBox.createMode = true;
            roleBox.currentlyEditingRoleName = null;
            document.getElementById('role-name').value = '';
            document.getElementById('role-alignment').value = globals.ALIGNMENT.GOOD;
            document.getElementById('role-description').value = '';
            ModalManager.displayModal(
                'role-modal',
                'modal-background',
                'close-modal-button'
            );
        }
    );
}

function processNewCustomRoleSubmission (name, description, team, deckManager, isUpdate, roleBox, option = null) {
    if (name.length > 40) {
        toast('Your name is too long (max 40 characters).', 'error', true);
        return;
    }
    if (description.length > 500) {
        toast('Your description is too long (max 500 characters).', 'error', true);
        return;
    }
    if (isUpdate) {
        roleBox.updateCustomRole(option, name, description, team);
        ModalManager.dispelModal('role-modal', 'modal-background');
        toast('Role Updated', 'success', true);
    } else {
        roleBox.addCustomRole({ role: name, description: description, team: team, custom: true });
        ModalManager.dispelModal('role-modal', 'modal-background');
        toast('Role Created', 'success', true);
    }
    if (roleBox.category === 'custom') {
        roleBox.displayCustomRoles(document.getElementById('role-select'));
    }
}

function hasTimer (hours, minutes) {
    return (!isNaN(hours) || !isNaN(minutes));
}

function validateName (name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 30;
}
