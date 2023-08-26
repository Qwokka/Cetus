const updateOptions = function(optionValues) {
    const selectEnableWatch = document.getElementById("selectEnableWatchpoints");
    selectEnableWatch.value = optionValues.enableWatchpoints;

    const selectLogLevel = document.getElementById("selectLogLevel");
    selectLogLevel.value = optionValues.logLevel;

    const rangeWPCount = document.getElementById("rangeWPCount");
    rangeWPCount.value = optionValues.value;
}

document.getElementById("buttonSaveOptions").onclick = function() {
    const newOptions = {};

    const selectLogLevel = document.getElementById("selectLogLevel");
    newOptions.logLevel = selectLogLevel.value;

    const selectEnableWatch = document.getElementById("selectEnableWatchpoints");
    newOptions.enableWatchpoints = selectEnableWatch.value;

    const rangeWPCount = document.getElementById("rangeWPCount");
    newOptions.wpCount = rangeWPCount.value;

    saveOptions(newOptions);
}

document.getElementById("rangeWPCount").oninput = function(e) {
    document.getElementById("outputWPCount").innerText = e.target.value;
}

loadOptions(updateOptions);
