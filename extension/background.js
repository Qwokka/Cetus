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

const MAX_WATCHPOINTS = 1;

const FLAG_WATCH_WRITE  = 1 << 0;
const FLAG_WATCH_READ   = 1 << 1;
const FLAG_FREEZE       = 1 << 2;

class BackgroundExtension {
    constructor() {
        this.bookmarks = {};
        this._watchpoints = [];

        this.searchMemType = null;

        this.cetusUrl = null;

        this._popupChannel = null;
        this._popupConnect();

        this.popupData = {
            initialized: false,
            url: null,
            bookmarks: {},
            symbols: {},
            stackTraces: [],
            searchForm: {
                inProgress: false,
                value: "",
                type: null,
                comparison: "eq",
                valueType: "i32",
                memAlign: true,
                rangeUpper: "",
                rangeLower: "",
                results: {
                    count: 0,
                    object: {},
                },
            },
            stringForm: {
                strType: "ascii",
                strMinLen: 4,
                results: {
                    count: 0,
                    object: {},
                }
            },
            patchForm: {
                funcIndex: null,
                funcBody: "",
            },
            speedhack: {
                enabled: false,
                multiplier: 2,
            },
            memoryViewer: {
                enabled: false,
                startAddress: 0x00000000,
                memData: {},
            },
            // FIXME This isn't used, but we should update the current tab for the popup view
            currentTab: "tabSearch",
        };

        this.pendingSearch = false;
        this.pendingStringSearch = false;
        this.pendingFunctionIndex = null;
    }

    _popupConnect() {
        if (typeof chrome.extension.onConnect !== "undefined") {
            chrome.extension.onConnect.addListener(function(channel) {
                bgExtension._popupChannel = channel;

                bgExtension._popupChannel.onMessage.addListener(popupMessageListener);
                bgExtension._popupChannel.onDisconnect.addListener(popupDisconnectListener);
            });
        }
        else {
            browser.runtime.onConnect.addListener(function(channel) {
                bgExtension._popupChannel = channel;

                bgExtension._popupChannel.onMessage.addListener(popupMessageListener);
                bgExtension._popupChannel.onDisconnect.addListener(popupDisconnectListener);
            });
        }
    }

    popupRestore() {
        this.sendPopupMessage("popupRestore", this.popupData);
    }

    sendPopupMessage(type, msgBody) {
        if (this._popupChannel !== null) {
            const msg = {
                type: type
            };

            if (typeof msgBody !== "undefined") {
                msg.body = msgBody;
            }

            // TODO Actually handle port closed error
            try {
                const msgStr = bigintJsonStringify(msg);

                this._popupChannel.postMessage(msgStr);
            }
            catch (err) {
                return;
            }
        }
    }

    passthruPopupMessage(msg) {
        if (this._popupChannel !== null) {
            const msgStr = bigintJsonStringify(msg);

            this._popupChannel.postMessage(msgStr);
        }
    }

    reset() {
        this.popupData = {
            initialized: false,
            url: null,
            bookmarks: {},
            symbols: {},
            stackTraces: [],
            searchForm: {
                value: "",
                comparison: "eq",
                valueType: "i32",
                memAlign: true,
                rangeUpper: "",
                rangeLower: "",
                results: {
                    count: 0,
                    object: {},
                },
            },
            patchForm: {
                funcIndex: null,
                funcBody: "",
            },
            stringForm: {
                strType: "ascii",
                strMinLen: 4,
                results: {
                    count: 0,
                    object: {},
                }
            },
            speedhack: {
                multiplier: null,
            },
            memoryViewer: {
                enabled: false,
                startAddress: 0x00000000,
                memData: {}
            },
            currentTab: "tabSearch",
        };

        this.popupRestore();
    }

    addBookmark(memAddr, memType) {
        this.bookmarks[memAddr] = {
            value: 0,
            memType: memType,
            flags: 0,
        };

        this.updateBookmarks();
    }

    removeBookmark(memAddr) {
        if (typeof this.bookmarks[memAddr] === "undefined") {
            return;
        }

        delete this.bookmarks[memAddr];
        this.updateBookmarks();

        this.removeWatchpoint(memAddr);
    }

    updateBookmarks() {
        const msgBody = {
            bookmarks: this.bookmarks,
        };

        this.sendPopupMessage("updateBookmarks", msgBody);
    }

    updateMemView() {
        const msgBody = {
            data: this.popupData.memoryViewer.memData,
            startAddress: this.popupData.memoryViewer.startAddress
        };

        this.sendPopupMessage("updateMemView", msgBody);
    }

    // Updates the flags of a watchpoint if one already exists for this address
    // Otherwise, adds a new watchpoint, removing the oldest watchpoint if we've hit the cap
    updateWatchpoint(watchAddr, watchValue, newWatchFlags) {
        const bookmark = this.bookmarks[watchAddr];

        if (typeof bookmark !== "object") {
            throw new Error("Bad address "+watchAddr+" in updateWatchpoint()");
        }

        let bookmarkFlags = bookmark.flags;

        if (bookmarkFlags & newWatchFlags) {
            bookmarkFlags &= ~newWatchFlags;
        }
        else {
            bookmarkFlags |= newWatchFlags;
        }

        bookmark.flags = bookmarkFlags;
        bookmark.value = watchValue;

        this.bookmarks[watchAddr] = bookmark;

        const memType = bookmark.memType;

        const watchSize = getElementSize(memType);

        const realValue = convertToI64(watchValue, memType);

        // First we check if a watchpoint already exists at this address
        let matchIndex = null;

        for (let i = 0; i < MAX_WATCHPOINTS; i++) {
            if (this._watchpoints[i] == watchAddr) {
                matchIndex = i;
                break;
            }
        }

        // If this bookmark is not already in our watchpoint list,
        // add it. If necessary, remove the oldest watchpoint
        if (matchIndex === null) {
            // We want to "shift" the oldest watchpoint away if we've hit capacity
            while (this._watchpoints.length >= MAX_WATCHPOINTS) {
                const shiftedAddr = this._watchpoints.shift();

                // We also need to update the flags for the affected bookmark
                this.bookmarks[shiftedAddr].flags = 0;
            }

            this._watchpoints.push(watchAddr);
        }
        else {
            // If a watchpoint exists for this address and we are trying to
            // set flags to 0, just remove the watchpoint
            if (bookmarkFlags == 0) {
                this.removeWatchpoint(watchAddr);
            }
        }

        this._updateWatchpoints();
        this.updateBookmarks();
    }

    _updateWatchpoints() {
        for (let i = 0; i < MAX_WATCHPOINTS; i++) {
            const watchAddr = this._watchpoints[i];

            const msgBody = {};

            if (typeof watchAddr !== "undefined") {
                const bookmark = this.bookmarks[watchAddr];

                const memType = bookmark.memType;

                const realValue = convertToI64(bookmark.value, memType);
                const watchSize = getElementSize(memType);

                msgBody.index = i;
                msgBody.addr = watchAddr;
                msgBody.value = realValue;
                msgBody.size = watchSize;
                msgBody.flags = bookmark.flags;
            }
            else {
                msgBody.index = i;
                msgBody.addr = 0;
                msgBody.value = 0;
                msgBody.size = 0;
                msgBody.flags = 0;
            }

            sendContentMessage("updateWatch", msgBody);
        }
    }

    removeWatchpoint(memAddr) {
        for (let i = 0; i < MAX_WATCHPOINTS; i++) {
            if (this._watchpoints[i] == memAddr) {
                this._watchpoints.splice(i, 1); 

                this._updateWatchpoints();

                break;
            }
        }
    }

    addStackTrace(newTrace) {
        // This hopefully shouldn't happen anymore but let's be sure
        if (typeof this.popupData.stackTraces === "undefined") {
            this.popupData.stackTraces = [];
        }
        this.popupData.stackTraces.push(newTrace);
    }
}

// This listener receives messages sent from the popup or devtools UI
const popupMessageListener = function(msg) {
    const msgType = msg.type;
    const msgBody = msg.body;

    if (typeof msgType !== "string") {
        return;
    }

    switch (msgType) {
        case "popupConnected":
            bgExtension.popupRestore();

            break;
        case "search":
            const forwardMsg = {};

            const searchValue = msgBody.param;
            const searchMemType = msgBody.memType;
            const searchMemAlign = msgBody.memAlign;
            const searchComp = msgBody.compare;
            const searchLower = msgBody.lower;
            const searchUpper = msgBody.upper;

            bgExtension.popupData.searchForm.inProgress = true;

            bgExtension.popupData.searchForm.value = searchValue;
            bgExtension.popupData.searchForm.valueType = searchMemType;
            bgExtension.popupData.searchForm.memAlign = searchMemAlign;
            bgExtension.popupData.searchForm.comparison = searchComp;
            bgExtension.popupData.searchForm.rangeLower = searchLower;
            bgExtension.popupData.searchForm.rangeUpper = searchUpper;

            forwardMsg.param = searchValue;
            forwardMsg.memType = searchMemType;
            forwardMsg.memAlign = searchMemAlign;
            forwardMsg.compare = searchComp;
            forwardMsg.lower = searchLower;
            forwardMsg.upper = searchUpper;

            sendContentMessage("search", forwardMsg);

            bgExtension.pendingSearch = true;
            
            break;
        case "restartSearch":
            bgExtension.popupData.searchForm.inProgress = false;

            bgExtension.popupData.searchForm.results.count = 0;
            bgExtension.popupData.searchForm.results.object = {};

            sendContentMessage("restartSearch");

            break;
        case "addBookmark":
            const bookmarkMemAddr = msgBody.memAddr;
            const bookmarkMemType = msgBody.memType;

            bgExtension.addBookmark(bookmarkMemAddr, bookmarkMemType);

            break;
        case "removeBookmark":
            const removeMemAddr = msgBody.memAddr;

            if (bigintIsNaN(removeMemAddr)) {
                return;
            }

            bgExtension.removeBookmark(removeMemAddr);

            break;
        case "modifyMemory":
            const modifyMemAddr = msgBody.memAddr;
            const modifyMemValue = msgBody.memValue;
            const modifyMemType = msgBody.memType;

            const modifyMemIndex = realAddressToIndex(modifyMemAddr, modifyMemType);

            const newMsgBody = {
                memAddr: modifyMemAddr,
                memValue: modifyMemValue,
                memType: modifyMemType
            };

            sendContentMessage("modifyMemory", newMsgBody);

            const bookmark = bgExtension.bookmarks[modifyMemAddr];

            if (typeof bookmark !== "object") {
                return;
            }

            bookmark.value = modifyMemValue;

            bgExtension.bookmarks[modifyMemAddr] = bookmark;

            const bookmarkFlags = bookmark.flags;

            // If we're updating the value of a bookmark, we also want to update
            // its associated watchpoint to the same value
            if (bookmarkFlags) {
                bgExtension.updateWatchpoint(modifyMemAddr, modifyMemValue, 0);
            }

            break;
        case "updateWatchpoint":
            const watchMemAddr = msgBody.memAddr;
            const watchMemValue = msgBody.memValue;

            const flags = msgBody.flags;

            bgExtension.updateWatchpoint(watchMemAddr, watchMemValue, flags);

            break;
        case "stringSearch":
            const strType = msgBody.strType;
            const strLower = msgBody.lower;
            const strUpper = msgBody.upper;
            const strMin = msgBody.minLength;

            sendContentMessage("stringSearch", {
                strType: strType,
                lower: strLower,
                upper: strUpper,
                minLength: strMin,
            });

            bgExtension.popupData.stringForm.strType = strType;
            bgExtension.popupData.stringForm.strMinLen = strMin;

            bgExtension.pendingStringSearch = true;

            break;
        case "queryFunction":
            const funcIndex = msgBody.index;
            const lineNum = msgBody.lineNum;

            if (typeof funcIndex !== "string" || bigintIsNaN(funcIndex) || funcIndex === "") {
                return;
            }

            bgExtension.pendingFunctionIndex = funcIndex;

            if (typeof lineNum === "number") {
                sendContentMessage("queryFunction", {
                    index: funcIndex,
                    lineNum: lineNum
                });
            }
            else {
                sendContentMessage("queryFunction", {
                    index: funcIndex
                });
            }
            break;
        case "shToggle":
            const shNewEnabled = !bgExtension.popupData.speedhack.enabled;

            bgExtension.popupData.speedhack.enabled = shNewEnabled;

            if (shNewEnabled) {
                const shMultiplier = msgBody.multiplier;

                bgExtension.popupData.speedhack.multiplier = shMultiplier;

                sendContentMessage("shEnable", {
                    multiplier: shMultiplier
                });
            }
            else {
                // We "disable" the speedhack by setting its multiplier to 1x
                // Otherwise we would potentially travel "back in time"
                sendContentMessage("shEnable", {
                    multiplier: 1
                });
            }

            break;
        case "memToggle":
            bgExtension.popupData.memoryViewer.enabled = msgBody.enabled;
            bgExtension.popupData.memoryViewer.startAddress = msgBody.startAddress;

            break;
    }
};

const popupDisconnectListener = function() {
    bgExtension._popupChannel = null;
};

bgExtension = new BackgroundExtension();

// This listener receives commands directly from the page
// As such, all inputs should be treated as untrusted
chrome.runtime.onMessage.addListener(function(msgRaw) {
    const msg = bigintJsonParse(msgRaw);

    const msgType = msg.type;
    const msgBody = msg.body;

    if (typeof msgType !== "string") {
        return;
    }

    switch (msgType) {
        case "init":
            if (bgExtension.popupData.initialized) {
                return;
            }

            const pageUrl = msgBody.url;
            const symbols = msgBody.symbols;

            if (typeof pageUrl !== "string") {
                return;
            }

            if (typeof symbols !== "object") {
                return;
            }

            bgExtension.popupData.initialized = true;
            bgExtension.popupData.url = pageUrl;
            bgExtension.popupData.symbols = symbols;

            bgExtension.sendPopupMessage("init", {
                url: pageUrl,
                symbols: symbols
            });

            break;
        case "queryMemoryBytesResult":
            const bytesAddress = msgBody.address;
            const bytesValue = msgBody.value;

            bgExtension.popupData.memoryViewer.memData = bytesValue;
            bgExtension.updateMemView();

            break;
        case "queryMemoryResult":
            const address = msgBody.address;
            const value = msgBody.value;
            const memType = msgBody.memType;

            if (typeof address !== "number" ||
                typeof value !== "number" ||
                !isValidMemType(memType)) {
                console.warn("Got bad queryMemoryResult: address " + address + " value " + value);
                return;
            }

            if (typeof bgExtension.bookmarks[address] !== "object") {
                return;
            }

            bgExtension.bookmarks[address].value = value;
            bgExtension.updateBookmarks();

            break;
        case "searchResult":
            if (!bgExtension.pendingSearch) {
                return;
            }

            const resultCount = msgBody.count;
            const resultObject = msgBody.results;
            const resultMemType = msgBody.memType;

            if (typeof resultCount !== "number" ||
                typeof resultObject !== "object" ||
                !isValidMemType(resultMemType)) {
                return;
            }

            // All keys in resultObject should be numeric. If not, toss the whole thing
            for (let entry in resultObject) {
                if (bigintIsNaN(entry)) {
                    return;
                }
            }

            bgExtension.popupData.searchForm.results.count = resultCount;
            bgExtension.popupData.searchForm.results.object = resultObject;

            bgExtension.popupData.searchForm.valueType = resultMemType;

            bgExtension.passthruPopupMessage(msg);

            bgExtension.pendingSearch = false;

            break;
        case "addBookmark":
            const bookmarkAddress = msgBody.address;
            const bookmarkMemType = msgBody.memType;

            if (typeof bookmarkAddress !== "number" || !isValidMemType(bookmarkMemType)) {
                return;
            }

            bgExtension.addBookmark(bookmarkAddress, bookmarkMemType);

            break;
        case "stringSearchResult":
            if (!bgExtension.pendingStringSearch) {
                return;
            }

            const count = msgBody.count;
            const resultObj = msgBody.results;

            if (typeof count !== "number" || typeof resultObj !== "object") {
                return;
            }

            // All keys in resultObject should be numeric. If not, toss the whole thing
            for (let entry in resultObj) {
                if (bigintIsNaN(entry)) {
                    return;
                }
            }

            bgExtension.popupData.stringForm.results.count = count;
            bgExtension.popupData.stringForm.results.object = resultObj;

            bgExtension.passthruPopupMessage(msg);

            bgExtension.pendingStringSearch = false;

            break;
        case "queryFunctionResult":
            if (typeof msgBody.bytes !== "object") {
                return;
            }

            const funcIndex = msgBody.funcIndex;

            // Here we confirm two things:
            //  1. We have requested the content script query a function
            //  2. This result corresponds to the function we queried
            //
            // If either of these are not true, drop the message
            if (funcIndex !== bgExtension.pendingFunctionIndex) {
                return;
            }

            bgExtension.pendingFunctionIndex = null;

            const funcArray = Object.values(msgBody.bytes);
            const funcBytes = new Uint8Array(funcArray);
            const lineNum = msgBody.lineNum;

            if (typeof lineNum === "number") {
                bgExtension.sendPopupMessage("queryFunctionResult", {
                    funcIndex: funcIndex,
                    bytes: funcBytes,
                    lineNum: lineNum
                });
            }
            else {
                bgExtension.sendPopupMessage("queryFunctionResult", {
                    funcIndex: funcIndex,
                    bytes: funcBytes
                });
            }

            break;
        case "watchPointHit":
            const stackTrace = msgBody.stackTrace;

            // We should not receive a watchPointHit message if we have no
            // bookmarks
            if (Object.keys(bgExtension.bookmarks).length == 0) {
                return;
            }

            if (!(stackTrace instanceof Array)) {
                return;
            }

            const savedTrace = [];

            // Here we validate that the contents of the stack trace are at least
            // somewhat sane
            for (let i = 0; i < stackTrace.length; i++) {
                const thisFrame = stackTrace[i];

                const fileName = thisFrame.fileName;
                let lineNumber = thisFrame.lineNumber;

                if (typeof fileName !== "string") {
                    return;
                }

                // Stacktrace.js does not return a line number on FireFox
                if (typeof lineNumber !== "number") {
                    const index = fileName.lastIndexOf(":");

                    if (index === -1 || index >= fileName.length - 1) {
                        return;
                    }

                    lineNumber = fileName.substring(index + 1);
                }
                // Save only filename and line number, we don't need any other
                // values that might potentially be in the frame object
                const savedFrame = {};

                savedFrame.fileName = fileName;
                savedFrame.lineNumber = lineNumber;

                savedTrace.push(savedFrame);
            }

            bgExtension.addStackTrace(savedTrace);

            bgExtension.sendPopupMessage("watchPointHit", {
                stackTrace: savedTrace
            });

            break;
        case "reset":
            bgExtension.reset();

            bgExtension.sendPopupMessage("reset");

            break;
    }
});

setInterval(function() {
    for (const address of Object.keys(bgExtension.bookmarks)) {
        const memType = bgExtension.bookmarks[address].memType;

        sendContentMessage("queryMemory", {
            address: parseInt(address),
            memType: memType,
        });
    }
}, 1000);

setInterval(function() {
	if (bgExtension.popupData.memoryViewer.enabled) {
		sendContentMessage("queryMemoryBytes", {
			address: bgExtension.popupData.memoryViewer.startAddress,
		});
	}
}, 250);
