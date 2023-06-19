/**
Copyright 2023 Jack Baker

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

const ENABLE_WP_NONE  = 0;
const ENABLE_WP_READ  = 1;
const ENABLE_WP_WRITE = 2;
const ENABLE_WP_ALL   = ENABLE_WP_READ | ENABLE_WP_WRITE;

const optionDefaults = {
    logLevel: 0,
    enableWatchpoints: ENABLE_WP_ALL
}

const loadOptions = function(callback) {
    let updateOptions = false;

    chrome.storage.local.get("savedOptions", function(optionValues) {
        if (typeof optionValues.savedOptions === "undefined") {
            optionValues = optionDefaults;
            updateOptions = true;
        }
        else {
            optionValues = optionValues.savedOptions;

            const defaultKeys = Object.keys(optionDefaults);

            for (let i = 0; i < defaultKeys.length; i++) {
                const key = defaultKeys[i];

                if (typeof optionValues[key] === "undefined") {
                    optionValues[key] = optionDefaults[key];
                    updateOptions = true;
                }
            }
        }

        if (updateOptions) {
            saveOptions(optionValues);
        }

        callback(optionValues);
    });
}

const saveOptions = function(newOptions) {
    chrome.storage.local.set({ savedOptions: newOptions });
}
