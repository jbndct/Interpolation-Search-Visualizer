// js/app.js
import UIManager from './UIManager.js';
import SearchVisualizer from './SearchVisualizer.js';

let visualizer = null;

// This is the default state object for when the app is idle
const IDLE_STATE = {
    sortedArray: [],
    low: -1,
    high: -1,
    pos: -1,
    foundIndex: -1,
    isRunning: false,
    step: 'init_high',
    log: [],
    currentHighlightLineId: null,
    isLoopContextActive: false,
    formulaData: null
};


const handlers = {
    // --- FIX: Make the start handler async ---
    start: async () => {
        const { rawArray, target, rawTarget } = UIManager.getInputs();
        
        if (rawArray.length === 0 || rawTarget === '') {
            UIManager.showAlert("Please enter a valid array and a target number.");
            return;
        }

        // 1. Create the visualizer (this is now fast)
        visualizer = new SearchVisualizer(rawArray, target);
        
        // 2. Render the very first step immediately
        // This hides "Start" and shows the controls
        UIManager.render(visualizer.getState(), visualizer.isFinished(), visualizer.isAtStart());
        
        // 3. Disable controls and show "Loading..."
        UIManager.setControlsEnabled(false);

        // 4. --- FIX: Run the heavy computation asynchronously ---
        await visualizer.precomputeHistory();
        
        // 5. Re-enable controls
        UIManager.setControlsEnabled(true);
        
        // 6. Render again to update the final state (e.g., disable 'Next' if search finished)
        UIManager.render(visualizer.getState(), visualizer.isFinished(), visualizer.isAtStart());
    },
    next: () => {
        if (visualizer && !visualizer.isFinished()) {
            visualizer.nextStep();
            UIManager.render(visualizer.getState(), visualizer.isFinished(), visualizer.isAtStart());
        }
    },
    prev: () => {
        if (visualizer) {
            visualizer.previousStep();
            UIManager.render(visualizer.getState(), visualizer.isFinished(), visualizer.isAtStart());
        }
    },
    reset: () => {
        visualizer = null;
        UIManager.fullReset(IDLE_STATE);
    },
    viewToggle: () => {
        let state, isFinished, isAtStart;
        if (visualizer) {
            state = visualizer.getState();
            isFinished = visualizer.isFinished();
            isAtStart = visualizer.isAtStart();
        } else {
            state = IDLE_STATE;
            isFinished = true;
            isAtStart = true;
        }
        UIManager.render(state, isFinished, isAtStart);
    }
};

// Initialize the application
function init() {
    UIManager.init();
    UIManager.bindEventListeners(handlers);
    UIManager.fullReset(IDLE_STATE);

    if (typeof Sortable !== 'undefined') {
        const container = document.getElementById('main-content-container');
        if (container) {
            new Sortable(container, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost'
            });
        }
    } else {
        console.error("SortableJS library not loaded.");
    }
}

document.addEventListener('DOMContentLoaded', init);