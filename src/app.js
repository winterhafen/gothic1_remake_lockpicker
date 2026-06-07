const translations = window.translations;
const dom = window.domHelpers;
const stateManager = window.lockState;
let currentLang = getDefaultLanguage();
let state = stateManager.createLockState(4);
let isPlaybackRunning = false;
let playbackToken = 0;
let playbackStates = [];
let playbackStepIndex = 0;
let playbackResetTimerId = null;
let configNeedsRecalculation = false;

const PLAYBACK_STEP_DELAY_MS = 450;
const PLAYBACK_RESET_DELAY_MS = 1200;

function getDefaultLanguage() {
    const browserLanguage = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    const normalizedLanguage = browserLanguage.toLowerCase();

    if (normalizedLanguage.startsWith('de')) {
        return 'de';
    }

    if (normalizedLanguage.startsWith('en')) {
        return 'en';
    }

    return 'en';
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getRequestedDiskCount() {
    const input = dom.getAppElements().diskCount;
    const parsedCount = Number.parseInt(input.value, 10);
    const safeCount = Number.isFinite(parsedCount) ? clamp(parsedCount, 1, 10) : 4;
    input.value = safeCount;
    return safeCount;
}

function renderStaticText() {
    dom.renderStaticText(currentLang, translations);
}

function renderModeHint() {
    dom.renderModeHint(state.currentMasterIdx, currentLang, translations);
}

function renderOutput() {
    dom.renderOutput(state.outputState, currentLang, translations);
}

function renderDiskLabels() {
    dom.renderDiskLabels(state.disks, state.currentMasterIdx, currentLang, translations);
}

function renderConfigStatusHint() {
    dom.renderConfigStatusHint(configNeedsRecalculation, currentLang, translations);
}

function renderDependencyStatus() {
    dom.renderDependencyStatus(state.dependencies, currentLang, translations);
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearScheduledPlaybackReset() {
    if (playbackResetTimerId !== null) {
        clearTimeout(playbackResetTimerId);
        playbackResetTimerId = null;
    }
}

function schedulePlaybackReset(runToken) {
    clearScheduledPlaybackReset();

    playbackResetTimerId = setTimeout(() => {
        playbackResetTimerId = null;

        if (runToken !== playbackToken || isPlaybackRunning || !isPlayableSolution()) {
            return;
        }

        applyPlaybackStepView(0);
        renderPlaybackControls();
    }, PLAYBACK_RESET_DELAY_MS);
}

function isPlayableSolution() {
    return state.outputState.type === 'solution' && state.outputState.solution.length > 0;
}

function getPlaybackStepCount() {
    return state.outputState.solution.length;
}

function restoreDiskPositionsFromState() {
    for (let diskIdx = 0; diskIdx < state.disks.length; diskIdx++) {
        dom.updateDiskPositionUI(diskIdx, state.disks[diskIdx]);
    }
}

function clearPlaybackHighlights() {
    for (let i = 0; i < state.disks.length; i++) {
        const row = document.getElementById(`disk-row-${i}`);
        row?.classList.remove('play-active');

        const activeCircle = document.querySelector(`#disk-row-${i} .circle.playback-active`);
        activeCircle?.classList.remove('playback-active');
    }
}

function restoreModeHintForCurrentState() {
    if (playbackStepIndex === 0) {
        renderModeHint();
        return;
    }

    const step = state.outputState.solution[playbackStepIndex - 1];
    renderPlaybackStepHint(step);
}

function applyPlaybackStepView(stepIndex) {
    if (!isPlayableSolution() || playbackStates.length === 0) {
        clearPlaybackHighlights();
        restoreDiskPositionsFromState();
        renderModeHint();
        return;
    }

    playbackStepIndex = clamp(stepIndex, 0, getPlaybackStepCount());

    clearPlaybackHighlights();

    const currentState = playbackStates[playbackStepIndex];
    for (let diskIdx = 0; diskIdx < currentState.length; diskIdx++) {
        dom.updateDiskPositionUI(diskIdx, currentState[diskIdx]);
    }

    if (playbackStepIndex > 0) {
        const previousState = playbackStates[playbackStepIndex - 1];
        const step = state.outputState.solution[playbackStepIndex - 1];
        paintPlaybackStep(step, previousState, currentState);
    }

    restoreModeHintForCurrentState();
}

function rebuildPlaybackStates() {
    playbackStates = [];
    playbackStepIndex = 0;

    if (!isPlayableSolution()) {
        return;
    }

    const states = [[...state.disks]];
    let previewState = [...state.disks];

    for (const step of state.outputState.solution) {
        const nextState = applyStepToPreviewState(previewState, step);
        if (nextState === null) {
            playbackStates = [];
            return;
        }

        states.push(nextState);
        previewState = nextState;
    }

    playbackStates = states;
}

function renderPlaybackControls() {
    const t = translations[currentLang];
    const { playBtn, prevStepBtn, nextStepBtn } = dom.getAppElements();
    const showControls = isPlayableSolution();
    const isAtStart = playbackStepIndex === 0;
    const isAtEnd = playbackStepIndex >= getPlaybackStepCount();

    playBtn.style.display = showControls ? 'block' : 'none';
    prevStepBtn.style.display = showControls ? 'block' : 'none';
    nextStepBtn.style.display = showControls ? 'block' : 'none';

    const playMarkup = '<span class="double-play-icon" aria-hidden="true"><span class="tri">\u25B6</span><span class="tri">\u25B6</span></span>';
    const pauseMarkup = '<span class="pause-icon" aria-hidden="true">||</span>';

    playBtn.innerHTML = isPlaybackRunning
        ? `${pauseMarkup}<span class="auto-play-label">${t.pauseBtn}</span>`
        : `${playMarkup}<span class="auto-play-label">${t.playBtn}</span>`;
    prevStepBtn.innerText = '\u25C0';
    nextStepBtn.innerText = '\u25B6';

    playBtn.title = isPlaybackRunning ? t.pauseBtn : t.playBtn;
    prevStepBtn.title = t.stepBackwardTitle;
    nextStepBtn.title = t.stepForwardTitle;

    playBtn.disabled = !isPlaybackRunning && isAtEnd;
    prevStepBtn.disabled = isPlaybackRunning || isAtStart;
    nextStepBtn.disabled = isPlaybackRunning || isAtEnd;
}

function setPlaybackUiState(isRunning) {
    const elements = dom.getAppElements();
    isPlaybackRunning = isRunning;

    elements.langBtnDe.disabled = isRunning;
    elements.langBtnEn.disabled = isRunning;
    elements.diskCount.disabled = isRunning;
    elements.generateBtn.disabled = isRunning;
    elements.solveBtn.disabled = isRunning || state.currentMasterIdx !== null;
    elements.lockContainer.classList.toggle('playback-running', isRunning);

    renderPlaybackControls();
}

function applyStepToPreviewState(previewState, step) {
    const nextState = [...previewState];
    const masterIdx = step.disk - 1;
    const masterDirection = step.dir;

    nextState[masterIdx] += masterDirection;
    if (nextState[masterIdx] < 1 || nextState[masterIdx] > 7) {
        return null;
    }

    const masterDeps = state.dependencies[masterIdx] || {};

    for (let otherIdx = 0; otherIdx < nextState.length; otherIdx++) {
        if (otherIdx === masterIdx) {
            continue;
        }

        const factor = masterDeps[otherIdx] || 0;
        if (factor === 0) {
            continue;
        }

        nextState[otherIdx] += masterDirection * factor;
        if (nextState[otherIdx] < 1 || nextState[otherIdx] > 7) {
            return null;
        }
    }

    return nextState;
}

function renderPlaybackStepHint(step) {
    const t = translations[currentLang];
    const directionText = step.dir === 1 ? t.left : t.right;
    dom.getAppElements().modeHint.innerText = `${t.playbackStepHint} ${step.disk} ${t.toText} ${directionText}`;
}

function paintPlaybackStep(step, previewState, nextState) {
    clearPlaybackHighlights();

    const masterIdx = step.disk - 1;
    const masterRow = document.getElementById(`disk-row-${masterIdx}`);
    masterRow?.classList.add('play-active');

    for (let diskIdx = 0; diskIdx < nextState.length; diskIdx++) {
        if (previewState[diskIdx] === nextState[diskIdx]) {
            continue;
        }

        dom.updateDiskPositionUI(diskIdx, nextState[diskIdx]);
        const activeCircle = document.getElementById(`circle-${diskIdx}-${nextState[diskIdx]}`);
        activeCircle?.classList.add('playback-active');
    }
}

async function playSolution() {
    if (isPlaybackRunning || !isPlayableSolution()) {
        return;
    }

    if (state.currentMasterIdx !== null) {
        alert(translations[currentLang].alertEditMode);
        return;
    }

    clearScheduledPlaybackReset();

    const runToken = ++playbackToken;
    setPlaybackUiState(true);
    let completedNaturally = true;

    for (let nextStepIndex = playbackStepIndex + 1; nextStepIndex <= getPlaybackStepCount(); nextStepIndex++) {
        if (runToken !== playbackToken) {
            completedNaturally = false;
            break;
        }

        applyPlaybackStepView(nextStepIndex);
        renderPlaybackControls();
        await wait(PLAYBACK_STEP_DELAY_MS);
    }

    setPlaybackUiState(false);

    if (completedNaturally && runToken === playbackToken && playbackStepIndex >= getPlaybackStepCount()) {
        schedulePlaybackReset(runToken);
    }
}

function pauseSolution() {
    if (!isPlaybackRunning) {
        return;
    }

    clearScheduledPlaybackReset();
    playbackToken += 1;
    setPlaybackUiState(false);
}

function toggleAutoPlay() {
    if (isPlaybackRunning) {
        pauseSolution();
        return;
    }

    playSolution();
}

function stepForward() {
    if (isPlaybackRunning || !isPlayableSolution() || playbackStepIndex >= getPlaybackStepCount()) {
        return;
    }

    clearScheduledPlaybackReset();
    applyPlaybackStepView(playbackStepIndex + 1);
    renderPlaybackControls();
}

function stepBackward() {
    if (isPlaybackRunning || !isPlayableSolution() || playbackStepIndex <= 0) {
        return;
    }

    clearScheduledPlaybackReset();
    applyPlaybackStepView(playbackStepIndex - 1);
    renderPlaybackControls();
}

function hasCalculatedOutput() {
    return state.outputState.type !== 'default';
}

function markConfigurationChangedIfCalculated() {
    if (!hasCalculatedOutput()) {
        return;
    }

    configNeedsRecalculation = true;
    renderConfigStatusHint();
}

function resetCalculatedOutput() {
    clearScheduledPlaybackReset();
    playbackToken += 1;
    clearPlaybackHighlights();
    playbackStates = [];
    playbackStepIndex = 0;
    restoreDiskPositionsFromState();
    setPlaybackUiState(false);

    stateManager.setOutputState(state, { type: 'default', solution: [] });
    renderOutput();
    renderPlaybackControls();
}

function bindStaticEvents() {
    const elements = dom.getAppElements();

    elements.langBtnDe.addEventListener('click', () => changeLanguage('de'));
    elements.langBtnEn.addEventListener('click', () => changeLanguage('en'));
    elements.generateBtn.addEventListener('click', initLock);
    elements.solveBtn.addEventListener('click', calculateRoute);
    elements.prevStepBtn.addEventListener('click', stepBackward);
    elements.nextStepBtn.addEventListener('click', stepForward);
    elements.playBtn.addEventListener('click', toggleAutoPlay);
}

function changeLanguage(lang) {
    currentLang = lang;

    dom.renderLanguageButtons(currentLang);

    renderStaticText();
    renderDiskLabels();
    renderModeHint();
    renderOutput();
    renderPlaybackControls();
    renderConfigStatusHint();
    renderDependencyStatus();
}

function initLock() {
    markConfigurationChangedIfCalculated();

    clearScheduledPlaybackReset();

    const count = getRequestedDiskCount();
    const container = dom.getAppElements().lockContainer;
    container.innerHTML = '';

    state = stateManager.createLockState(count);
    playbackToken += 1;

    for (let i = count - 1; i >= 0; i--) {
        container.appendChild(dom.createDiskRow(i, currentLang, translations, {
            onSetPosition: setDiskPosition,
            onSetDependency: setDependencyValue,
            onToggleEdit: toggleEditMode
        }));
    }

    renderDiskLabels();
    dom.renderEditMode(state.disks, state.currentMasterIdx, currentLang, translations, state.dependencies);
    renderDependencyStatus();
    renderModeHint();
    renderOutput();
    renderPlaybackControls();
}

function setDiskPosition(diskIdx, position) {
    if (state.disks[diskIdx] === position) {
        return;
    }

    markConfigurationChangedIfCalculated();

    if (!stateManager.setDiskPosition(state, diskIdx, position)) {
        return;
    }

    resetCalculatedOutput();

    dom.updateDiskPositionUI(diskIdx, position);
}

function toggleEditMode(masterIdx) {
    stateManager.toggleEditMode(state, masterIdx);

    dom.renderEditMode(state.disks, state.currentMasterIdx, currentLang, translations, state.dependencies);

    renderModeHint();
    renderDependencyStatus();
}

function setDependencyValue(slaveIdx, value) {
    const masterIdx = state.currentMasterIdx;
    if (masterIdx === null) {
        return;
    }

    if (state.dependencies[masterIdx][slaveIdx] === value) {
        return;
    }

    markConfigurationChangedIfCalculated();

    if (!stateManager.setDependencyValue(state, slaveIdx, value)) {
        return;
    }

    resetCalculatedOutput();

    updateDepButtonUI(slaveIdx, value);
    renderDependencyStatus();
}

function updateDepButtonUI(slaveIdx, activeValue) {
    dom.updateDependencyButtons(slaveIdx, activeValue);
}

function calculateRoute() {
    clearScheduledPlaybackReset();

    const t = translations[currentLang];
    if (state.currentMasterIdx !== null) {
        alert(t.alertEditMode);
        return;
    }

    stateManager.setOutputState(state, window.solveLock(state.disks, state.dependencies));
    configNeedsRecalculation = false;

    rebuildPlaybackStates();
    applyPlaybackStepView(0);

    renderOutput();
    renderPlaybackControls();
    renderConfigStatusHint();
}

bindStaticEvents();
changeLanguage(currentLang);
initLock();
