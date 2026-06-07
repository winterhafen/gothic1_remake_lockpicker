const translations = window.translations;
const dom = window.domHelpers;
const stateManager = window.lockState;
let currentLang = getDefaultLanguage();
let state = stateManager.createLockState(4);

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

function bindStaticEvents() {
    const elements = dom.getAppElements();

    elements.langBtnDe.addEventListener('click', () => changeLanguage('de'));
    elements.langBtnEn.addEventListener('click', () => changeLanguage('en'));
    elements.generateBtn.addEventListener('click', initLock);
    elements.solveBtn.addEventListener('click', calculateRoute);
}

function changeLanguage(lang) {
    currentLang = lang;

    dom.renderLanguageButtons(currentLang);

    renderStaticText();
    renderDiskLabels();
    renderModeHint();
    renderOutput();
}

function initLock() {
    const count = getRequestedDiskCount();
    const container = dom.getAppElements().lockContainer;
    container.innerHTML = '';

    state = stateManager.createLockState(count);

    for (let i = count - 1; i >= 0; i--) {
        container.appendChild(dom.createDiskRow(i, currentLang, translations, {
            onSetPosition: setDiskPosition,
            onSetDependency: setDependencyValue,
            onToggleEdit: toggleEditMode
        }));
    }

    renderDiskLabels();
    dom.renderEditMode(state.disks, state.currentMasterIdx, currentLang, translations, state.dependencies);
    renderModeHint();
    renderOutput();
}

function setDiskPosition(diskIdx, position) {
    if (!stateManager.setDiskPosition(state, diskIdx, position)) {
        return;
    }

    dom.updateDiskPositionUI(diskIdx, position);
}

function toggleEditMode(masterIdx) {
    stateManager.toggleEditMode(state, masterIdx);

    dom.renderEditMode(state.disks, state.currentMasterIdx, currentLang, translations, state.dependencies);

    renderModeHint();
}

function setDependencyValue(slaveIdx, value) {
    if (!stateManager.setDependencyValue(state, slaveIdx, value)) {
        return;
    }

    updateDepButtonUI(slaveIdx, value);
}

function updateDepButtonUI(slaveIdx, activeValue) {
    dom.updateDependencyButtons(slaveIdx, activeValue);
}

function calculateRoute() {
    const t = translations[currentLang];
    if (state.currentMasterIdx !== null) {
        alert(t.alertEditMode);
        return;
    }

    stateManager.setOutputState(state, window.solveLock(state.disks, state.dependencies));

    renderOutput();
}

bindStaticEvents();
changeLanguage(currentLang);
initLock();
