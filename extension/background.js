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

const MAX_WATCHPOINTS = 10;

class WASMInstance {
    constructor(instanceId, url, parentWindow) {
        // The saved instance ID should only be used for actions triggered from the UI. Under other circumstances, it's possible
        // for the saved instance ID is in the middle of an action.
        this.instanceId = instanceId;
        this.url = url;
        this.parentWindow = parentWindow;

        this.contentTab = null;

        let _this = this;
        chrome.tabs.query({ active: true }, function(tabs) {
            // We do not query currentWindow because a detached dev tools panel may break
            // this assumtion. See issue #16
            _this.contentTab = tabs[0];
        });

        // This object is a serializable object containing all the data needed to be passed between the background page and the UI
        this.instanceData = {
            initialized: false,
            url: null,
            bookmarks: {},
            watchpoints: [],
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
    }

    // TODO Is this used?
    reset() {
        this.instanceData = {
            initialized: false,
            url: null,
            bookmarks: {},
            watchpoints: [],
            symbols: {},
            stackTraces: [],
            instances: [],
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
    }

    sendContentMessage(type, msgBody) {
        const msg = {
            id: this.instanceId.split(":")[1],
            type: type,
            body: msgBody
        };

        try {
            chrome.tabs.sendMessage(this.contentTab.id, msg);
        }
        catch (e) {
            // TODO Handle tab closed
            return;
        }
    };

    addBookmark(memAddr, memType) {
        this.instanceData.bookmarks[memAddr] = {
            value: 0,
            memType: memType,
            flags: 0,
        };

        this.updateBookmarks();
    }

    removeBookmark(memAddr) {
        if (typeof this.instanceData.bookmarks[memAddr] === "undefined") {
            return;
        }

        delete this.instanceData.bookmarks[memAddr];
        this.updateBookmarks();

        this.removeWatchpoint(memAddr);
    }

    updateBookmarks() {
        const msgBody = {
            bookmarks: this.instanceData.bookmarks,
        };

        this.parentWindow.sendPopupMessage(this.instanceId, "updateBookmarks", msgBody);
    }

    updateMemView() {
        const msgBody = {
            data: this.instanceData.memoryViewer.memData,
            startAddress: this.instanceData.memoryViewer.startAddress
        };

        this.sendPopupMessage(this.instanceId, "updateMemView", msgBody);
    }

    // Updates the flags of a watchpoint if one already exists for this address
    // Otherwise, adds a new watchpoint, removing the oldest watchpoint if we've hit the cap
    updateWatchpoint(watchAddr, watchValue, newWatchFlags) {
        const bookmark = this.instanceData.bookmarks[watchAddr];

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

        this.instanceData.bookmarks[watchAddr] = bookmark;

        const memType = bookmark.memType;

        const watchSize = getElementSize(memType);

        const realValue = convertToI64(watchValue, memType);

        // First we check if a watchpoint already exists at this address
        let matchIndex = null;

        for (let i = 0; i < MAX_WATCHPOINTS; i++) {
            if (this.instanceData.watchpoints[i] === watchAddr) {
                matchIndex = i;
                break;
            }
        }

        // If this bookmark is not already in our watchpoint list,
        // add it
        if (matchIndex === null) {
            let freeIndex = null;
            for (let i = 0; i < MAX_WATCHPOINTS; i++) {
                if (typeof this.instanceData.watchpoints[i] === "undefined") {
                    freeIndex = i;
                    break;
                }
            }

            if (freeIndex === null) {
                // TODO Report this error to the user instead of failing silently
                return;
            }

            this.instanceData.watchpoints[freeIndex] = watchAddr;
            this._updateWatchpoint(freeIndex);
        }
        else {
            this._updateWatchpoint(matchIndex);

            // If a watchpoint exists for this address and we are trying to
            // set flags to 0, just remove the watchpoint
            if (bookmarkFlags == 0) {
                this.removeWatchpoint(watchAddr);
            }
        }

        this.updateBookmarks();
    }

    _updateWatchpoint(index) {
        const watchAddr = this.instanceData.watchpoints[index];

        const msgBody = {};

        if (typeof watchAddr === "undefined") {
            return;
        }

        const bookmark = this.instanceData.bookmarks[watchAddr];

        const memType = bookmark.memType;

        const realValue = convertToI64(bookmark.value, memType);
        const watchSize = getElementSize(memType);

        msgBody.index = index;
        msgBody.addr = watchAddr;
        msgBody.value = realValue;
        msgBody.size = watchSize;
        msgBody.flags = bookmark.flags;

        this.sendContentMessage("updateWatch", msgBody);
    }

    removeWatchpoint(memAddr) {
        for (let i = 0; i < MAX_WATCHPOINTS; i++) {
            if (this.instanceData.watchpoints[i] == memAddr) {
                this.instanceData.bookmarks[memAddr].flags = 0;
                this._updateWatchpoint(i);

                delete this.instanceData.watchpoints[i]

                break;
            }
        }
    }

    addStackTrace(newTrace) {
        // This hopefully shouldn't happen anymore but let's be sure
        if (typeof this.instanceData.stackTraces === "undefined") {
            this.instanceData.stackTraces = [];
        }
        this.instanceData.stackTraces.push(newTrace);
    }
}

class WindowInstance {
    constructor() {
        this.instances = [];
        this.instanceId = null;

        // We do not need a separate popupChannel for each instance because they all connect to the same popup window
        this._popupChannel = null;
        this._popupConnect();

        this.searchMemType = null;

        this.pendingSearch = false;
        this.pendingStringSearch = false;
        this.pendingFunctionIndex = null;
    }

    _popupConnect() {
        const targetWindow = this;

        const popupDisconnectListener = function() {
            targetWindow._popupChannel = null;
        }

        // This listener receives messages sent from the popup or devtools UI
        const popupMessageListener = function(msg, msgSource) {
            const msgType = msg.type;
            const msgBody = msg.body;

            if (typeof msgType !== "string") {
                return true;
            }

            const currentInstance = targetWindow.currentInstance();

            switch (msgType) {
                case "popupConnected":
                    targetWindow.popupRestore();

                    break;
                case "search":
                    const forwardMsg = {};

                    const searchValue = msgBody.param;
                    const searchMemType = msgBody.memType;
                    const searchMemAlign = msgBody.memAlign;
                    const searchComp = msgBody.compare;
                    const searchLower = msgBody.lower;
                    const searchUpper = msgBody.upper;

                    currentInstance.instanceData.searchForm.inProgress = true;

                    currentInstance.instanceData.searchForm.value = searchValue;
                    currentInstance.instanceData.searchForm.valueType = searchMemType;
                    currentInstance.instanceData.searchForm.memAlign = searchMemAlign;
                    currentInstance.instanceData.searchForm.comparison = searchComp;
                    currentInstance.instanceData.searchForm.rangeLower = searchLower;
                    currentInstance.instanceData.searchForm.rangeUpper = searchUpper;

                    forwardMsg.param = searchValue;
                    forwardMsg.memType = searchMemType;
                    forwardMsg.memAlign = searchMemAlign;
                    forwardMsg.compare = searchComp;
                    forwardMsg.lower = searchLower;
                    forwardMsg.upper = searchUpper;

                    currentInstance.sendContentMessage("search", forwardMsg);

                    targetWindow.pendingSearch = true;
                    
                    break;
                case "restartSearch":
                    currentInstance.instanceData.searchForm.inProgress = false;

                    currentInstance.instanceData.searchForm.results.count = 0;
                    currentInstance.instanceData.searchForm.results.object = {};

                    currentInstance.sendContentMessage("restartSearch");

                    break;
                case "addBookmark":
                    const bookmarkMemAddr = msgBody.memAddr;
                    const bookmarkMemType = msgBody.memType;

                    targetWindow.currentInstance().addBookmark(bookmarkMemAddr, bookmarkMemType);

                    break;
                case "removeBookmark":
                    const removeMemAddr = msgBody.memAddr;

                    if (bigintIsNaN(removeMemAddr)) {
                        return true;
                    }

                    targetWindow.currentInstance().removeBookmark(removeMemAddr);

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

                    currentInstance.sendContentMessage("modifyMemory", newMsgBody);

                    const bookmark = targetWindow.currentInstance().instanceData.bookmarks[modifyMemAddr];

                    if (typeof bookmark !== "object") {
                        return true;
                    }

                    bookmark.value = modifyMemValue;

                    targetWindow.currentInstance().instanceData.bookmarks[modifyMemAddr] = bookmark;

                    const bookmarkFlags = bookmark.flags;

                    // If we're updating the value of a bookmark, we also want to update
                    // its associated watchpoint to the same value
                    if (bookmarkFlags) {
                        targetWindow.currentInstance().updateWatchpoint(modifyMemAddr, modifyMemValue, 0);
                    }

                    break;
                case "updateWatchpoint":
                    const watchMemAddr = msgBody.memAddr;
                    const watchMemValue = msgBody.memValue;

                    const flags = msgBody.flags;

                    targetWindow.currentInstance().updateWatchpoint(watchMemAddr, watchMemValue, flags);

                    break;
                case "stringSearch":
                    const strType = msgBody.strType;
                    const strLower = msgBody.lower;
                    const strUpper = msgBody.upper;
                    const strMin = msgBody.minLength;

                    currentInstance.sendContentMessage("stringSearch", {
                        strType: strType,
                        lower: strLower,
                        upper: strUpper,
                        minLength: strMin,
                    });

                    targetWindow.currentInstance().instanceData.stringForm.strType = strType;
                    targetWindow.currentInstance().instanceData.stringForm.strMinLen = strMin;

                    targetWindow.pendingStringSearch = true;

                    break;
                case "queryFunction":
                    const funcIndex = msgBody.index;
                    const lineNum = msgBody.lineNum;

                    if (typeof funcIndex !== "string" || bigintIsNaN(funcIndex) || funcIndex === "") {
                        return true;
                    }

                    targetWindow.pendingFunctionIndex = funcIndex;

                    if (typeof lineNum === "number") {
                        currentInstance.sendContentMessage("queryFunction", {
                            index: funcIndex,
                            lineNum: lineNum
                        });
                    }
                    else {
                        currentInstance.sendContentMessage("queryFunction", {
                            index: funcIndex
                        });
                    }
                    break;
                case "shToggle":
                    const shNewEnabled = !targetWindow.currentInstance().instanceData.speedhack.enabled;

                    targetWindow.currentInstance().instanceData.speedhack.enabled = shNewEnabled;

                    if (shNewEnabled) {
                        const shMultiplier = msgBody.multiplier;

                        targetWindow.currentInstance().instanceData.speedhack.multiplier = shMultiplier;

                        currentInstance.sendContentMessage("shEnable", {
                            multiplier: shMultiplier
                        });
                    }
                    else {
                        // We "disable" the speedhack by setting its multiplier to 1x
                        // Otherwise we would potentially travel "back in time"
                        currentInstance.sendContentMessage("shEnable", {
                            multiplier: 1
                        });
                    }

                    break;
                case "memToggle":
                    targetWindow.currentInstance().instanceData.memoryViewer.enabled = msgBody.enabled;
                    targetWindow.currentInstance().instanceData.memoryViewer.startAddress = msgBody.startAddress;

                    break;
                case "instanceChange":
                    const newInstance = msgBody.id;

                    if (targetWindow.getInstance(newInstance) === null) {
                        return true;
                    }

                    targetWindow.instanceId = newInstance;
                    targetWindow.popupRestore();
                    break;
            }

            return true;
        };

        if (typeof chrome.extension.onConnect !== "undefined") {
            chrome.extension.onConnect.addListener(function(channel) {
                if (targetWindow._popupChannel !== null) {
                    return;
                }

                targetWindow._popupChannel = channel;

                targetWindow._popupChannel.onMessage.addListener(popupMessageListener);
                targetWindow._popupChannel.onDisconnect.addListener(popupDisconnectListener);
            });
        }
        else {
            browser.runtime.onConnect.addListener(function(channel) {
                if (targetWindow._popupChannel !== null) {
                    return;
                }

                targetWindow._popupChannel = channel;

                targetWindow._popupChannel.onMessage.addListener(popupMessageListener);
                targetWindow._popupChannel.onDisconnect.addListener(popupDisconnectListener);
            });
        }
    }

    popupRestore() {
        const currentInstance = this.currentInstance();

        const popupData = {
            instances: this.getInstanceData()
        }

        if (currentInstance !== null) {
            popupData.instanceData = currentInstance.instanceData;
        }

        this.sendPopupMessage(this.instanceId, "popupRestore", popupData);
    }

    sendPopupMessage(instanceId, type, msgBody) {
        if (this.getInstance(instanceId) === null) {
            return;
        }

        if (this._popupChannel !== null) {
            const msg = {
                type: type,
                id: instanceId
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
        else {
            throw new Error("this._popupChannel closed prematurely");
        }
    }

    addInstance(instanceId, pageUrl) {
        if (this.getInstance(instanceId) !== null) {
            return;
        }

        // Don't change the selected instance ID unless no ID is selected
        if (this.instanceId === null) {
            this.instanceId = instanceId;
        }

        const newInstance = new WASMInstance(instanceId, pageUrl, this);
        this.instances.push(newInstance);
        return newInstance;
    }

    getInstance(instanceId) {
        for (let i = 0; i < this.instances.length; i++) {
            const thisInstance = this.instances[i];

            if (thisInstance.instanceId === instanceId) {
                return thisInstance;
            }
        }

        return null;
    }

    currentInstance() {
        return this.getInstance(this.instanceId);
    }

    getInstanceData() {
        const result = [];

        for (let i = 0; i < this.instances.length; i++) {
            const thisInstance = this.instances[i];

            const instanceData = {
                id: thisInstance.instanceId,
                url: thisInstance.url
            }

            if (thisInstance.instanceId === this.instanceId) {
                instanceData.selected = true;
            }
            else {
                instanceData.selected = false;
            }

            result.push(instanceData);
        }

        return result;
    }

    removeInstance(targetInstance) {
        this.instances.splice(this.instances.indexOf(targetInstance), 1); 

        if (this.instances.length > 0) {
            this.instanceId = this.instances[0].instanceId;

            this.popupRestore();
        }
        else {
            this.sendPopupMessage(targetInstance, "reset", {});

            this.instanceId = null;
        }
    }
}

class BackgroundExtension {
    windows = {};

    addWindow(windowId) {
        const newWindow = new WindowInstance();
        this.windows[windowId] = newWindow;

        return newWindow;
    }

    getWindow(windowId) {
        if (typeof this.windows[windowId] === "object") {
            return this.windows[windowId];
        }

        return null;
    }
}

bgExtension = new BackgroundExtension();

// This listener receives commands directly from the page
// As such, all inputs should be treated as untrusted
chrome.runtime.onMessage.addListener(function(msgRaw, msgSender) {
    const msg = bigintJsonParse(msgRaw);

    const msgType = msg.type;
    const msgBody = msg.body;

    const msgSrcWindow = msgSender.documentId;
    const msgSrcInstance = msgSrcWindow + ":" + msg.id;

    if (typeof msgType !== "string") {
        return true;
    }

    let targetWindow = null;
    let targetInstance = null;

    if (msgType !== "init") {
        targetWindow = bgExtension.getWindow(msgSrcWindow);

        if (targetWindow === null) {
            return true;
        }

        targetInstance = targetWindow.getInstance(msgSrcInstance);

        if (targetInstance === null) {
            return true;
        }
    }

    switch (msgType) {
        case "init":
            const pageUrl = msgBody.url;
            const symbols = msgBody.symbols;

            if (typeof pageUrl !== "string") {
                return true;
            }

            if (typeof symbols !== "object") {
                return true;
            }

            if (targetWindow === null) {
                targetWindow = bgExtension.addWindow(msgSrcWindow);
            }

            const newInstance = targetWindow.addInstance(msgSrcInstance, pageUrl);

            newInstance.instanceData.initialized = true;
            newInstance.instanceData.url = pageUrl;
            newInstance.instanceData.symbols = symbols;

            targetWindow.sendPopupMessage(msgSrcInstance, "init", {
                url: pageUrl,
                symbols: symbols,
            });

            break;
        case "queryMemoryBytesResult":
            const bytesAddress = msgBody.address;
            const bytesValue = msgBody.value;

            targetInstance.instanceData.memoryViewer.memData = bytesValue;

            if (targetInstance.instanceId == this.instanceId) {
                targetWindow.updateMemView();
            }

            break;
        case "queryMemoryResult":
            const address = msgBody.address;
            const value = msgBody.value;
            const memType = msgBody.memType;

            if (typeof address !== "number" ||
                typeof value !== "number" ||
                !isValidMemType(memType)) {
                console.warn("Got bad queryMemoryResult: address " + address + " value " + value);
                return true;
            }

            if (typeof targetWindow.currentInstance().instanceData.bookmarks[address] !== "object") {
                return true;
            }

            targetWindow.currentInstance().instanceData.bookmarks[address].value = value;
            targetWindow.currentInstance().updateBookmarks();

            break;
        case "searchResult":
            if (!targetWindow.pendingSearch) {
                return true;
            }

            const resultCount = msgBody.count;
            const resultObject = msgBody.results;
            const resultMemType = msgBody.memType;

            if (typeof resultCount !== "number" ||
                typeof resultObject !== "object" ||
                !isValidMemType(resultMemType)) {
                return true;
            }

            // All keys in resultObject should be numeric. If not, toss the whole thing
            for (let entry in resultObject) {
                if (bigintIsNaN(entry)) {
                    return true;
                }
            }

            targetInstance.instanceData.searchForm.results.count = resultCount;
            targetInstance.instanceData.searchForm.results.object = resultObject;

            targetInstance.instanceData.searchForm.valueType = resultMemType;

            targetWindow.passthruPopupMessage(msg);

            targetWindow.pendingSearch = false;

            break;
        case "addBookmark":
            const bookmarkAddress = msgBody.address;
            const bookmarkMemType = msgBody.memType;

            if (typeof bookmarkAddress !== "number" || !isValidMemType(bookmarkMemType)) {
                return true;
            }

            targetWindow.currentInstance().addBookmark(bookmarkAddress, bookmarkMemType);

            break;
        case "stringSearchResult":
            if (!targetWindow.pendingStringSearch) {
                return true;
            }

            const count = msgBody.count;
            const resultObj = msgBody.results;

            if (typeof count !== "number" || typeof resultObj !== "object") {
                return true;
            }

            // All keys in resultObject should be numeric. If not, toss the whole thing
            for (let entry in resultObj) {
                if (bigintIsNaN(entry)) {
                    return true;
                }
            }

            targetInstance.instanceData.stringForm.results.count = count;
            targetInstance.instanceData.stringForm.results.object = resultObj;

            targetWindow.passthruPopupMessage(msg);

            targetWindow.pendingStringSearch = false;

            break;
        case "queryFunctionResult":
            if (typeof msgBody.bytes !== "object") {
                return true;
            }

            const funcIndex = msgBody.funcIndex;

            // Here we confirm two things:
            //  1. We have requested the content script query a function
            //  2. This result corresponds to the function we queried
            //
            // If either of these are not true, drop the message
            if (funcIndex !== targetWindow.pendingFunctionIndex) {
                return true;
            }

            targetWindow.pendingFunctionIndex = null;

            const funcArray = Object.values(msgBody.bytes);
            const funcBytes = new Uint8Array(funcArray);
            const lineNum = msgBody.lineNum;

            if (typeof lineNum === "number") {
                targetWindow.sendPopupMessage(msgSrcInstance, "queryFunctionResult", {
                    funcIndex: funcIndex,
                    bytes: funcBytes,
                    lineNum: lineNum
                });
            }
            else {
                targetWindow.sendPopupMessage(msgSrcInstance, "queryFunctionResult", {
                    funcIndex: funcIndex,
                    bytes: funcBytes
                });
            }

            break;
        case "watchPointHit":
            const stackTrace = msgBody.stackTrace;

            // We should not receive a watchPointHit message if we have no
            // bookmarks
            if (Object.keys(targetWindow.currentInstance().instanceData.bookmarks).length == 0) {
                return true;
            }

            if (!(stackTrace instanceof Array)) {
                return true;
            }

            const savedTrace = [];

            // Here we validate that the contents of the stack trace are at least
            // somewhat sane
            for (let i = 0; i < stackTrace.length; i++) {
                const thisFrame = stackTrace[i];

                const fileName = thisFrame.fileName;
                let lineNumber = thisFrame.lineNumber;

                if (typeof fileName !== "string") {
                    return true;
                }

                // Stacktrace.js does not return a line number on FireFox
                if (typeof lineNumber !== "number") {
                    const index = fileName.lastIndexOf(":");

                    if (index === -1 || index >= fileName.length - 1) {
                        return true;
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

            targetWindow.getInstance(msgSrcInstance).addStackTrace(savedTrace);

            targetWindow.sendPopupMessage(msgSrcInstance, "watchPointHit", {
                stackTrace: savedTrace
            });

            break;
        case "instanceQuit":
            targetWindow.removeInstance(targetInstance);

            targetWindow.sendPopupMessage(msgSrcInstance, "instanceQuit");

            break;
    }

    return true;
});

setInterval(function() {
    let allWindows = bgExtension.windows;

    for (let key in allWindows) {
        const thisWindow = allWindows[key];
        const currentInstance = thisWindow.currentInstance();

        if (currentInstance === null) {
            return;
        }

        for (const address of Object.keys(currentInstance.instanceData.bookmarks)) {
            const memType = currentInstance.instanceData.bookmarks[address].memType;

            currentInstance.sendContentMessage("queryMemory", {
                address: parseInt(address),
                memType: memType,
            });
        }
    }
}, 1000);

setInterval(function() {
    let allWindows = bgExtension.windows;

    for (let key in allWindows) {
        const thisWindow = allWindows[key];
        const currentInstance = thisWindow.currentInstance();

        if (currentInstance === null) {
            return;
        }

        if (currentInstance.instanceData.memoryViewer.enabled) {
            sendContentMessage("queryMemoryBytes", {
                address: thisWindow.instanceData.memoryViewer.startAddress,
            });
        }
    }
}, 250);
