// js/app.js
import UIManager from './UIManager.js';
import SearchVisualizer from './SearchVisualizer.js';

let visualizer = null;

const handlers = {
    start: () => {
        const { rawArray, target } = UIManager.getInputs();
        if (rawArray.length === 0 || isNaN(target)) {
            alert("Please enter a valid array and a target number.");
            return;
        }
        visualizer = new SearchVisualizer(rawArray, target);
        UIManager.render(visualizer.getState(), visualizer.history.length);
    },
    next: () => {
        if (visualizer && !visualizer.isFinished()) {
            visualizer.nextStep();
            UIManager.render(visualizer.getState(), visualizer.history.length);
        }
    },
    prev: () => {
        if (visualizer) {
            visualizer.previousStep();
            UIManager.render(visualizer.getState(), visualizer.history.length);
        }
    },
    reset: () => {
        visualizer = null;
        UIManager.fullReset();
    },
    viewToggle: () => {
        if (visualizer) {
            // Re-render to show/hide components based on new toggle state
            UIManager.render(visualizer.getState(), visualizer.history.length);
        }
    }
};

// Initialize the application
function init() {
    UIManager.bindEventListeners(handlers);
    UIManager.fullReset(); // Set the initial UI state
}

// Run the app once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);