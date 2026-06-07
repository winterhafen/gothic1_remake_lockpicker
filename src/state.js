function createDependencies(count) {
    const dependencies = {};

    for (let i = 0; i < count; i++) {
        dependencies[i] = {};
        for (let j = 0; j < count; j++) {
            dependencies[i][j] = 0;
        }
    }

    return dependencies;
}

function createLockState(count) {
    return {
        disks: Array(count).fill(1),
        dependencies: createDependencies(count),
        currentMasterIdx: null,
        outputState: { type: 'default', solution: [] }
    };
}

function toggleEditMode(state, masterIdx) {
    state.currentMasterIdx = state.currentMasterIdx === masterIdx ? null : masterIdx;
    return state.currentMasterIdx;
}

function setDiskPosition(state, diskIdx, position) {
    if (state.currentMasterIdx !== null) {
        return false;
    }

    state.disks[diskIdx] = position;
    return true;
}

function setDependencyValue(state, slaveIdx, value) {
    if (state.currentMasterIdx === null) {
        return false;
    }

    state.dependencies[state.currentMasterIdx][slaveIdx] = value;
    return true;
}

function setOutputState(state, outputState) {
    state.outputState = outputState;
    return state.outputState;
}

window.lockState = {
    createLockState,
    toggleEditMode,
    setDiskPosition,
    setDependencyValue,
    setOutputState
};
