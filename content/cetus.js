/**
Copyright 2019 Jack Baker

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const FLAG_WATCH_WRITE  = 1 << 0;
const FLAG_WATCH_READ   = 1 << 1;
const FLAG_FREEZE       = 1 << 2;

const MAX_WATCHPOINTS   = 1;

class Cetus {
    constructor(env) {
        this.watchpointExports = env.watchpointExports;

        this._memObject = env.memory;
        this._buffer = env.buffer;
        this._symbols = env.symbols;

        this._functions = null;

        this._searchSubset = {};
        this._savedMemory  = null;
        this._savedLowerBound = 0;

        this.speedhack = new SpeedHack(1);

        // Inform the extension that we have initialized
        sendExtensionMessage("init", {
            url: window.location.href,
            symbols: this._symbols
        });
    }

    memory(type) {
        const memType = this.getMemoryType(type);

        // We return a new object each time because the WebAssembly.Memory object
        // will detach if it is resized
        return new memType(this._memObject.buffer);
    }

    // TODO Remove from class?
    getMemoryType(type) {
        switch (type) {
            case "i8":
                return Uint8Array;
            case "i16":
                return Uint16Array;
            case "i32":
                return Uint32Array;
            case "i64":
                return BigInt64Array;
            case "f32":
                return Float32Array;
            case "f64":
                return Float64Array;
            default:
                throw new Error("Invalid memory type " + type + " in getMemoryType()");
        }
    }

    queryMemory(memIndex, memType) {
        const memory = this.memory(memType);

        return memory[memIndex];
    }

    restartSearch() {
        this._searchSubset = {};
        this._savedMemory = null;
        this._savedLowerBound = 0;
    }

    _compare(comparator, memType, lowerBound, upperBound) {
        const memory = this.memory(memType);

        const searchKeys = Object.keys(this._searchSubset);

        if (searchKeys.length == 0) {
            for (let i = lowerBound; i <= upperBound; i++) {
                const currentValue = memory[i];

                if (comparator(currentValue) == true) {
                    this._searchSubset[i] = currentValue;
                }
            }
        }
        else {
            for (let entry in this._searchSubset) {
                const currentValue = memory[entry];

                if (entry < lowerBound || entry > upperBound || comparator(currentValue) == false) {
                    delete this._searchSubset[entry];
                }
                else {
                    this._searchSubset[entry] = currentValue;
                }
            }
        }

        return this._searchSubset;
    }

    _diffCompare(comparator, memType, lowerBound, upperBound) {
        const memory = this.memory(memType);

        if (Object.keys(this._searchSubset).length == 0) {
            for (let i = 0; i < this._savedMemory.length; i++) {
                const adjustedIndex = this._savedLowerBound + i;
                if (comparator(memory[adjustedIndex], this._savedMemory[i]) == true) {
                    this._searchSubset[adjustedIndex] = memory[adjustedIndex];
                }
            }
        }
        else {
            for (let entry in this._searchSubset) {
                if (entry < lowerBound ||
                    entry > upperBound ||
                    comparator(memory[entry], this._savedMemory[entry]) == false) {
                    delete this._searchSubset[entry];
                }
                else {
                    this._searchSubset[entry] = memory[entry];
                }
            }
        }

        this._savedMemory = this._searchSubset;

        return this._searchSubset;
    }

    search(searchComparison, searchMemType, searchParam, lowerBound = 0, upperBound = 0xFFFFFFFF) {
        const memory = this.memory(searchMemType);

        let realLowerBound = parseInt(lowerBound);
        let realUpperBound = parseInt(upperBound);

        if (realLowerBound < 0) {
            realLowerBound = 0;
        }

        if (realUpperBound >= memory.length) {
            realUpperBound = memory.length - 1;
        }

        let comparator;

        switch (searchComparison) {
            case "eq":
                comparator = (searchParam !== null) ? 
                    ((memValue) => memValue == searchParam) :
                    ((current, saved) => current == saved);
                break;
            case "ne":
                comparator = (searchParam !== null) ? 
                    ((memValue) => memValue != searchParam) :
                    ((current, saved) => current != saved);
                break;
            case "lt":
                comparator = (searchParam !== null) ? 
                    ((memValue) => memValue < searchParam) :
                    ((current, saved) => current < saved);
                break;
            case "lte":
                comparator = (searchParam !== null) ? 
                    ((memValue) => memValue <= searchParam) :
                    ((current, saved) => current <= saved);
                break;
            case "gt":
                comparator = (searchParam !== null) ? 
                    ((memValue) => memValue > searchParam) :
                    ((current, saved) => current > saved);
                break;
            case "gte":
                comparator = (searchParam !== null) ? 
                    ((memValue) => memValue >= searchParam) :
                    ((current, saved) => current >= saved);
                break;
            default:
                throw new Error("Invalid search comparison " + searchComparison);
        }

        const searchResults = {};

        // If searchParam is null, the user is attempting a differential search
        // If this is the first search of a differential search, we just want to
        // collect a slice of the memory object of that type.
        if (searchParam === null) {
            if (this._savedMemory == null) {
                // Upper bound is inclusive
                this._savedMemory = this.memory(searchMemType).slice(realLowerBound, realUpperBound + 1);
                this._savedLowerBound = realLowerBound;

                searchResults.count = this._savedMemory.length;
                searchResults.results = [];
            }
            else {
                let searchReturn = this._diffCompare(comparator,
                                                     searchMemType,
                                                     realLowerBound,
                                                     realUpperBound);

                searchResults.count = Object.keys(searchReturn).length;
                searchResults.results = searchReturn;
            }
        }
        else {
            let searchReturn = this._compare(comparator,
                                             searchMemType,
                                             realLowerBound,
                                             realUpperBound);

            searchResults.count = Object.keys(searchReturn).length;
            searchResults.results = searchReturn;
        }

        return searchResults;
    }

    setSpeedhackMultiplier(multiplier) {
        if (isNaN(multiplier)) {
            return;
        }

        this.speedhack.multiplier = multiplier;
    }

    _resolveFunctions() {
        const wail = new WailParser(this._buffer);

        const results = {};

        wail.addCodeElementParser(null, function(funcOptions) {
            const funcIndex = funcOptions.index;

            results[funcIndex] = funcOptions.bytes;
        
            return false;
        });

        wail.parse();

        this._functions = results;

        // As is, this._buffer is only used to resolve functions so it's safe to get rid
        // of it once functions have been resolved
        this._buffer = null;
    }

    queryFunction(funcIndex) {
        if (this._functions === null) {
            this._resolveFunctions();
        }

        if (!isNaN(funcIndex) && typeof this._functions[funcIndex] === "object") {
            return this._functions[funcIndex];
        }
    }

    // Cetus API function used to manually add bookmarks
    addBookmark(memIndex, memType) {
        if (typeof memIndex !== "number") {
            throw new Error("addBookmark() expects argument 0 to be a number");
        }

        if (!isValidMemType(memType)) {
            throw new Error("Invalid memory type in addBookmark()");
        }

        sendExtensionMessage("addBookmark", {
            index: memIndex,
            memType: memType
        });
    }

    // Cetus API function for manually modifying memory
    // TODO Properly deal with misaligned addresses
    modifyMemory(memAddr, memValue, memType = "i32") {
        const memory = this.memory(memType);

        const memIndex = realAddressToIndex(memAddr, memType);

        if (memIndex < 0 || memIndex >= memory.length) {
            throw new RangeError("Address out of range in Cetus.modifyMemory()");
        }

        memory[memIndex] = memValue;
    }
}

// TODO Move speedhack stuff
class SpeedHack {
    constructor(multiplier) {
        this.multiplier = multiplier;

        this.oldDn = Date.now;
        this.oldPn = performance.now;

        this.startDn = this.oldDn.call(Date);
        this.startPn = this.oldPn.call(performance);

        Date.now = speedHackDateNow;
        performance.now = speedHackPerformanceNow;
    }
}

const speedHackDateNow = function() {
    const sh = cetus.speedhack;

    const real = sh.oldDn.call(Date);
    const elapsed = (real - sh.startDn) * sh.multiplier;

    return sh.startDn + elapsed;
};

const speedHackPerformanceNow = function() {
    const sh = cetus.speedhack;

    const real = sh.oldPn.call(performance);
    const elapsed = (real - sh.startPn) * sh.multiplier;

    return sh.startPn + elapsed;
};

// TODO Change the look of this
const colorLog = function(msg) {
    console.log("%c %c \u{1f419} CETUS %c %c " + msg + " %c %c",
        "background: #858585; padding:5px 0;",
        "color: #FFFFFF; background: #000000; padding:5px 0;",
        "background: #858585; padding:5px 0;",
        "color: #FFFFFF; background: #464646; padding:5px 0;",
        "background: #858585; padding:5px 0;",
        "color: #ff2424; background: #fff; padding:5px 0;");
};

const isValidMemType = function(memType) {
    switch (memType) {
        case "i8":
        case "i16":
        case "i32":
        case "f32":
        case "i64":
        case "f64":
            return true;
        default:
            return false;
    }
};

const indexToRealAddress = function(memIndex, memType) {
    const memSize = getElementSize(memType);

    return memIndex * memSize;
};

const realAddressToIndex = function(memAddr, memType) {
    const memSize = getElementSize(memType);

    return Math.floor(memAddr / memSize);
};

const getElementSize = function(type) {
    let indexSize;

    switch (type) {
        case "i8":
            indexSize = 1;
            break;
        case "i16":
            indexSize = 2;
            break;
        case "i32":
            indexSize = 4;
            break;
        case "i64":
            indexSize = 8;
            break;
        case "f32":
            indexSize = 4;
            break;
        case "f64":
            indexSize = 8;
            break;
        default:
            throw new Error("Invalid memory type " + type + " in getElementSize()");
    }

    return indexSize;
};

// Event will be captured by content.js and passed along to the extension
const sendExtensionMessage = function(type, msg) {
    const msgBody = {
        type: type,
        body: msg
    };

    const evt = new CustomEvent("cetusMsgIn", { detail: JSON.stringify(msgBody) } );

    window.dispatchEvent(evt);
};

// TODO Validation on all these messages
window.addEventListener("cetusMsgOut", function(msgRaw) {
    if (cetus == null) {
        return;
    }

    const msg = JSON.parse(msgRaw.detail);

    const msgType = msg.type;
    const msgBody = msg.body;

    if (typeof msgType !== "string") {
        return;
    }

    switch (msgType) {
        case "queryMemory":
            const queryIndex = msgBody.index;
            const queryMemType = msgBody.memType;

            if (typeof queryIndex !== "number") {
                return;
            }

            const queryResult = cetus.queryMemory(queryIndex, queryMemType);

            sendExtensionMessage("queryMemoryResult", {
                index: queryIndex,
                value: queryResult,
                memType: queryMemType
            });

            break;
        case "restartSearch":
            cetus.restartSearch();

            break;
        case "search":
            const searchMemType     = msgBody.memType;
            const searchComparison  = msgBody.compare;
            const searchLower       = msgBody.lower;
            const searchUpper       = msgBody.upper;
            const searchParam       = msgBody.param;

            let searchReturn;
            let searchResults;
            let searchResultsCount;

            searchReturn = cetus.search(searchComparison,
                                         searchMemType,
                                         searchParam,
                                         searchLower,
                                         searchUpper);

            searchResultsCount = searchReturn.count;
            searchResults = searchReturn.results;

            let subset = {};

            // We do not want to send too many results or we risk crashing the extension
            // If there are more than 100 results, only send 100 but send the real count
            if (searchResultsCount > 100) {
                for (let property in searchResults) {
                    subset[property] = searchResults[property];

                    if (Object.keys(subset).length >= 100) {
                        break;
                    }
                }

                searchResults = subset;
            }

            sendExtensionMessage("searchResult", {
                count: searchResultsCount,
                results: searchResults,
                memType: searchMemType,
            });

            break;
        case "modifyMemory":
            const modifyIndex = msgBody.memIndex;
            const modifyValue = msgBody.memValue;
            const modifyMemType = msgBody.memType;

            if (isNaN(modifyIndex) || isNaN(modifyValue) || !isValidMemType(modifyMemType)) {
                return;
            }

            console.log("Changing "+modifyIndex+" to "+modifyValue+" ("+modifyMemType+")");

            const memory = cetus.memory(modifyMemType);

            memory[modifyIndex] = modifyValue;

            break;
        case "updateWatch":
            const watchIndex = msgBody.index;
            const watchAddr = msgBody.addr;
            const watchValue = msgBody.value;
            const watchSize = msgBody.size;
            const watchFlags = msgBody.flags;

            if (isNaN(watchIndex) ||
                isNaN(watchAddr) ||
                isNaN(watchValue) ||
                isNaN(watchSize) ||
                isNaN(watchFlags)) {
                return;
            }

            if (typeof cetus.watchpointExports[watchIndex] === "undefined") {
                return;
            }

            cetus.watchpointExports[watchIndex](watchAddr, watchValue, watchSize, watchFlags);

            break;
        case "queryFunction":
            const funcIndex = msgBody.index;
            const lineNum = msgBody.lineNum;

            const funcBytes = cetus.queryFunction(funcIndex);

            if (typeof funcBytes !== "undefined") {
                sendExtensionMessage("queryFunctionResult", {
                    funcIndex: funcIndex,
                    bytes: funcBytes,
                    lineNum: lineNum
                });
            }

            break;
        case "shEnable":
            const shMultiplier = msgBody.multiplier;

            if (isNaN(shMultiplier)) {
                return;
            }

            console.log("Enabling speedhack at "+shMultiplier+"x");

            cetus.setSpeedhackMultiplier(shMultiplier);

            break;
    }
}, false);
