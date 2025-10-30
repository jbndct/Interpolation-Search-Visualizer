// js/UIManager.js

/**
 * Manages all DOM interactions for the visualizer.
 * It reads a state object and updates the UI accordingly.
 */

// Cache DOM elements for performance
const DOM = {
    arrayInput: document.getElementById('array-input'),
    targetInput: document.getElementById('target-input'),
    randomCountInput: document.getElementById('random-count'),
    generateRandomButton: document.getElementById('generate-random'),
    startButton: document.getElementById('start-button'),
    prevStepButton: document.getElementById('prev-step-button'),
    nextStepButton: document.getElementById('next-step-button'),
    resetButton: document.getElementById('reset-button'),
    arrayContainer: document.getElementById('array-container'),
    explanationLog: document.getElementById('explanation-log'),
    visualFormulaContainer: document.getElementById('component-formula-container'),
    codeContainer: document.getElementById('component-code-container'),
    vf: {
        high: document.getElementById('vf-high'), low: document.getElementById('vf-low'),
        indexRange: document.getElementById('vf-index-range'), target: document.getElementById('vf-target'),
        arrLow: document.getElementById('vf-arr-low'), valPos: document.getElementById('vf-val-pos'),
        arrHigh: document.getElementById('vf-arr-high'), arrLow2: document.getElementById('vf-arr-low-2'),
        valRange: document.getElementById('vf-val-range'), indexRange2: document.getElementById('vf-index-range-2'),
        valPos2: document.getElementById('vf-val-pos-2'), valRange2: document.getElementById('vf-val-range-2'),
        calcRes: document.getElementById('vf-calc-res'), low2: document.getElementById('vf-low-2'),
        calcRes2: document.getElementById('vf-calc-res-2'), result: document.getElementById('vf-result')
    },
    toggles: {
        array: document.getElementById('toggle-array'),
        formula: document.getElementById('toggle-formula'),
        code: document.getElementById('toggle-code'),
        log: document.getElementById('toggle-log'),
    },
    components: {
        array: document.getElementById('component-array-container'),
        formula: document.getElementById('component-formula-container'),
        code: document.getElementById('component-code-container'),
        log: document.getElementById('component-log-container'),
    }
};

let currentHighlight = null;
let currentContextHighlight = null;

function _renderArray(state) {
    const { sortedArray, low, high, pos, foundIndex } = state;
    DOM.arrayContainer.innerHTML = '';
    sortedArray.forEach((value, index) => {
        const elementWrapper = document.createElement('div');
        elementWrapper.className = 'flex flex-col items-center';

        const box = document.createElement('div');
        box.className = 'array-box';
        box.textContent = value;
        if (index === low) box.classList.add('low');
        if (index === high) box.classList.add('high');
        if (index === pos) box.classList.add('probe');
        if (index === foundIndex) box.classList.add('found');
        if ((low !== -1 && index < low) || (high !== -1 && index > high)) {
            box.classList.add('disabled');
        }
        
        elementWrapper.appendChild(box);
        const indexLabel = document.createElement('div');
        indexLabel.className = 'text-sm font-semibold text-gray-500 mt-1';
        indexLabel.textContent = index;
        elementWrapper.appendChild(indexLabel);
        DOM.arrayContainer.appendChild(elementWrapper);
    });
}

function _renderLog(state) {
    DOM.explanationLog.innerHTML = state.log.map(entry => 
        entry.isFormula 
            ? `<div class="formula-log">${entry.message}</div>`
            : `<div class="p-2 border-b border-gray-200">${entry.message}</div>`
    ).join('');
    DOM.explanationLog.scrollTop = DOM.explanationLog.scrollHeight;
}

function _renderCode(state) {
    if (currentHighlight) currentHighlight.classList.remove('code-line-highlight');
    if (state.currentHighlightLineId) {
        const line = document.getElementById(state.currentHighlightLineId);
        if (line) {
            line.classList.add('code-line-highlight');
            currentHighlight = line;
        }
    }

    if (currentContextHighlight) currentContextHighlight.classList.remove('code-line-context');
    if (state.isLoopContextActive) {
        const line = document.getElementById('code-line-5');
        if (line) {
            line.classList.add('code-line-context');
            currentContextHighlight = line;
        }
    }
}

function _renderFormula(state) {
    const { formulaData } = state;
    const allVfSpans = Object.values(DOM.vf);
    if (!formulaData) {
        allVfSpans.forEach(span => span.textContent = '?');
        return;
    }

    const { lowVal, highVal, targetVal, arrLowVal, arrHighVal } = formulaData;
    const indexRange = highVal - lowVal;
    const valPos = targetVal - arrLowVal;
    const valRange = arrHighVal - arrLowVal;
    const calcRes = (valRange !== 0) ? Math.floor((indexRange * valPos) / valRange) : 0;
    const pos = lowVal + calcRes;

    DOM.vf.high.textContent = highVal; DOM.vf.low.textContent = lowVal;
    DOM.vf.indexRange.textContent = indexRange; DOM.vf.target.textContent = targetVal;
    DOM.vf.arrLow.textContent = arrLowVal; DOM.vf.valPos.textContent = valPos;
    DOM.vf.arrHigh.textContent = arrHighVal; DOM.vf.arrLow2.textContent = arrLowVal;
    DOM.vf.valRange.textContent = valRange; DOM.vf.indexRange2.textContent = indexRange;
    DOM.vf.valPos2.textContent = valPos; DOM.vf.valRange2.textContent = valRange;
    DOM.vf.calcRes.textContent = calcRes; DOM.vf.low2.textContent = lowVal;
    DOM.vf.calcRes2.textContent = calcRes; DOM.vf.result.textContent = pos;

    allVfSpans.forEach(el => {
        el.classList.add('updated');
        setTimeout(() => el.classList.remove('updated'), 500);
    });
}

function _renderButtonState(state, historyLength) {
    const isIdle = !state.isRunning && state.foundIndex === -1 && state.step === 'init_high';
    const isComplete = !state.isRunning && !isIdle;

    DOM.startButton.classList.toggle('hidden', !isIdle);
    DOM.nextStepButton.classList.toggle('hidden', isIdle || isComplete);
    DOM.prevStepButton.classList.toggle('hidden', isIdle || isComplete || historyLength <= 1);
    DOM.resetButton.classList.toggle('hidden', isIdle);
}

function _renderComponentVisibility(state) {
    DOM.components.array.classList.toggle('hidden', !DOM.toggles.array.checked);
    DOM.components.log.classList.toggle('hidden', !DOM.toggles.log.checked);
    
    const showCode = DOM.toggles.code.checked && state.isRunning;
    DOM.components.code.classList.toggle('hidden', !showCode);
    
    const showFormula = DOM.toggles.formula.checked && state.formulaData && state.isRunning;
    DOM.components.formula.classList.toggle('hidden', !showFormula);
}

const UIManager = {
    // Public method to render the entire UI from a state object
    render(state, historyLength) {
        _renderArray(state);
        _renderLog(state);
        _renderCode(state);
        _renderFormula(state);
        _renderButtonState(state, historyLength);
        _renderComponentVisibility(state);
    },

    // Get user inputs from the DOM
    getInputs() {
        const rawArray = DOM.arrayInput.value.split(',')
            .map(s => s.trim()).filter(s => s !== '').map(Number).filter(isFinite);
        const target = Number(DOM.targetInput.value);
        return { rawArray, target };
    },

    // Reset the UI to its initial state
    fullReset() {
        DOM.arrayInput.value = '';
        DOM.targetInput.value = '';
        DOM.randomCountInput.value = '';
        DOM.arrayContainer.innerHTML = '<span class="text-gray-400">Enter data and press \'Start\' to see the visualization.</span>';
        DOM.explanationLog.innerHTML = '<span class="text-gray-400">Detailed steps will appear here...</span>';
        
        // Reset toggles to default
        Object.values(DOM.toggles).forEach(toggle => toggle.checked = true);
        
        // Use a dummy initial state to reset UI components
        const dummyState = { isRunning: false, foundIndex: -1, step: 'init_high', formulaData: null, log: [] };
        this.render(dummyState, 0);
    },

    // Attach event listeners to UI elements
    bindEventListeners(handlers) {
        DOM.startButton.addEventListener('click', handlers.start);
        DOM.prevStepButton.addEventListener('click', handlers.prev);
        DOM.nextStepButton.addEventListener('click', handlers.next);
        DOM.resetButton.addEventListener('click', handlers.reset);
        DOM.generateRandomButton.addEventListener('click', () => {
             const count = Number(DOM.randomCountInput.value);
            if (count > 0 && count <= 100) {
                let randomNumbers = new Set();
                while(randomNumbers.size < count) {
                    randomNumbers.add(Math.floor(Math.random() * 200) + 1);
                }
                DOM.arrayInput.value = Array.from(randomNumbers).join(', ');
            }
        });
        Object.values(DOM.toggles).forEach(toggle => {
            toggle.addEventListener('change', handlers.viewToggle);
        });
    }
};

export default UIManager;