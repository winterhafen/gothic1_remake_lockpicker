function getAppElements() {
    return {
        langBtnDe: document.getElementById('lang-btn-de'),
        langBtnEn: document.getElementById('lang-btn-en'),
        pageTitle: document.getElementById('pageTitle'),
        diskCountLabel: document.getElementById('diskCountLabel'),
        diskCount: document.getElementById('diskCount'),
        generateBtn: document.getElementById('generateBtn'),
        modeHint: document.getElementById('modeHint'),
        lockContainer: document.getElementById('lockContainer'),
        solveBtn: document.getElementById('solveBtn'),
        prevStepBtn: document.getElementById('prevStepBtn'),
        nextStepBtn: document.getElementById('nextStepBtn'),
        playBtn: document.getElementById('playBtn'),
        solutionTitle: document.getElementById('solutionTitle'),
        output: document.getElementById('output')
    };
}

function renderStaticText(currentLang, translations) {
    const t = translations[currentLang];
    const elements = getAppElements();

    document.documentElement.lang = currentLang;
    elements.pageTitle.innerText = t.title;
    elements.diskCountLabel.innerText = t.diskCountLabel;
    elements.generateBtn.innerText = t.generateBtn;
    elements.solveBtn.innerText = t.solveBtn;
    elements.solutionTitle.innerText = t.solutionTitle;
}

function renderLanguageButtons(currentLang) {
    const elements = getAppElements();
    elements.langBtnDe.classList.toggle('active', currentLang === 'de');
    elements.langBtnEn.classList.toggle('active', currentLang === 'en');
}

function renderModeHint(currentMasterIdx, currentLang, translations) {
    const elements = getAppElements();

    if (currentMasterIdx === null) {
        elements.modeHint.innerText = '';
        elements.solveBtn.disabled = false;
        return;
    }

    elements.modeHint.innerText = translations[currentLang].editModeHint;
    elements.solveBtn.disabled = true;
}

function groupSolutionSteps(solution) {
    if (solution.length === 0) {
        return [];
    }

    const grouped = [];

    for (const step of solution) {
        const lastStep = grouped[grouped.length - 1];
        if (lastStep && lastStep.disk === step.disk && lastStep.dir === step.dir) {
            lastStep.count += 1;
            continue;
        }

        grouped.push({ ...step, count: 1 });
    }

    return grouped;
}

function formatRepeatText(currentLang, count, translations) {
    if (count <= 1) {
        return '';
    }

    if (currentLang === 'de') {
        const countWords = {
            2: 'zweimal',
            3: 'dreimal',
            4: 'viermal',
            5: 'fünfmal',
            6: 'sechsmal',
            7: 'siebenmal',
            8: 'achtmal',
            9: 'neunmal',
            10: 'zehnmal'
        };

        return countWords[count] || `${count} Mal`;
    }

    return `${count} ${translations[currentLang].timesText}`;
}

function formatStepPrefix(stepNumber, maxStepCount, translations, currentLang) {
    const stepWidth = String(maxStepCount).length;
    const paddedNumber = String(stepNumber).padStart(stepWidth, ' ');
    return `${translations[currentLang].stepText}${paddedNumber}: `;
}

function renderOutput(outputState, currentLang, translations) {
    const t = translations[currentLang];
    const { output } = getAppElements();

    if (outputState.type === 'alreadyOpen') {
        output.innerText = t.alreadyOpen;
        return;
    }

    if (outputState.type === 'solution') {
        let cleanText = t.successTitle;
        const groupedSteps = groupSolutionSteps(outputState.solution);

        for (let idx = 0; idx < groupedSteps.length; idx++) {
            const step = groupedSteps[idx];
            const dirWord = step.dir === 1 ? t.left : t.right;
            const repeatText = formatRepeatText(currentLang, step.count, translations);
            const stepPrefix = formatStepPrefix(idx + 1, groupedSteps.length, translations, currentLang);

            if (currentLang === 'de' && repeatText) {
                cleanText += `${stepPrefix}${t.moveText} ${step.disk} ${repeatText} ${t.toText} ${dirWord}\n`;
                continue;
            }

            const suffix = repeatText ? ` ${repeatText}` : '';
            cleanText += `${stepPrefix}${t.moveText} ${step.disk} ${t.toText} ${dirWord}${suffix}\n`;
        }
        output.innerText = cleanText;
        return;
    }

    if (outputState.type === 'noSolution') {
        output.innerText = t.noSolution;
        return;
    }

    output.innerText = t.defaultOutput;
}

function renderDiskLabels(disks, currentMasterIdx, currentLang, translations) {
    const t = translations[currentLang];

    for (let i = 0; i < disks.length; i++) {
        const row = document.getElementById(`disk-row-${i}`);
        if (!row) {
            continue;
        }

        row.querySelector('.disk-label').innerText = `${t.diskLabel} S${i + 1}`;
        document.getElementById(`edit-btn-${i}`).innerText = currentMasterIdx === i ? t.editBtnActive : t.editBtnDefault;
    }
}

function updateDiskPositionUI(diskIdx, position) {
    for (let pos = 1; pos <= 7; pos++) {
        const circle = document.getElementById(`circle-${diskIdx}-${pos}`);
        circle.classList.toggle('active', pos === position);
    }
}

function updateDependencyButtons(slaveIdx, activeValue) {
    [-1, 0, 1].forEach((val) => {
        const btn = document.getElementById(`dep-btn-${slaveIdx}-${val}`);
        btn.classList.toggle('selected', val === activeValue);
    });
}

function renderEditMode(disks, currentMasterIdx, currentLang, translations, dependencies) {
    for (let i = 0; i < disks.length; i++) {
        const row = document.getElementById(`disk-row-${i}`);
        const editBtn = document.getElementById(`edit-btn-${i}`);
        const depControls = document.getElementById(`dep-controls-${i}`);

        row.classList.remove('edit-master', 'edit-slave');
        editBtn.classList.remove('active');
        editBtn.innerText = translations[currentLang].editBtnDefault;
        depControls.style.display = 'none';

        if (currentMasterIdx !== null) {
            if (i === currentMasterIdx) {
                row.classList.add('edit-master');
                editBtn.classList.add('active');
                editBtn.innerText = translations[currentLang].editBtnActive;
            } else {
                row.classList.add('edit-slave');
                depControls.style.display = 'flex';
                updateDependencyButtons(i, dependencies[currentMasterIdx][i]);
            }
        }
    }
}

function createDiskRow(diskIdx, currentLang, translations, handlers) {
    const row = document.createElement('div');
    row.className = 'disk-row';
    row.id = `disk-row-${diskIdx}`;

    const label = document.createElement('div');
    label.className = 'disk-label';
    label.innerText = `${translations[currentLang].diskLabel} S${diskIdx + 1}`;
    row.appendChild(label);

    const circleContainer = document.createElement('div');
    circleContainer.className = 'circle-container';
    for (let pos = 1; pos <= 7; pos++) {
        const circle = document.createElement('div');
        circle.className = `circle ${pos === 4 ? 'target' : ''} ${pos === 1 ? 'active' : ''}`;
        circle.innerText = pos;
        circle.id = `circle-${diskIdx}-${pos}`;
        circle.addEventListener('click', () => handlers.onSetPosition(diskIdx, pos));
        circleContainer.appendChild(circle);
    }
    row.appendChild(circleContainer);

    const depControls = document.createElement('div');
    depControls.className = 'dep-controls';
    depControls.id = `dep-controls-${diskIdx}`;

    [-1, 0, 1].forEach((val) => {
        const btn = document.createElement('button');
        btn.className = `dep-btn ${val === 0 ? 'selected' : ''}`;
        btn.innerText = val > 0 ? `+${val}` : val;
        btn.id = `dep-btn-${diskIdx}-${val}`;
        btn.addEventListener('click', () => handlers.onSetDependency(diskIdx, val));
        depControls.appendChild(btn);
    });
    row.appendChild(depControls);

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerText = translations[currentLang].editBtnDefault;
    editBtn.id = `edit-btn-${diskIdx}`;
    editBtn.addEventListener('click', () => handlers.onToggleEdit(diskIdx));
    row.appendChild(editBtn);

    return row;
}

window.domHelpers = {
    getAppElements,
    renderStaticText,
    renderLanguageButtons,
    renderModeHint,
    renderOutput,
    renderDiskLabels,
    updateDiskPositionUI,
    updateDependencyButtons,
    renderEditMode,
    createDiskRow
};
