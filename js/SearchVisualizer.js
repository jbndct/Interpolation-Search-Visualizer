// js/SearchVisualizer.js

class SearchVisualizer {
    constructor(initialArray, target) {
        this.history = [];
        this.currentStateIndex = 0;
        
        // Create and save the very first "initial" state
        this.state = this._createInitialState(initialArray, target);
        this.history.push(this._deepCopy(this.state));
        
        // --- FIX: The heavy loop is REMOVED from the constructor ---
        // It now lives in `precomputeHistory`
    }

    // --- FIX: New async method to compute history ---
    async precomputeHistory() {
        // FIX: Get the initial state to compare against
        let lastPushedState = this._deepCopy(this.history[0]);

        // Run the algorithm to pre-populate history
        while (this.state.isRunning) {
            this._performStep(); // This mutates this.state
            
            // FIX: "Move Move Move" logic
            const currentState = this._deepCopy(this.state);
            
            // Only push if a visual change happened (low, high, pos) OR it's the final "finished" step
            if (currentState.low !== lastPushedState.low || 
                currentState.high !== lastPushedState.high || 
                currentState.pos !== lastPushedState.pos ||
                !currentState.isRunning) 
            {
                this.history.push(currentState);
                lastPushedState = currentState;
            }
            // If no visual change, we just continue. The logs from this step
            // will be "carried over" and included in the *next* step that *is* pushed.

            // Yield to the main thread to prevent freeze
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    _createInitialState(rawArray, target) {
        const sortedArray = [...new Set(rawArray)].sort((a, b) => a - b);
        const hasDuplicates = sortedArray.length < rawArray.length;

        const initialState = {
            rawArray: rawArray,
            sortedArray: sortedArray,
            target: target,
            hasDuplicates: hasDuplicates,
            low: 0,
            high: sortedArray.length - 1,
            pos: -1,
            foundIndex: -1,
            isRunning: true,
            step: 'init_high',
            stepCount: 1,
            log: [],
            currentHighlightLineId: null,
            isLoopContextActive: false,
            formulaData: null,
        };
        
        initialState.log.push({ message: `<strong>Starting search for ${target}</strong> in array: [${rawArray.join(', ')}]` });
        initialState.log.push({ message: `Interpolation search requires a <strong>sorted array</strong>. Sorting...` });
        if(hasDuplicates) {
            initialState.log.push({ message: `Note: Duplicates were removed for a cleaner search.` });
        }
        initialState.log.push({ message: `Sorted array: [<strong>${sortedArray.join(', ')}</strong>]` });
        initialState.log.push({ message: "Click 'Next Step' to begin the search by initializing variables." });

        return initialState;
    }

    getState() {
        return this._deepCopy(this.history[this.currentStateIndex]);
    }

    isFinished() {
        // We are "finished" if we're at the last frame of the history
        return this.currentStateIndex === this.history.length - 1;
    }
    
    isAtStart() {
        return this.currentStateIndex === 0;
    }
    
    previousStep() {
        if (!this.isAtStart()) {
            this.currentStateIndex--;
        }
    }

    nextStep() {
        if (!this.isFinished()) {
            this.currentStateIndex++;
        }
    }
    
    _log(message, isFormula = false) {
        this.state.log.push({ message, isFormula });
    }
    
    _setHighlight(lineId) {
        this.state.currentHighlightLineId = lineId;
    }

    _setLoopContext(isActive) {
        this.state.isLoopContextActive = isActive;
    }

    _updateFormula(low, high, target, arrLow, arrHigh) {
        this.state.formulaData = {
            lowVal: low,
            highVal: high,
            targetVal: target,
            arrLowVal: arrLow,
            arrHighVal: arrHigh
        };
    }
    
    _finish(found, foundIndex, reason) {
        this.state.isRunning = false; // This stops the precompute loop
        this.state.foundIndex = foundIndex;
        this._setLoopContext(false);
        if (found) {
            this._log(`<strong>Found!</strong> arr[${foundIndex}] (${this.state.sortedArray[foundIndex]}) == target (${this.state.target})`);
        } else {
            this._log(`<h3 class="text-lg font-bold mt-4">Search Finished</h3>`);
            this._log(reason);
            this._log(`<strong>Target ${this.state.target} not found in the array.</strong>`);
        }
    }

    _performStep() {
        const { sortedArray, target } = this.state;
        let { low, high, pos } = this.state;

        // --- FIX: MOVED probe/formula reset to 'check_while' ---
        // this.state.pos = -1;
        // this.state.formulaData = null; 

        switch (this.state.step) {
            case 'init_high':
                this._setHighlight('code-line-2');
                this._log(`Setting <strong>high = n - 1 ➔ ${this.state.high}</strong>`);
                this.state.step = 'init_low';
                break;

            case 'init_low':
                this._setHighlight('code-line-3');
                this._log(`Setting <strong>low ➔ ${this.state.low}</strong>`);
                this.state.step = 'check_while';
                break;

            case 'check_while':
                // --- FIX: Reset probe and formula here, at the start of a new loop ---
                this.state.pos = -1;
                this.state.formulaData = null; 

                this._log(`<h3 class="text-lg font-bold mt-4">Step ${this.state.stepCount} (Check Loop)</h3>`);
                this._setHighlight('code-line-5');
                this._setLoopContext(true);

                if (sortedArray.length === 0) {
                     this._finish(false, -1, "Array is empty.");
                     this._setHighlight('code-line-26');
                     break;
                }
                
                if (low > high) {
                    this._finish(false, -1, `Loop condition failed: low (${low}) > high (${high})`);
                    this._setHighlight('code-line-26');
                    break;
                }

                const conditionLowHigh = low <= high;
                const conditionMinBound = target >= sortedArray[low];
                const conditionMaxBound = target <= sortedArray[high];

                this._log(`Checking while(target >= arr[low] && target <= arr[high] && low <= high)`);
                this._log(`- target >= arr[low]: (${target} >= ${sortedArray[low]}) ➔ <strong>${conditionMinBound}</strong>`);
                this._log(`- target <= arr[high]: (${target} <= ${sortedArray[high]}) ➔ <strong>${conditionMaxBound}</strong>`);
                this._log(`- low <= high: (${low} <= ${high}) ➔ <strong>${conditionLowHigh}</strong>`);

                if (conditionMinBound && conditionMaxBound && conditionLowHigh) {
                    this._log(`➔ Conditions <strong>TRUE</strong>. Entering loop...`);
                    this.state.step = 'check_low_high_equal';
                } else {
                    this._log(`➔ Conditions <strong>FALSE</strong>. Exiting loop...`);
                    this._finish(false, -1, "Loop conditions failed.");
                    this._setHighlight('code-line-26');
                }
                break;

            case 'check_low_high_equal':
                this._setHighlight('code-line-6');
                this._log(`Checking if low == high... (${this.state.low} == ${this.state.high})`);
                if (this.state.low === this.state.high) {
                    this._log(`➔ <strong>TRUE</strong>. Checking if this one element is the target.`);
                    this._setHighlight('code-line-7');
                    this._log(`Checking if arr[low] == value... (${sortedArray[this.state.low]} == ${target})`);
                    if (sortedArray[this.state.low] === target) {
                        this._log(`➔ <strong>TRUE</strong>. Value found.`);
                        this._finish(true, this.state.low);
                        this.state.pos = this.state.low;
                        this._setHighlight('code-line-8');
                    } else {
                        this._log(`➔ <strong>FALSE</strong>. Value not found. Breaking loop.`);
                        this._finish(false, -1, `low == high, but arr[low] != target.`);
                        this._setHighlight('code-line-10');
                    }
                } else {
                    this._log(`➔ <strong>FALSE</strong>. Proceeding to calculate probe.`);
                    this.state.step = 'calculate_probe';
                }
                break;
            
            case 'calculate_probe':
                this._log(`<strong>Calculating probe position...</strong>`);
                this._setHighlight('code-line-13');
                
                this._updateFormula(low, high, target, sortedArray[low], sortedArray[high]);

                let valPos = (target - sortedArray[low]);
                let valRange = (sortedArray[high] - sortedArray[low]);
                let indexRange = (high - low);
                
                pos = (valRange === 0) ? low : low + Math.floor((indexRange * valPos) / valRange);
                
                if (pos < low || pos > high) {
                     this._log(`<span class="text-red-600 font-bold">Calculated position <strong>${pos}</strong> is out of bounds [${low}, ${high}].</span>`);
                     this._log(`This can happen with non-uniformly distributed data. Search terminating.`);
                     this._finish(false, -1, "Calculated probe was out of bounds.");
                     this._setHighlight('code-line-26');
                     break;
                }
                
                this.state.pos = pos;
                this._log(`Probing index <strong>${pos}</strong> (value: <strong class="text-green-600">${sortedArray[pos]}</strong>)`);
                this.state.step = 'check_and_update_probe';
                break;
            
            case 'check_and_update_probe':
                pos = this.state.pos; // Get probe position from state
                
                // --- FIX: Add a check for invalid pos just in case ---
                if (pos === -1) {
                    this._log(`<span class="text-red-600 font-bold">Internal error: Probe position not set.</span>`);
                    this._finish(false, -1, "Internal error.");
                    break;
                }

                this._log(`<h3 class="text-lg font-bold mt-4">Step ${this.state.stepCount} (Compare & Update)</h3>`);
                
                this._setHighlight('code-line-15');
                this._log(`Checking if arr[probe] == value... (${sortedArray[pos]} == ${target})`);
                if (sortedArray[pos] === target) {
                    this._log(`➔ <strong>TRUE</strong>. Value found.`);
                    this._finish(true, pos);
                    this._setHighlight('code-line-16');
                }
                else {
                    this._setHighlight('code-line-18');
                    this._log(`Checking if arr[probe] > value... (${sortedArray[pos]} > ${target})`);
                    if (sortedArray[pos] > target) {
                        this._log(`➔ <strong>TRUE</strong>. Value is too high.`);
                        this.state.high = pos - 1;
                        this._log(`Setting <strong>high ➔ ${this.state.high}</strong>`);
                        this._setHighlight('code-line-19');
                    } else {
                        this._setHighlight('code-line-21');
                        this._log(`➔ <strong>FALSE</strong>. Value must be too low.`);
                        this.state.low = pos + 1;
                        this._log(`Setting <strong>low ➔ ${this.state.low}</strong>`);
                        this._setHighlight('code-line-22');
                    }
                    // --- FIX: Don't reset pos/formula here, it's done in check_while ---
                    // this.state.pos = -1; 
                    // this.state.formulaData = null;
                    this.state.step = 'check_while';
                    this.state.stepCount++;
                }
                break;
        }
    }
    
    _deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}

export default SearchVisualizer;