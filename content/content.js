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

// Listen for messages from web page and pass them along to extension
window.addEventListener("cetusMsgIn", function(msg) {
    chrome.runtime.sendMessage(msg.detail);
}, false);

// Listn for messages from extension and pass them along to web page
chrome.runtime.onMessage.addListener(function(msg) {
    const evt = new CustomEvent("cetusMsgOut", { detail: JSON.stringify(msg) } );

    window.dispatchEvent(evt);
});

const injectScript = function(scriptUrl) {
    const newScript = document.createElement('script');

    newScript.src = chrome.extension.getURL(scriptUrl);

    //(document.head||document.documentElement).appendChild(newScript);
    const injectElement = document.head || document.documentElement;
    injectElement.insertBefore(newScript, injectElement.firstChild);
    newScript.onload = function() {
        newScript.parentNode.removeChild(newScript);
    };
};

const injectCode = function(codeToExecute) {
    const newScript = document.createElement('script');

    newScript.innerHTML = codeToExecute;

    const injectElement = document.head || document.documentElement;
    injectElement.insertBefore(newScript, injectElement.firstChild);
    newScript.onload = function() {
        newScript.parentNode.removeChild(newScript);
    };
};

const storageSet = function(valueObj) {
    chrome.storage.local.set(valueObj);
};

const storageGet = function(key, callback) {
    chrome.storage.local.get(key, callback);
};

// TODO Replace with utility function
storageGet("savedPatches", function(result) {
    if (result !== null) {
        const savedPatches = result.savedPatches;

        const injectPatches = [];

        if (typeof savedPatches !== "undefined") {
            for (let i = 0; i < savedPatches.length; i++) {
                const thisPatch = savedPatches[i];

                // TODO Improve this matching in the future
                if (thisPatch.url == (window.location.host + window.location.pathname) && thisPatch.enabled) {
                    const patchParams = {
                        index: thisPatch.index,
                        bytes: thisPatch.bytes
                    };

                    injectPatches.push(patchParams);
                }
            }

            if (injectPatches.length > 0) {
                const injectPatchesStr = JSON.stringify(injectPatches);

                const code = `const cetusPatches = ${injectPatchesStr};`;

                injectCode(code);
            }
        }
    }

    injectScript("/shared/utils.js");
    injectScript("/shared/wail.min.js/wail.min.js");
    injectScript("/content/thirdparty/stacktrace/stacktrace.min.js");
    injectScript("/content/cetus.js");
    injectScript("/content/init.js");
});
