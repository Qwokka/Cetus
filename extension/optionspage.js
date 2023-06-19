const updateOptions = function(optionValues) {
    const selectEnableWatch = document.getElementById("selectEnableWatchpoints");
    selectEnableWatch.value = optionValues.enableWatchpoints;

    const selectLogLevel = document.getElementById("selectLogLevel");
    selectLogLevel.value = optionValues.logLevel;
}

document.getElementById("buttonSaveOptions").onclick = function(e) {
    const newOptions = {};

    const selectLogLevel = document.getElementById("selectLogLevel");
    newOptions.logLevel = selectLogLevel.value;

    const selectEnableWatch = document.getElementById("selectEnableWatchpoints");
    newOptions.enableWatchpoints = selectEnableWatch.value;

    saveOptions(newOptions);
}

loadOptions(updateOptions);
