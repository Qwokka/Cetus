/**
Copyright 2020 Jack Baker

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

const LOG_LEVEL_NONE  = 0;
const LOG_LEVEL_DEBUG  = 1;
const LOG_LEVEL_TRACE  = 2;

const MAX_WATCHPOINTS   = 1;

const MAX_SEARCH_RESULTS = 1000;

class CetusInstanceContainer {
    constructor() {
        if (typeof cetusOptions === "object") {
            this.logLevel = cetusOptions.logLevel;
        }

        this._instances = [];
        this.speedhack = new SpeedHack(1);
    }

    reserveIdentifier() {
        return this._instances.push(null) - 1;
    }

    newInstance(identifier, options) {
        if (this._instances[identifier] !== null) {
            throw new Error("Attempted to use an invalid identifier");
        }

        const newInstance = new Cetus(identifier, options);
        this._instances[identifier] = newInstance;
    }

    _validateIdentifier(identifier) {
        if (!(this._instances[identifier] instanceof Cetus)) {
            throw new Error("Requested invalid identifier " + identifier + " in CetusInstanceContainer");
        }
    }

    get(identifier) {
        this._validateIdentifier(identifier);

        return this._instances[identifier];
    }

    close(identifier) {
        this._validateIdentifier(identifier);

        this._instances[identifier].sendExtensionMessage("instanceQuit");
    }

    closeAll() {
        for (let i = 0; i < this._instances.length; i++) {
            if (this._instances[i] === null) {
                continue;
            }

            this.close(i);
        }
    }
}

class Cetus {
    constructor(identifier, env) {
        this.identifier = identifier;
        this.watchpointExports = env.watchpointExports;

        if (!(env.memory instanceof WebAssembly.Memory)) {
            colorError("Cetus received an invalid memory object! This is a bug!");
        }

        this._memObject = env.memory;
        this._buffer = env.buffer;
        this._symbols = env.symbols;

        this._searchMemory;
        this._searchMemoryType;
        this._searchMemoryTypeStr;
        this._searchMemoryElementSize;

        this._functions = null;

        this._searchSubset = {};
        this._savedMemory  = null;

        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("constructor: Cetus initialized");
        }

        // Inform the extension that we have initialized
        this.sendExtensionMessage("init", {
            url: (window.location.host + window.location.pathname),
            symbols: this._symbols
        });
    }

    sendExtensionMessage(type, msg) {
        const msgBody = {
            id: this.identifier,
            type: type,
            body: msg
        };

        if (cetusInstances !== null && cetusInstances.logLevel >= LOG_LEVEL_TRACE) {
            colorLog("Sending message to extension: " + bigintJsonStringify(msgBody));
        }

        const evt = new CustomEvent("cetusMsgIn", { detail: bigintJsonStringify(msgBody) } );

        window.dispatchEvent(evt);
    };

    createSearchMemory(memTypeStr, memAligned = true) {
        if (memAligned) {
            this._searchMemory = this.alignedMemory(memTypeStr);
        }
        else {
            this._searchMemory = this.unalignedMemory();
        }

        this._searchMemoryTypeStr = memTypeStr;
        this._searchMemoryType = getMemoryType(memTypeStr);
        this._searchMemoryElementSize = getElementSize(memTypeStr);
    }

    // Accessing aligned memory is faster because we can just treat the whole
    // memory object as the relevant typed array (Like Uint32Array)
    // This is not as thorough, however, because we will miss matching values
    // that are not stored at naturally-aligned addresses
    alignedMemory(memTypeStr) {
        const memType = getMemoryType(memTypeStr);

        // We return a new object each time because the WebAssembly.Memory object
        // will detach if it is resized
        return new memType(this._memObject.buffer);
    }

    // When we need to access unaligned memory addresses, we treat memory as a
    // Uint8Array so that we can read at any "real" address
    unalignedMemory() {
        return new Uint8Array(this._memObject.buffer);
    }

    getMemorySize() {
        return this.unalignedMemory().length;
    }

    queryMemory(address, memTypeStr) {
        if (typeof address === "string") {
            address = parseInt(address);
        }

        const memory = this.unalignedMemory();
        const memType = getMemoryType(memTypeStr);
        const memSize = getElementSize(memTypeStr);

        const tempBuf = new Uint8Array(memSize);

        for (let i = 0; i < tempBuf.length; i++) {
            tempBuf[i] = memory[address + i];
        }

        return new memType(tempBuf.buffer)[0];
    }

    queryMemoryChunk(address, length) {
        if (typeof address === "string") {
            address = parseInt(address);
        }

        const memory = this.unalignedMemory();
        const memType = Uint8Array;
        const memSize = 1;

        const tempBuf = new Uint8Array(length);

        for (let i = 0; i < length; i++) {
            tempBuf[i] = memory[address + i];
        }

        return new Uint8Array(tempBuf.buffer);
    }

    // These two functions should typically only be used by the internal search
    // They use pre-loaded values to speed up the process of doing repetitive searches
    _queryMemoryUnalignedQuick(address) {
        const tempBuf = new Uint8Array(this._searchMemoryElementSize);

        address = parseInt(address);

        for (let i = 0; i < this._searchMemoryElementSize; i++) {
            tempBuf[i] = this._searchMemory[address + i];
        }

        return new this._searchMemoryType(tempBuf.buffer)[0];
    }

    _queryMemoryAlignedQuick(address) {
        const memIndex = realAddressToIndex(address, this._searchMemoryTypeStr);

        return this._searchMemory[memIndex];
    }

    restartSearch() {
        this._searchSubset = {};
        this._savedMemory = null;

        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("restartSearch: Search restarted");
        }
    }

    _compare(comparator, memType, memAligned, lowerBound, upperBound) {
        const searchKeys = Object.keys(this._searchSubset);

        if (searchKeys.length == 0) {
            if (memAligned) {
                const memSize = getElementSize(memType);

                for (let i = lowerBound; i <= upperBound; i += memSize) {
                    const currentValue = this._queryMemoryAlignedQuick(i, memType);

                    if (comparator(currentValue) == true) {
                        this._searchSubset[i] = currentValue;
                    }
                }
            }
            else {
                for (let i = lowerBound; i <= upperBound; i++) {
                    const currentValue = this._queryMemoryUnalignedQuick(i, memType);

                    if (comparator(currentValue) == true) {
                        this._searchSubset[i] = currentValue;
                    }
                }
            }
        }
        else {
            for (let entry in this._searchSubset) {
                let currentValue;

                if (memAligned) {
                    currentValue = this._queryMemoryAlignedQuick(entry, memType);
                }
                else {
                    currentValue = this._queryMemoryUnalignedQuick(entry, memType);
                }

                if (cetusInstances.logLevel >= LOG_LEVEL_TRACE) {
                    colorLog("_compare: Looping subset search. Entry: " + entry + "  Value: " + currentValue);
                }                
                
                if (entry < lowerBound || entry > upperBound || comparator(currentValue) == false) {
                    delete this._searchSubset[entry];
                }
                else {
                    this._searchSubset[entry] = currentValue;
                }
            }
        }

        const searchObj = {};

        searchObj.count = Object.keys(this._searchSubset).length;

        // If we try to send too much data to the extension, we'll probably freeze the tab. Instead, if there are too many search results we
        // send the accurate number of results, but don't actually send the matches
        if (searchObj.count <= MAX_SEARCH_RESULTS) {
            searchObj.results = this._searchSubset;
        }
        else {
            searchObj.results = [];
        }

        return searchObj;
    }

    // TODO Should support unaligned searching
    _diffCompare(comparator, memType, lowerBoundIndex, upperBoundIndex) {
        const memory = this.alignedMemory(memType);

        if (Object.keys(this._searchSubset).length == 0) {
            for (let i = lowerBoundIndex; i < upperBoundIndex; i++) {
                if (comparator(memory[i], this._savedMemory[i]) == true) {
                    const realAddress = indexToRealAddress(i, memType);
                    this._searchSubset[realAddress] = memory[i];
                }
            }
        }
        else {
            for (let entryAddr in this._searchSubset) {
                const entryIndex = realAddressToIndex(entryAddr, memType);
                if (entryIndex < lowerBoundIndex ||
                    entryIndex > upperBoundIndex ||
                    comparator(memory[entryIndex], this._savedMemory[entryAddr]) == false) {
                    delete this._searchSubset[entryAddr];
                }
                else {
                    this._searchSubset[entryAddr] = memory[entryIndex];
                }
            }
        }

        this._savedMemory = this._searchSubset;

        const searchObj = {};

        searchObj.count = Object.keys(this._searchSubset).length;

        // If we try to send too much data to the extension, we'll probably freeze the tab. Instead, if there are too many search results we
        // send the accurate number of results, but don't actually send the matches
        if (searchObj.count <= MAX_SEARCH_RESULTS) {
            searchObj.results = this._searchSubset;
        }
        else {
            searchObj.results = [];
        }

        return searchObj;
    }

    search(searchComparison, searchMemType, searchMemAlign, searchParam = null, lowerBound = 0, upperBound = 0xFFFFFFFF) {
        this.createSearchMemory(searchMemType, searchMemAlign);

        const memSize = this.getMemorySize();

        let lowerBoundAddr = parseInt(lowerBound);
        let upperBoundAddr = parseInt(upperBound);

        // If we are searching aligned addresses, we want to make sure our lower bound is aligned
        if (searchMemAlign) {
            lowerBoundAddr -= (lowerBoundAddr % getElementSize(searchMemType));
        }

        if (upperBoundAddr >= memSize) {
            upperBoundAddr = memSize - 1;
        }

        const lowerBoundIndex = realAddressToIndex(lowerBoundAddr, searchMemType);
        const upperBoundIndex = realAddressToIndex(upperBoundAddr, searchMemType);

        let realLowerBoundIndex = lowerBoundIndex;
        let realUpperBoundIndex = upperBoundIndex;

        if (realLowerBoundIndex < 0) {
            realLowerBoundIndex = 0;
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

        let searchResults = {};

        // If searchParam is null or not provided, the user is attempting a differential search
        // If this is the first search of a differential search, we just want to
        // collect a slice of the memory object of that type.
        if (searchParam === null) {
            if (this._savedMemory == null) {
                // TODO Should support unaligned searching
                this._savedMemory = this.alignedMemory(searchMemType).slice(realLowerBoundIndex, realUpperBoundIndex + 1);

                searchResults.count = this._savedMemory.length;

                if (this._savedMemory.length <= MAX_SEARCH_RESULTS) {
                    const realResults = {};

                    for (let i = 0; i < this._savedMemory.length; i++) {
                        const realAddress = indexToRealAddress(realLowerBoundIndex + i, searchMemType);
                        realResults[realAddress] = this._savedMemory[i];
                    }

                    searchResults.results = realResults;
                }
                else {
                    searchResults.results = [];
                }
            }
            else {
                searchResults = this._diffCompare(comparator,
                                                  searchMemType,
                                                  realLowerBoundIndex,
                                                  realUpperBoundIndex);
            }
        }
        else {
            searchResults = this._compare(comparator,
                                          searchMemType,
                                          searchMemAlign,
                                          lowerBoundAddr,
                                          upperBoundAddr);
        }

        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("search: exiting search");
        }

        return searchResults;
    }

    patternSearch(searchMemType, searchParam, lowerBound, upperBound) {
        const result = {};

        let realLowerBound = parseInt(lowerBound);
        let realUpperBound = parseInt(upperBound);

        if (realLowerBound < 0) {
            realLowerBound = 0;
        }

        const memSize = this.getMemorySize();

        if (realUpperBound >= memSize) {
            realUpperBound = memSize - 1;
        }

        let realParam;

        switch (searchMemType) {
            case "ascii":
                realParam = new Uint8Array(searchParam.length);

                for (let i = 0; i < searchParam.length; i++) {
                    realParam[i] = searchParam.charCodeAt(i);
                }

                break;
            case "utf-8":
                const tempBuf = new Uint16Array(searchParam.length);

                for (let i = 0; i < searchParam.length; i++) {
                    realParam[i] = searchParam.charCodeAt(i);
                }

                realParam = new Uint8Array(tempBuf.buffer);

                break;
            case "bytes":
                const split1 = [...searchParam.trim().matchAll(/\\x[0-9a-f]{2}(?![0-9a-z])/gi)];
                const split2 = searchParam.trim().split(/\\x/);

                if ((split1.length != (split2.length - 1)) || split1.length == 0) {
                    // Something is wrong in the byte sequence
                    console.error("Wrong byte sequence format");
                    return;
                }

                split2.shift();

                realParam = new Uint8Array(split2.length);

                for (let i = 0; i < searchParam.length; i++) {
                    realParam[i] = parseInt(split2[i], 16);
                }

                break;
        }

        const searchResults = this.bytesSequence(realParam);

        result.results = {};

        for (let i = 0; i < searchResults.length; i++) {
            const hitAddr = searchResults[i];

            result.results[hitAddr] = searchParam;
        }

        result.count = searchResults.length;

        return result;
    }

    setSpeedhackMultiplier(multiplier) {
        if (bigintIsNaN(multiplier)) {
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

        if (!bigintIsNaN(funcIndex) && typeof this._functions[funcIndex] === "object") {
            return this._functions[funcIndex];
        }
    }

    // Cetus API function used to manually add bookmarks
    addBookmark(memAddr, memType) {
        if (typeof memAddr !== "number") {
            throw new Error("addBookmark() expects argument 0 to be a number");
        }

        if (!isValidMemType(memType)) {
            throw new Error("Invalid memory type in addBookmark()");
        }

        this.sendExtensionMessage("addBookmark", {
            address: memAddr,
            memType: memType
        });
    }

    // Cetus API function for manually modifying memory
    modifyMemory(memAddr, memValue, memTypeStr = "i32") {
        if (typeof memAddr === "string") {
            memAddr = parseInt(memAddr);
        }
        if (typeof memValue === "string") {
            memValue = parseInt(memValue);
        }

        const memory = this.unalignedMemory();
        const memType = getMemoryType(memTypeStr);

        if (memAddr < 0 || memAddr >= memory.length) {
            throw new RangeError("Address out of range in Cetus.modifyMemory()");
        }

        const tempBuf = new memType(1);
        tempBuf[0] = memValue;

        const byteBuf = new Uint8Array(tempBuf.buffer);

        for (let i = 0; i < byteBuf.length; i++) {
            memory[memAddr + i] = byteBuf[i];
        }
    }

    strings(minLength = 4) {
        let ascii =  this.asciiStrings(minLength);
        let unicode = this.unicodeStrings(minLength);

        return ascii.concat(unicode);
    }

    asciiStrings(minLength = 4) {
        if (minLength < 1) {
            console.error("Minimum length must be at least 1!");
            return {
                count: 0,
                results: {}
            };
        }
        else if (minLength < 4) {
            console.warn("Using minimum length " + minLength + ". This will probably return a lot of results!");
        }

        const memory = this.alignedMemory("i8");

        const searchResults = {};
        const results = {};

        let current = [];

        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("asciiStrings: entering ASCII string search");
        }
   
        for (let i = 0; i < memory.length; i++) {
            const thisByte = memory[i];

            if (thisByte >= 0x20 && thisByte < 0x7f) {
                current.push(thisByte);
                continue;
            }

            if (current.length >= minLength) {
                let thisString = "";

                for (let j = 0; j < current.length; j++) {
                    thisString += String.fromCharCode(current[j]);
                }

                results[i - current.length] = thisString;

                if (cetusInstances.logLevel >= LOG_LEVEL_TRACE) {
                    colorLog("asciiStrings: string found: " + thisString);
                }
            }

            current = [];
        }

        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("asciiStrings: exiting ASCII string search");
        }

        searchResults.count = Object.keys(results).length;
        searchResults.results = results;

        return searchResults;
    }

    unicodeStrings(minLength = 4) {
        if (minLength < 1) {
            console.error("Minimum length must be at least 1!");
            return {
                count: 0,
                results: {}
            };
        }
        else if (minLength < 4) {
            console.warn("Using minimum length " + minLength + ". This will probably return a lot of results!");
        }

        const searchResults = {};
        const results = {};

        const memory = this.alignedMemory("i16");

        let current = [];

        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("unicodeStrings: entering UNICODE string search");
        }
    
        for (let i = 0; i < memory.length; i++) {
            const thisByte = memory[i];

            if (thisByte) {
                current.push(thisByte);
                continue;
            }

            if (current.length >= minLength) {
                let thisString = "";

                for (let j = 0; j < current.length; j++) {
                    thisString += String.fromCharCode(current[j]);
                }

                if (thisString.length >= minLength) {
                    results[i - current.length] = thisString;

                    if (cetusInstances.logLevel >= LOG_LEVEL_TRACE) {
                        colorLog("unicodeStrings: string found: " + thisString);
                    }
                }    
            }

            current = [];
        }

        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("unicodeStrings: exiting UNICODE string search");
        }

        searchResults.count = Object.keys(results).length;
        searchResults.results = results;

        return searchResults;
    }

    bytesSequence(bytesSeq) {
        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("bytesSequence: entering bytes sequence search with parameter " + bytesSeq);
        }

        if (bytesSeq.length < 1) {
            console.error("Minimum length must be at least 1!");
            return [];
        }
        else if (bytesSeq.length < 4) {
            console.warn("Sequence length is small: " + bytesSeq.length + ". This will probably return a lot of results!");
        }

        const results = [];

        const memory = this.alignedMemory("i8");

        let match = 0;

        for (let i = 0; i < memory.length; i++) {
            const thisByte = memory[i];

            if (thisByte == bytesSeq[match]) {
                match++;
                continue;
            }
            
            if (match == bytesSeq.length) {

                results.push(i - bytesSeq.length);
                match = 0;

                if (cetusInstances.logLevel >= LOG_LEVEL_TRACE) {
                    colorLog("bytesSequence: sequence found: " + bytesSeq);
                }
            } else {
                match = 0;
            }
        }

        if (cetusInstances.logLevel >= LOG_LEVEL_DEBUG) {
            colorLog("bytesSequence: exiting bytes sequence search");
        }

        return results;
    }
}

// TODO Move speedhack stuff
class SpeedHack {
    constructor(multiplier) {
        this.multiplier = multiplier;

        // Just in case we get injected twice, we need to make sure we don't overwrite
        // the old saved functions
        if (Date.now !== speedHackDateNow) {
            this.oldDn = Date.now;
            Date.now = speedHackDateNow;
        }
        else {
            this.oldDn = cetusInstances.speedhack.oldDn;
        }

        if (performance.now !== speedHackPerformanceNow) {
            this.oldPn = performance.now;
            performance.now = speedHackPerformanceNow;
        }
        else {
            this.oldPn = cetusInstances.speedhack.oldPn;
        }

        this.startDn = this.oldDn.call(Date);
        this.startPn = this.oldPn.call(performance);
    }
}

const speedHackDateNow = function() {
    const sh = cetusInstances.speedhack;

    const real = sh.oldDn.call(Date);
    const elapsed = (real - sh.startDn) * sh.multiplier;

    return Math.floor(sh.startDn + elapsed);
};

const speedHackPerformanceNow = function() {
    const sh = cetusInstances.speedhack;

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

const colorError = function(msg) {
    console.log("%c %c \u{1f419} CETUS %c %c " + msg + " %c %c",
        "background: #858585; padding:5px 0;",
        "color: #eb4034; background: #000000; padding:5px 0;",
        "background: #858585; padding:5px 0;",
        "color: #eb4034; background: #464646; padding:5px 0;",
        "background: #858585; padding:5px 0;",
        "color: #ff2424; background: #fff; padding:5px 0;");
};

// TODO Validation on all these messages
window.addEventListener("cetusMsgOut", function(msgRaw) {
    if (cetusInstances == null) {
        return;
    }

    const msg = bigintJsonParse(msgRaw.detail);

    const msgType = msg.type;
    const msgBody = msg.body;

    if (typeof msgType !== "string") {
        return;
    }
    
    const cetus = cetusInstances.get(msg.id);

    if (typeof cetus === "undefined") {
        return;
    }

    if (cetusInstances !== null && cetusInstances.logLevel >= LOG_LEVEL_TRACE) {
        colorLog("addEventListener: event received: " + JSON.stringify(msg));
    }

    switch (msgType) {
        case "queryMemoryBytes":
            const queryBytesResult = cetus.queryMemoryChunk(msgBody.address, 512);

            cetus.sendExtensionMessage("queryMemoryBytesResult", {
                address: msgBody.address,
                value: queryBytesResult,
            });

            break;
        case "queryMemory":
            const queryAddr = msgBody.address;
            const queryMemType = msgBody.memType;

            if (typeof queryAddr !== "number") {
                return;
            }

            const queryResult = cetus.queryMemory(queryAddr, queryMemType);

            cetus.sendExtensionMessage("queryMemoryResult", {
                address: queryAddr,
                value: queryResult,
                memType: queryMemType
            });

            break;
        case "restartSearch":
            cetus.restartSearch();

            break;
        case "search":
            const searchMemType     = msgBody.memType;
            const searchMemAlign    = msgBody.memAlign;
            const searchComparison  = msgBody.compare;
            const searchLower       = msgBody.lower;
            const searchUpper       = msgBody.upper;
            const searchParam       = msgBody.param;

            let searchReturn;
            let searchResults;
            let searchResultsCount;

            if (searchMemType == "ascii" || searchMemType == "utf-8" || searchMemType == "bytes") {
                searchReturn = cetus.patternSearch(searchMemType, searchParam, searchLower, searchUpper);
            }
            else {
                searchReturn = cetus.search(searchComparison,
                                            searchMemType,
                                            searchMemAlign,
                                            searchParam,
                                            searchLower,
                                            searchUpper);
            }

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

            cetus.sendExtensionMessage("searchResult", {
                count: searchResultsCount,
                results: searchResults,
                memType: searchMemType,
            });

            break;
        // FIXME Upper/lower bounds are not enforced
        case "stringSearch":
            const searchStrType = msgBody.strType;
            const searchStrMinLen = msgBody.minLength;

            let strSearchReturn;

            switch (searchStrType) {
                case "ascii":
                    strSearchReturn = cetus.asciiStrings(searchStrMinLen);
                    break;
                case "utf-8":
                    strSearchReturn = cetus.unicodeStrings(searchStrMinLen);
                    break;
                default:
                    colorError("Got bad string type: " + searchStrType);
                    break;
            }

            let strResultsCount = strSearchReturn.count;
            let strResults = strSearchReturn.results;

            let strSubset = {};

            // We do not want to send too many results or we risk crashing the extension
            // If there are more than 100 results, only send 100 but send the real count
            if (strResultsCount > 100) {
                for (let property in strResults) {
                    strSubset[property] = strResults[property];

                    if (Object.keys(strSubset).length >= 100) {
                        break;
                    }
                }

                strResults = strSubset;
            }

            cetus.sendExtensionMessage("stringSearchResult", {
                count: strResultsCount,
                results: strResults,
            });

            break;
        case "modifyMemory":
            const modifyAddr = msgBody.memAddr;
            const modifyValue = msgBody.memValue;
            const modifyMemType = msgBody.memType;

            if (bigintIsNaN(modifyAddr) || bigintIsNaN(modifyValue) || !isValidMemType(modifyMemType)) {
                return;
            }

            colorLog("Changing "+modifyAddr+" to "+modifyValue+" ("+modifyMemType+")");

            cetus.modifyMemory(modifyAddr, modifyValue, modifyMemType);

            break;
        case "updateWatch":
            const watchIndex = msgBody.index;
            const watchAddr = msgBody.addr;
            const watchSize = msgBody.size;
            const watchFlags = msgBody.flags;

            const watchValue = msgBody.value;

            if (bigintIsNaN(watchIndex) ||
                bigintIsNaN(watchAddr) ||
                bigintIsNaN(watchSize) ||
                bigintIsNaN(watchFlags)) {
                return;
            }

            if (typeof watchValue.lower === "undefined" || typeof watchValue.upper === "undefined") {
                return;
            }

            if (typeof cetus.watchpointExports[watchIndex] === "undefined") {
                return;
            }

            cetus.watchpointExports[watchIndex](watchAddr, watchValue.lower, watchValue.upper, watchSize, watchFlags);

            break;
        case "queryFunction":
            const funcIndex = msgBody.index;
            const lineNum = msgBody.lineNum;

            const funcBytes = cetus.queryFunction(funcIndex);

            if (typeof funcBytes !== "undefined") {
                cetus.sendExtensionMessage("queryFunctionResult", {
                    funcIndex: funcIndex,
                    bytes: funcBytes,
                    lineNum: lineNum
                });
            }

            break;
        case "shEnable":
            const shMultiplier = msgBody.multiplier;

            if (bigintIsNaN(shMultiplier)) {
                return;
            }

            colorLog("Enabling speedhack at "+shMultiplier+"x");

            cetus.setSpeedhackMultiplier(shMultiplier);

            break;
    }
}, false);

if (typeof cetusInstances === "undefined") {
    cetusInstances = new CetusInstanceContainer();
}
