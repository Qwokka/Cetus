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

const MAX_STACKTRACES = 10;

class PopupExtension {
    constructor() {
        if (typeof chrome.extension.connect !== "undefined") {
            this._bgChannel = chrome.extension.connect({ name: "Cetus Background Page"});
        }
        else {
            this._bgChannel = browser.runtime.connect({ name: "Cetus Background Page"});
        }

        this._bgChannel.onMessage.addListener(bgMessageListener);

        this.sendBGMessage("popupConnected");

        this._patches = [];
        this._loadPatchesFromStorage();

        this._stackTraces = [];

        this.symbols = {};

        this.unlocked = false;

        let _this = this;
        loadOptions(function(savedOptions) {
            _this.options = savedOptions;
        });
    }

    sendBGMessage(type, msgBody) {
        if (this._bgChannel !== null) {
            const msg = {
                type: type
            };

            if (typeof msgBody !== "undefined") {
                msg.body = msgBody;
            }

            // TODO Actually handle port closed error
            try {
                this._bgChannel.postMessage(msg);
            }
            catch (err) {
                return;
            }
        }
    }

    unlock() {
        const overlay = document.getElementById("lockOverlay");
        overlay.classList.remove("overlay");
        const button = document.getElementById("overlayLoadPatchModalButton");
        button.style.display = "none";
        this.unlocked = true;
    }

    reset() {
        updateBookmarkTable({}, this.options.enableWatchpoints);

        document.getElementById("restartBtn").click();            

        document.getElementById("functionInput").value = "";
        document.getElementById("codeDisassembly").innerText = "";

        const textArea = document.querySelector("textarea.prism-live");
        textArea.value = "";

        // Prism Live only updates the text area on an input event
        // So we issue a fake input event to make it update
        textArea.dispatchEvent(new Event("input"));

        const overlay = document.getElementById("lockOverlay");
        overlay.classList.add("overlay");
        const button = document.getElementById("overlayLoadPatchModalButton");
        button.style.display = "block";

        closeLoadPatchModal();
        closeSavePatchModal();
        closeStackTraceModal();

        this.unlocked = false;

        let _this = this;
        loadOptions(function(savedOptions) {
            _this.options = savedOptions;
        });
    }

    addBookmark(memAddr, memType) {
        const msgBody = {
            memAddr: memAddr,
            memType: memType
        };

        this.sendBGMessage("addBookmark", msgBody);
    }

    removeBookmark(memAddr) {
        this.sendBGMessage("removeBookmark", {
            memAddr: memAddr,
        });
    }

    _loadPatchesFromStorage() {
        chrome.storage.local.get("savedPatches", function(result) {
            if (result !== null) {
                if (typeof result.savedPatches !== "undefined") {
                    extension._patches = result.savedPatches;
                }
            }
        });
    }

    _updatePatches() {
        chrome.storage.local.set({ savedPatches: this._patches });
    }

    // TODO Remove backwards compatibility code once we've stopped supporting the old patch spec
    savePatch(options) {
        const patchName = options.name;

        let functionPatches;

        if (typeof options.version === "undefined" && typeof options.index !== "undefined" && typeof options.bytes !== "undefined") {
            const funcIndex = options.index;
            const funcBytes = options.bytes;

            functionPatches = [
                {
                    index: funcIndex,
                    bytes: funcBytes,
                }
            ];
        }
        else {
            functionPatches = options.functionPatches;
        }

        const binaryUrl = options.url;

        const newPatchBody = {
            name: patchName,
            url: binaryUrl,
            version: options.version,
            enabled: true,
            functionPatches: functionPatches,
            callbacks: options.callbacks,
        };

        this._patches.push(newPatchBody);
        this._updatePatches();
    }

    getPatches() {
        return this._patches;
    }

    getPatchesByUrl(url) {
        const allPatches = this.getPatches();

        const results = [];

        for (let i = 0; i < allPatches.length; i++) {
            const thisPatch = allPatches[i];

            if (thisPatch.url === url) {
                results.push(thisPatch);
            }
        }

        return results;
    }

    getPatchByName(patchName) {
        if (typeof patchName !== 'string') {
            return;
        }

        const allPatches = this.getPatches();

        for (let i = 0; i < allPatches.length; i++) {
            const thisPatch = allPatches[i];

            if (thisPatch.name === patchName) {
                return thisPatch;
            }
        }
    }

    enablePatchByName(patchName) {
        if (typeof patchName !== 'string') {
            return;
        }

        const allPatches = this.getPatches();

        for (let i = 0; i < allPatches.length; i++) {
            const thisPatch = allPatches[i];

            if (thisPatch.name === patchName) {
                this._patches[i].enabled = true;

                this._updatePatches();

                break;
            }
        }
    }

    disablePatchByName(patchName) {
        if (typeof patchName !== 'string') {
            return;
        }

        const allPatches = this.getPatches();

        for (let i = 0; i < allPatches.length; i++) {
            const thisPatch = allPatches[i];

            if (thisPatch.name === patchName) {
                this._patches[i].enabled = false;

                this._updatePatches();

                break;
            }
        }
    }

    exportPatchByName(patchName) {
        if (typeof patchName !== 'string') {
            return false;
        }

        const allPatches = this.getPatches();

        for (let i = 0; i < allPatches.length; i++) {
            const thisPatch = allPatches[i];

            if (thisPatch.name === patchName) {
                return JSON.stringify(thisPatch);
            }
        }
    }

    downloadPatchByName(patchName) {
        const patchFilename = patchName + ".json";
        const patchString = this.exportPatchByName(patchName);

        downloadText(patchFilename, patchString);
    }

    deletePatchByName(patchName) {
        if (typeof patchName !== 'string') {
            return false;
        }

        const allPatches = this.getPatches();

        for (let i = 0; i < allPatches.length; i++) {
            const thisPatch = allPatches[i];

            if (thisPatch.name === patchName) {
                this._patches.splice(i, 1);

                this._updatePatches();

                break;
            }
        }
    }

    clearPatches() {
        this._patches = [];

        this._updatePatches();
    }

    getStackTraces() {
        return this._stackTraces;
    }

    addStackTrace(newStackTrace) {
        this._stackTraces.push(newStackTrace);

        while (this._stackTraces.length > MAX_STACKTRACES) {
            this._stackTraces.shift();
        }
    }
}

const bgMessageListener = function(msgRaw) {
    const msg = bigintJsonParse(msgRaw);

    const type = msg.type;
    const msgBody = msg.body;
    const instanceId = msg.id;

    switch (type) {
        case "init":
            if (!extension.unlocked) {
                extension.unlock();

                extension.url = msgBody.url;
                extension.symbols = msgBody.symbols;

                updateInstances({
                    url: msgBody.url,
                    id: instanceId,
                });
            }
            else {
                addNewInstanceSelector(msgBody.url, instanceId);
            }

            break;
        case "popupRestore":
            if (!extension.unlocked) {
                extension.unlock();
            }

            const instanceData = msgBody.instanceData;

            extension.url = instanceData.url;
            extension.symbols = instanceData.symbols;
            extension.searchMemType = instanceData.searchForm.valueType;

            updateSearchForm(instanceData.searchForm);
            updateStringSearchForm(instanceData.stringForm);
            updateSpeedhackForm(instanceData.speedhack);
            updateStackTraceTable(instanceData.stackTraces);
            updateBookmarkTable(instanceData.bookmarks, extension.options.enableWatchpoints);

            updateInstances(msgBody.instances);

            break;
        case "searchResult":
            const resultCount = msgBody.count;
            const resultObject = msgBody.results;
            const resultMemType = msgBody.memType;

            if (typeof resultCount !== "number" || typeof resultObject !== "object") {
                return true;
            }

            updateSearchResults(resultCount, resultObject, resultMemType);

            break;
        case "updateBookmarks":
            const bookmarks = msgBody.bookmarks;

            updateBookmarkTable(bookmarks, extension.options.enableWatchpoints);

            break;
        case "updateMemView":
            const memData = msgBody.data;
            const memDataStartAddress = msgBody.startAddress;
			
            let len = Object.keys(memData).length;
            document.getElementById("memViewData").value = "";

            let counter = 0;
            let row = "";
            let txt = "";
            let c = 0;
            for (let i=0; i<32; i++)
            {
                row += toHex(memDataStartAddress+16*i) + " ";
                txt = "";
                for (let k=0; k<16; k++)
                {
                    row += toHexByte(memData[c]) + " ";
                    if (memData[c] > 32 && memData[c] < 127)
                        txt += String.fromCharCode(memData[c]);
                    else
                        txt += ".";

                    c++;
                }
                row += " " + txt + "\n";
            }
            document.getElementById("memViewData").value = row;
		
            break;
        case "stringSearchResult":
            const strResultCount = msgBody.count;
            const strResultObj = msgBody.results;

            updateStringSearchResults(strResultCount, strResultObj);

            break;
        case "queryFunctionResult":
            if (typeof msgBody.bytes !== "object") {
                return true;
            }

            const funcIndex = msgBody.funcIndex;
            const funcArray = Object.values(msgBody.bytes);
            const funcBytes = new Uint8Array(funcArray);

            const givenLineNum = msgBody.lineNum;

            const disassembly = disassembleFunction(funcBytes);
            const funcText = disassembly.text;

            const realLineNum = disassembly.lineNums[givenLineNum];

            updatePatchWindow(funcIndex, funcText, realLineNum);

            changeTab("tabPatchButton");

            break;
        case "watchPointHit":
            const stackTrace = msgBody.stackTrace;

            extension.addStackTrace(stackTrace);

            updateStackTraceTable(extension.getStackTraces());

            break;
        case "reset":
            extension.reset();

            break;
    }

    return true;
};

// TODO Rename this variable (Maybe "popup"?)
extension = new PopupExtension();
