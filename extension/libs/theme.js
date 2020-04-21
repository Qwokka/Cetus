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

const colorScheme = {
    DARK: {
        background: "#1F2430",
        lightBackground: "#232934",
        text: "#FFFFFF",
        textGray: "#D8D8D8",
        grayInactive: "#2A303E",
        placeholder: "rgba(255, 255, 255, 0.8)",
        label: "rgba(255, 255, 255, 0.4)",
        toggleColorBackground: "#5352ED",
        toggleColorFill: "#FFF",
        inputBorder: "#434B5B",
        caretColor: "rgb(255, 255, 255)",
    },

    WHITE: {
        background: "#F1F2F6",
        lightBackground: "#FFFFFF",
        text: "#333333",
        textGray: "#333333",
        grayInactive: "#F9F9F9",
        placeholder: "#333333",
        label: "rgba(51, 51, 51, 0.4)",
        toggleColorBackground: "#FFF",
        toggleColorFill: "#A4B0BE",
        inputBorder: "#A4B0BE",
        caretColor: "rgb(0, 0, 0)",
    }
};

const setColorScheme = function(type) {
    Object.entries(colorScheme[type]).forEach(entity =>
        document.documentElement.style.setProperty(`--${entity[0]}`, entity[1])
    );
};

document.getElementById("toggleColorScheme").onclick = function() {
    storageGet("colorScheme", function(result) {
        const colorScheme = result.colorScheme;

        if (colorScheme == "DARK") {
            storageSet({colorScheme: "WHITE"});
            setColorScheme("WHITE");
        }
        else {
            storageSet({colorScheme: "DARK"});
            setColorScheme("DARK");
        }
    });
};

// Set the selected theme when the extension window opens
storageGet("colorScheme", function(result) {
        const colorScheme = result.colorScheme;

        if (colorScheme == "WHITE") {
            setColorScheme("WHITE");
        }
        else {
            setColorScheme("DARK");
        }
});
