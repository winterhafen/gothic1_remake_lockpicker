function getNextState(currentState, diskIdx, direction, dependencies) {
    const nextState = [...currentState];

    const newVal = nextState[diskIdx] + direction;
    if (newVal < 1 || newVal > 7) {
        return null;
    }
    nextState[diskIdx] = newVal;

    const masterDeps = dependencies[diskIdx] || {};
    for (let otherIdx = 0; otherIdx < nextState.length; otherIdx++) {
        if (otherIdx === diskIdx) {
            continue;
        }

        const factor = masterDeps[otherIdx] || 0;
        if (factor === 0) {
            continue;
        }

        const depDirection = direction * factor;
        const depNewVal = nextState[otherIdx] + depDirection;
        if (depNewVal < 1 || depNewVal > 7) {
            return null;
        }

        nextState[otherIdx] = depNewVal;
    }

    return nextState;
}

function encodeState(state) {
    let key = 0;

    for (let i = 0; i < state.length; i++) {
        key = (key * 8) + state[i];
    }

    return key;
}

function buildSolutionPath(queue, solutionIndex) {
    const path = [];
    let currentIndex = solutionIndex;

    while (currentIndex !== 0) {
        const node = queue[currentIndex];
        path.push(node.move);
        currentIndex = node.parentIndex;
    }

    path.reverse();
    return path;
}

function solveLock(startState, dependencies) {
    const count = startState.length;
    const targetKey = encodeState(Array(count).fill(4));
    const startKey = encodeState(startState);

    if (startKey === targetKey) {
        return { type: 'alreadyOpen', solution: [] };
    }

    const queue = [{ state: [...startState], parentIndex: -1, move: null }];
    const visited = new Set([startKey]);
    let queueIndex = 0;
    let solutionIndex = -1;

    while (queueIndex < queue.length) {
        const current = queue[queueIndex++];

        for (let i = 0; i < count; i++) {
            for (const direction of [-1, 1]) {
                const nextState = getNextState(current.state, i, direction, dependencies);
                if (nextState === null) {
                    continue;
                }

                const key = encodeState(nextState);
                if (visited.has(key)) {
                    continue;
                }

                const nextQueueIndex = queue.length;
                const move = { disk: i + 1, dir: direction };
                if (key === targetKey) {
                    queue.push({ state: nextState, parentIndex: queueIndex - 1, move });
                    solutionIndex = nextQueueIndex;
                    queueIndex = queue.length;
                    break;
                }

                visited.add(key);
                queue.push({ state: nextState, parentIndex: queueIndex - 1, move });
            }

            if (solutionIndex !== -1) {
                break;
            }
        }
    }

    return solutionIndex !== -1
        ? { type: 'solution', solution: buildSolutionPath(queue, solutionIndex) }
        : { type: 'noSolution', solution: [] };
}

window.solveLock = solveLock;
