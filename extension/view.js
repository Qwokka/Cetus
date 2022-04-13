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

document.getElementById('memViewPrevPage').onclick = function(e) {
	let currentAddress = parseInt(document.getElementById("memViewStartAddress").value);
	let newAddress = currentAddress - 0x200;
	if (newAddress < 0) newAddress = 0;
	document.getElementById("memViewStartAddress").value = toHex(newAddress);

	enableMemView(newAddress);
};

document.getElementById('memViewNextPage').onclick = function(e) {
	let currentAddress = parseInt(document.getElementById("memViewStartAddress").value);
	let newAddress = currentAddress + 0x200;
	if (newAddress > 0xFFFFFFFF) newAddress = 0xFFFFFFFF;
	document.getElementById("memViewStartAddress").value = toHex(newAddress);
	
	enableMemView(newAddress);
};

document.getElementById('restartBtn').onclick = function(e) {
	e.preventDefault();

	extension.sendBGMessage('restartSearch');

	document.getElementById('resultsTitle').innerHTML = '';
	document.getElementById('results').innerHTML = '';

	document.getElementById('searchParam').value = '';
	document.getElementById('searchLower').value = '';
	document.getElementById('searchUpper').value = '';

    enableSearchFormTypes();
    enableSearchFormCompare();
    enableSearchFormAlignment();

	e.target.disabled = true;
};

// TODO We need to disable the comparison and type fields when doing a string/byte sequence search
document.getElementById('searchForm').onsubmit = function(e) {
	e.preventDefault();

	const form = document.getElementById('searchForm');
	const radio = document.querySelector("input[name='compare']:checked");

	if (!radio) {
		return;
	}

	const compare = radio.value;
	const memType = form.type.value;
    const memAlign = form.alignment.value == "aligned" ? true : false;

	let oldParam = form.param.value;
    let newParam;

	let lowerAddr = form.lower.value;
	let upperAddr = form.upper.value;

	if (lowerAddr == '' || bigintIsNaN(lowerAddr)) {
		lowerAddr = 0;
	}

	if (upperAddr == '' || bigintIsNaN(upperAddr)) {
		upperAddr = 0xffffffff;
	}

	extension.searchMemType = memType;

    switch (memType) {

    }

	if (oldParam == "") {
		oldParam = null;
    }
    else {
        switch (memType) {
            case "i8":
            case "i16":
            case "i32":
            case "i64":
                // TODO The extension/popup view needs actual error reporting
                if (bigintIsNaN(oldParam)) {
                    console.warn("Got invalid number " + oldParam);
                    return;
                }

                newParam = parseInt(oldParam);

                break;
            case "f32":
            case "f64":
                if (bigintIsNaN(oldParam)) {
                    console.warn("Got invalid number " + oldParam);
                    return;
                }

                newParam = parseFloat(oldParam);

                break;
            // TODO We need actual error checking here, but the UI has no good way to report errors
            // so we let the content script do the error handling
            case "ascii":
            case "utf-8":
            case "bytes":
                newParam = oldParam;

                break;
            default:
                throw new Error("Bad memType " + memType);
        }
    }

	// TODO Make consistent with background.js
	extension.sendBGMessage('search', {
		memType: memType,
        memAlign: memAlign,
		compare: compare,
		param: newParam,
		lower: lowerAddr,
		upper: upperAddr
	});

	document.getElementById('resultsTitle').innerText = 'Searching...';

    disableSearchFormTypes();
    disableSearchFormAlignment();
};

document.getElementById('stringForm').onsubmit = function(e) {
    e.preventDefault();

	const form = document.getElementById('stringForm');
	const radio = document.querySelector("input[name='stringType']:checked");

    if (!radio) {
        return;
    }

	let lowerAddr = form.lower.value;
	let upperAddr = form.upper.value;
    let minLength = form.minLength.value;

	if (lowerAddr == '' || bigintIsNaN(lowerAddr)) {
		lowerAddr = 0;
	}

	if (upperAddr == '' || bigintIsNaN(upperAddr)) {
		upperAddr = 0xffffffff;
	}

	if (minLength == '' || bigintIsNaN(minLength)) {
        minLength = 4;
    }

    const strType = radio.value;

	extension.sendBGMessage('stringSearch', {
		strType: strType,
        lower: lowerAddr,
        upper: upperAddr,
        minLength: minLength,
	});
};

document.getElementById('functionFormSearch').onsubmit = function(e) {
	e.preventDefault();

	const input = document.getElementById('functionInput');

	const funcIndex = input.value;

	const savedIndexElem = document.getElementById('functionIndexSaved');
	savedIndexElem.value = funcIndex;

	extension.sendBGMessage('queryFunction', {
		index: funcIndex
	});
};

document.getElementById('functionFormSave').onclick = function(e) {
	e.preventDefault();

    const disasInput = document.querySelector("textarea.prism-live");
	const savedIndexElem = document.getElementById('functionIndexSaved');

	const funcIndex = savedIndexElem.value;

	const funcText = disasInput.value;

	const funcArray = assembleFunction(funcText);

	const funcBytes = Array.prototype.slice.call(funcArray);

	const funcName = document.getElementById('patchName').value;

	const binaryUrl = extension.url;

	const patchOptions = {
		index: funcIndex,
		bytes: funcBytes,
		name: funcName,
		url: binaryUrl
	};

	extension.savePatch(patchOptions);
	closeSavePatchModal();
};

const createSaveButton = function(address) {
	const saveButton = document.createElement('button');
	saveButton.name = 'saveBtn';
	saveButton.className = 'button-add';
	saveButton.setAttribute('address', address);

	const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svgElement.setAttribute('width', '24');
	svgElement.setAttribute('height', '24');
	svgElement.setAttribute('viewBox', '0 0 24 24');
	svgElement.setAttribute('fill', 'none');
	svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	pathElement.setAttribute(
		'd',
		'M12.4856 16.6814L12 16.4116L11.5144 16.6814L5 20.3005V4C5 3.44772 5.44772 3 6 3H18C18.5523 3 19 3.44771 19 4L19 20.3005L12.4856 16.6814Z'
	);
	pathElement.setAttribute('stroke', '#5352ED');
	pathElement.setAttribute('stroke-width', '2');

	const rectElement1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	rectElement1.setAttribute('x', '11');
	rectElement1.setAttribute('y', '6');
	rectElement1.setAttribute('width', '2');
	rectElement1.setAttribute('height', '8');
	rectElement1.setAttribute('rx', '1');
	rectElement1.setAttribute('fill', '#5352ED');

	const rectElement2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	rectElement2.setAttribute('x', '16');
	rectElement2.setAttribute('y', '9');
	rectElement2.setAttribute('width', '2');
	rectElement2.setAttribute('height', '8');
	rectElement2.setAttribute('rx', '1');
	rectElement2.setAttribute('transform', 'rotate(90 16 9)');
	rectElement2.setAttribute('fill', '#5352ED');

	svgElement.appendChild(pathElement);
	svgElement.appendChild(rectElement1);
	svgElement.appendChild(rectElement2);
	saveButton.appendChild(svgElement);

	return saveButton;
};

const createDisabledSaveButton = function() {
	const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svgElement.setAttribute('width', '24');
	svgElement.setAttribute('height', '24');
	svgElement.setAttribute('viewBox', '0 0 24 24');
	svgElement.setAttribute('fill', 'none');
	svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	const gElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	gElement.setAttribute('opacity', '0.2');

	const pathElement1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	pathElement1.setAttribute(
		'd',
		'M12.4856 16.6814L12 16.4116L11.5144 16.6814L5 20.3005V4C5 3.44772 5.44772 3 6 3H18C18.5523 3 19 3.44771 19 4L19 20.3005L12.4856 16.6814Z'
	);
	pathElement1.setAttribute('stroke', '#A4B0BE');
	pathElement1.setAttribute('stroke-width', '2');

	const pathElement2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	pathElement2.setAttribute(
		'd',
		'M8.28015 9.32038C7.90662 9.69572 7.90662 10.3043 8.28015 10.6796L10.3092 12.7185C10.6827 13.0938 11.2883 13.0938 11.6618 12.7185L15.7199 8.64075C16.0934 8.26541 16.0934 7.65685 15.7199 7.28151C15.3463 6.90616 14.7407 6.90616 14.3672 7.28151L10.9855 10.6796L9.63282 9.32038C9.25929 8.94503 8.65368 8.94503 8.28015 9.32038Z'
	);
	pathElement2.setAttribute('fill', '#A4B0BE');

	gElement.appendChild(pathElement1);
	gElement.appendChild(pathElement2);
	svgElement.appendChild(gElement);

	return svgElement;
};

const saveButtonClick = function(e) {
	e.preventDefault();

	const disabledButton = createDisabledSaveButton();

	this.innerHTML = '';
	this.disabled = true;
	this.appendChild(disabledButton);

	const address = this.getAttribute('address');
	const memType = extension.searchMemType;

	extension.addBookmark(address, memType);
};

const createValueInput = function(address, value) {
	const valueInput = document.createElement('input');
	valueInput.name = 'bookmarkInput';
	valueInput.type = 'text';
	valueInput.value = value;
	valueInput.className = 'table-input';
	valueInput.onchange = valueInputChange;
	valueInput.setAttribute('address', address);

	return valueInput;
};

const valueInputChange = function(e) {
	const memType = extension.searchMemType;

	extension.sendBGMessage('modifyMemory', {
		memAddr: event.currentTarget.getAttribute('address'),
		memValue: event.currentTarget.value,
		memType: memType
	});
};

const createFreezeButton = function(address, value) {
	const freezeButton = document.createElement('button');
	freezeButton.className = 'button-checkbox';
	freezeButton.onclick = freezeButtonClick;
	freezeButton.value = value;
	freezeButton.setAttribute('address', address);

	const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svgElement.setAttribute('width', '10');
	svgElement.setAttribute('height', '8');
	svgElement.setAttribute('viewBox', '0 0 10 8');
	svgElement.setAttribute('fill', 'none');
	svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	pathElement.setAttribute(
		'd',
		'M3.21 6.74914C3.30297 6.84287 3.41357 6.91726 3.53543 ' +
			'6.96803C3.65728 7.0188 3.78799 7.04494 3.92 7.04494C4.05201 ' +
			'7.04494 4.18272 7.0188 4.30458 6.96803C4.42644 6.91726 4.53704 ' +
			'6.84287 4.63 6.74914L8.71 2.66914C8.89831 2.48084 9.00409 ' +
			'2.22544 9.00409 1.95914C9.00409 1.69284 8.89831 1.43744 8.71 ' +
			'1.24914C8.5217 1.06084 8.2663 0.955048 8 0.955048C7.7337 ' +
			'0.955048 7.47831 1.06084 7.29 1.24914L3.92 4.62914L2.71 ' +
			'3.40914C2.5217 3.22083 2.2663 3.11505 2 3.11505C1.7337 ' +
			'3.11505 1.47831 3.22083 1.29 3.40914C1.1017 3.59744 0.995911 ' +
			'3.85284 0.995911 4.11914C0.995911 4.38544 1.1017 4.64084 1.29 ' +
			'4.82914L3.21 6.74914Z'
	);
	pathElement.setAttribute('fill', '#5352ED');

	svgElement.appendChild(pathElement);
	freezeButton.appendChild(svgElement);

	return freezeButton;
};

const freezeButtonClick = function(e) {
	e.preventDefault();

	const msgBody = {};

	const memAddr = event.currentTarget.getAttribute('address');

	msgBody.memAddr = memAddr;
	msgBody.memValue = event.currentTarget.value;
	msgBody.flags = FLAG_FREEZE;

	extension.sendBGMessage('updateWatchpoint', msgBody);
};

const createWatchButton = function(address, value) {
	const watchButton = document.createElement('button');
	watchButton.className = 'button-checkbox';
	watchButton.value = value;
	watchButton.setAttribute('address', address);

	const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svgElement.setAttribute('width', '10');
	svgElement.setAttribute('height', '8');
	svgElement.setAttribute('viewBox', '0 0 10 8');
	svgElement.setAttribute('fill', 'none');
	svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	pathElement.setAttribute(
		'd',
		'M3.21 6.74914C3.30297 6.84287 3.41357 6.91726 3.53543 ' +
			'6.96803C3.65728 7.0188 3.78799 7.04494 3.92 7.04494C4.05201 ' +
			'7.04494 4.18272 7.0188 4.30458 6.96803C4.42644 6.91726 4.53704 ' +
			'6.84287 4.63 6.74914L8.71 2.66914C8.89831 2.48084 9.00409 ' +
			'2.22544 9.00409 1.95914C9.00409 1.69284 8.89831 1.43744 8.71 ' +
			'1.24914C8.5217 1.06084 8.2663 0.955048 8 0.955048C7.7337 ' +
			'0.955048 7.47831 1.06084 7.29 1.24914L3.92 4.62914L2.71 ' +
			'3.40914C2.5217 3.22083 2.2663 3.11505 2 3.11505C1.7337 ' +
			'3.11505 1.47831 3.22083 1.29 3.40914C1.1017 3.59744 0.995911 ' +
			'3.85284 0.995911 4.11914C0.995911 4.38544 1.1017 4.64084 1.29 ' +
			'4.82914L3.21 6.74914Z'
	);
	pathElement.setAttribute('fill', '#5352ED');

	svgElement.appendChild(pathElement);
	watchButton.appendChild(svgElement);

	return watchButton;
};

const writeWatchButtonClick = function(e) {
	e.preventDefault();

	const msgBody = {};

	const memAddr = event.currentTarget.getAttribute('address');

	msgBody.memAddr = memAddr;
	msgBody.memValue = event.currentTarget.value;
	msgBody.flags = FLAG_WATCH_WRITE;

	extension.sendBGMessage('updateWatchpoint', msgBody);
};

const readWatchButtonClick = function(e) {
	e.preventDefault();

	const msgBody = {};

	const memAddr = event.currentTarget.getAttribute('address');

	msgBody.memAddr = memAddr;
	msgBody.memValue = event.currentTarget.value;
	msgBody.flags = FLAG_WATCH_READ;

	extension.sendBGMessage('updateWatchpoint', msgBody);
};

const createRemoveButton = function(address, value) {
	const removeButton = document.createElement('button');
	removeButton.className = 'button-remove';
	removeButton.onclick = removeButtonClick;
	removeButton.setAttribute('address', address);

	const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svgElement.setAttribute('width', '24');
	svgElement.setAttribute('height', '24');
	svgElement.setAttribute('viewBox', '0 0 24 24');
	svgElement.setAttribute('fill', 'none');
	svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	pathElement.setAttribute(
		'd',
		'M13.4099 11.9999L17.7099 7.70994C17.8982 7.52164 18.004 7.26624 18.004 6.99994C18.004 6.73364 17.8982 6.47825 17.7099 6.28994C17.5216 6.10164 17.2662 5.99585 16.9999 5.99585C16.7336 5.99585 16.4782 6.10164 16.2899 6.28994L11.9999 10.5899L7.70994 6.28994C7.52164 6.10164 7.26624 5.99585 6.99994 5.99585C6.73364 5.99585 6.47824 6.10164 6.28994 6.28994C6.10164 6.47825 5.99585 6.73364 5.99585 6.99994C5.99585 7.26624 6.10164 7.52164 6.28994 7.70994L10.5899 11.9999L6.28994 16.2899C6.19621 16.3829 6.12182 16.4935 6.07105 16.6154C6.02028 16.7372 5.99414 16.8679 5.99414 16.9999C5.99414 17.132 6.02028 17.2627 6.07105 17.3845C6.12182 17.5064 6.19621 17.617 6.28994 17.7099C6.3829 17.8037 6.4935 17.8781 6.61536 17.9288C6.73722 17.9796 6.86793 18.0057 6.99994 18.0057C7.13195 18.0057 7.26266 17.9796 7.38452 17.9288C7.50638 17.8781 7.61698 17.8037 7.70994 17.7099L11.9999 13.4099L16.2899 17.7099C16.3829 17.8037 16.4935 17.8781 16.6154 17.9288C16.7372 17.9796 16.8679 18.0057 16.9999 18.0057C17.132 18.0057 17.2627 17.9796 17.3845 17.9288C17.5064 17.8781 17.617 17.8037 17.7099 17.7099C17.8037 17.617 17.8781 17.5064 17.9288 17.3845C17.9796 17.2627 18.0057 17.132 18.0057 16.9999C18.0057 16.8679 17.9796 16.7372 17.9288 16.6154C17.8781 16.4935 17.8037 16.3829 17.7099 16.2899L13.4099 11.9999Z'
	);
	pathElement.setAttribute('fill', '#FF6B81');

	svgElement.appendChild(pathElement);
	removeButton.appendChild(svgElement);

	return removeButton;
};

const removeButtonClick = function(e) {
	e.preventDefault();

	const thisAddr = event.currentTarget.getAttribute('address');

	const saveButtons = document.getElementsByName('saveBtn');

	// We need to reenable any save buttons on the search page that were
	// disabled after clicking save
	for (let i = 0; i < saveButtons.length; i++) {
		const saveButton = saveButtons[i];

		const saveButtonAddr = saveButton.getAttribute('address');

		if (saveButtonAddr === thisAddr) {
			const parentElement = saveButton.parentElement;

			parentElement.innerHTML = '';
			parentElement.appendChild(createSaveButton(thisAddr));
		}
	}

	extension.removeBookmark(thisAddr);
};

const updateSearchForm = function(searchData) {
	const searchValue = searchData.value;

	const searchComp = searchData.comparison;
	const searchType = searchData.valueType;

	const searchLower = searchData.rangeLower;
	const searchUpper = searchData.rangeUpper;

	const searchInProgress = searchData.inProgress;
	const resultCount = searchData.results.count;
	const resultObject = searchData.results.object;

	// TODO Make these names less generic
	const compareRadios = document.getElementsByName('compare');
	const typeRadios = document.getElementsByName('type');

	for (let i = 0; i < compareRadios.length; i++) {
		const radio = compareRadios[i];

		if (radio.value == searchComp) {
			radio.checked = true;
			break;
		}
	}

	for (let i = 0; i < typeRadios.length; i++) {
		const radio = typeRadios[i];

		if (radio.value == searchType) {
			radio.checked = true;
			break;
		}
	}

	document.getElementById('searchParam').value = searchValue;

	if (searchLower != 0) {
		document.getElementById('searchLower').value = searchLower;
	}

	if (searchUpper != 0xffffffff) {
		document.getElementById('searchUpper').value = searchUpper;
	}

	if (searchInProgress) {
		updateSearchResults(resultCount, resultObject, searchType);
	}
};

const updateStringSearchForm = function(stringData) {
    const strType = stringData.strType;
    const strMinLen = stringData.strMinLen;
    const resultCount = stringData.results.count;
    const resultObject = stringData.results.object;

    document.getElementById('strMinLength').value = strMinLen;

	const typeRadios = document.getElementsByName('stringType');

	for (let i = 0; i < typeRadios.length; i++) {
		const radio = typeRadios[i];

		if (radio.value == strType) {
			radio.checked = true;
			break;
		}
	}

    updateStringSearchResults(resultCount, resultObject);
}

const enableSearchFormCompare = function() {
    const radioButtons = document.getElementsByName('compare');

    for (let i = 0; i < radioButtons.length; i++) {
        radioButtons[i].disabled = false;
    }
};

const disableSearchFormCompare = function() {
    const radioButtons = document.getElementsByName('compare');

    for (let i = 0; i < radioButtons.length; i++) {
        radioButtons[i].disabled = true;
    }
};

const enableSearchFormTypes = function() {
    const radioButtons = document.getElementsByName('type');

    for (let i = 0; i < radioButtons.length; i++) {
        radioButtons[i].disabled = false;
    }
};

const disableSearchFormTypes = function() {
    const radioButtons = document.getElementsByName('type');

    for (let i = 0; i < radioButtons.length; i++) {
        radioButtons[i].disabled = true;
    }
};

const enableSearchFormAlignment = function() {
    const radioButtons = document.getElementsByName('alignment');

    for (let i = 0; i < radioButtons.length; i++) {
        radioButtons[i].disabled = false;
    }
};

const disableSearchFormAlignment = function() {
    const radioButtons = document.getElementsByName('alignment');

    for (let i = 0; i < radioButtons.length; i++) {
        radioButtons[i].disabled = true;
    }
};

const updateSearchResults = function(resultCount, resultObject, resultMemType) {
	document.getElementById('resultsTitle').innerText = resultCount + ' results';
	document.getElementById('restartBtn').disabled = false;

	const table = document.createElement('table');
	const thead = table.createTHead();

	let row = thead.insertRow();
	let cell = row.insertCell();

	cell.innerText = 'Address';
	cell = row.insertCell();
	cell.innerText = 'Value';
	cell = row.insertCell();

	const tbody = table.createTBody();

	for (const address of Object.keys(resultObject)) {
		const value = resultObject[address];

		// Validate both address and value 
		if (address == null || value == null) {
			continue;
		}

		row = tbody.insertRow();

		cell = row.insertCell();
		cell.innerText = toHex(address);

		cell = row.insertCell();
		if (bigintIsNaN(value)) {
			cell.innerText = value;
		} else {	
			cell.innerText = formatValue(value, resultMemType);
        }

		cell = row.insertCell();
		const saveButton = createSaveButton(address);
		cell.appendChild(saveButton);
	}

	document.getElementById('results').innerHTML = '';
	document.getElementById('results').appendChild(table);

	const buttons = document.getElementsByName('saveBtn');
	for (let i = 0; i < buttons.length; i++) {
		const button = buttons[i];

		button.onclick = saveButtonClick;
	}
};

const updateStringSearchResults = function(resultCount, resultObject) {
	document.getElementById('strResultsTitle').innerText = resultCount + ' results';

	const table = document.createElement('table');
	const thead = table.createTHead();

	let row = thead.insertRow();
	let cell = row.insertCell();

	cell.innerText = 'Address';
	cell = row.insertCell();
	cell.innerText = 'Value';
	cell = row.insertCell();

	const tbody = table.createTBody();

	for (const address of Object.keys(resultObject)) {
		const value = resultObject[address];

		// Validate both address and value 
		if (address == null || value == null) {
			continue;
		}

		row = tbody.insertRow();

		cell = row.insertCell();
		cell.innerText = toHex(address);

		cell = row.insertCell();
        cell.innerText = value;
	}

	document.getElementById('stringResults').innerHTML = '';
	document.getElementById('stringResults').appendChild(table);
}

const updateBookmarkTable = function(bookmarks) {
	const bookmarkMenu = document.getElementById('bookmarks');

	// TODO Format this in a less gross way
	if (Object.keys(bookmarks).length == 0) {
		bookmarkMenu.innerHTML = `
        <div id="bookmark-table"></div>
        <div class="nothing-to-show">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.2">
              <path d="M12.4856 16.6814L12 16.4116L11.5144 16.6814L5 20.3005V4C5 3.44772 5.44772 3 6 3H18C18.5523 3 19 3.44771 19 4L19 20.3005L12.4856 16.6814Z" stroke="#A4B0BE" stroke-width="2"></path>
              <path d="M8.28015 9.32038C7.90662 9.69572 7.90662 10.3043 8.28015 10.6796L10.3092 12.7185C10.6827 13.0938 11.2883 13.0938 11.6618 12.7185L15.7199 8.64075C16.0934 8.26541 16.0934 7.65685 15.7199 7.28151C15.3463 6.90616 14.7407 6.90616 14.3672 7.28151L10.9855 10.6796L9.63282 9.32038C9.25929 8.94503 8.65368 8.94503 8.28015 9.32038Z" fill="#A4B0BE"></path>
            </g>
          </svg>
          There is nothing to show right now
          <span>Use the Search tab first</span>`;
		return;
	}

	// Do not update the bookmark table if any inputs are currently focused
	// This avoids the table being jumpy and annoying to use
	if (document.activeElement.name == 'bookmarkInput') {
		return;
	}

	const table = document.createElement('table');
	const thead = table.createTHead();

	let row = thead.insertRow();
	let cell = row.insertCell();
	cell.innerText = 'Address';

	cell = row.insertCell();
	cell.innerText = 'Value';

	cell = row.insertCell();
	cell.innerText = 'Freeze';

	cell = row.insertCell();
	cell.innerText = 'Read Watch';

	cell = row.insertCell();
	cell.innerText = 'Write Watch';

	cell = row.insertCell();

	const tbody = table.createTBody();

	for (const address of Object.keys(bookmarks)) {
		const bookmark = bookmarks[address];

		const value = bookmark.value;
		const memType = bookmark.memType;

		const frozen = (bookmark.flags & FLAG_FREEZE) != 0;
		const readWatch = (bookmark.flags & FLAG_WATCH_READ) != 0;
		const writeWatch = (bookmark.flags & FLAG_WATCH_WRITE) != 0;

		row = tbody.insertRow();

		cell = row.insertCell();
		cell.innerText = toHex(address);

		cell = row.insertCell();

		const formattedValue = formatValue(value, memType);

		const valueInput = createValueInput(address, formattedValue);
		cell.appendChild(valueInput);

		cell = row.insertCell();

		const freezeButton = createFreezeButton(address, value);

		if (frozen) {
			freezeButton.classList.add('button-checkbox--active');
		}

		cell.appendChild(freezeButton);

		cell = row.insertCell();

		const readWatchButton = createWatchButton(address, value);
		readWatchButton.onclick = readWatchButtonClick;

		if (readWatch) {
			readWatchButton.classList.add('button-checkbox--active');
		}

		cell.appendChild(readWatchButton);

		cell = row.insertCell();

		const writeWatchButton = createWatchButton(address, value);
		writeWatchButton.onclick = writeWatchButtonClick;

		if (writeWatch) {
			writeWatchButton.classList.add('button-checkbox--active');
		}

		cell.appendChild(writeWatchButton);

		cell = row.insertCell();

		const removeButton = createRemoveButton(address, value);
		cell.appendChild(removeButton);
	}

	while (bookmarkMenu.firstChild) {
		bookmarkMenu.removeChild(bookmarkMenu.firstChild);
	}

	bookmarkMenu.appendChild(table);
};

const updateStackTraceTable = function(stackTraces) {
    if (typeof stackTraces === "undefined" || stackTraces.length == 0) {
        return;
    }

	const stackTraceMenu = document.getElementById('stack-traces');

	const table = document.createElement('table');
	const tableHead = table.createTHead();

	let headRow = tableHead.insertRow();
	let headCell = headRow.insertCell();
	headCell.innerText = 'Location';

	const tbody = table.createTBody();

    for (let i = 0; i < stackTraces.length; i++) {
        const thisTrace = stackTraces[i];

        const lastFrame = thisTrace[0];

        const fileName = lastFrame.fileName;
        const lineNumber = lastFrame.lineNumber;

        const hitLocation = `${fileName}:${lineNumber}`;

		const row = tbody.insertRow();

		const cell = row.insertCell();
        cell.innerText = hitLocation;

        row.onclick = function(e) {
            openStackTraceModal(thisTrace);
        };
    }

	while (stackTraceMenu.firstChild) {
		stackTraceMenu.removeChild(stackTraceMenu.firstChild);
	}

	stackTraceMenu.appendChild(table);
};

Prism.hooks.add('before-highlight', function(env) {
	env.code = env.element.innerText;
});

const updatePatchWindow = function(funcIndex, windowText, lineHighlight) {
	const savedIndexElem = document.getElementById('functionIndexSaved');
	savedIndexElem.value = funcIndex;

	const patchElement = document.getElementById('codeDisassembly');

    const textArea = document.querySelector("textarea.prism-live");
    textArea.value = windowText;

    if (typeof lineHighlight !== "undefined") {
        const preElement = document.querySelector("pre.prism-live");
        preElement.setAttribute("data-line", lineHighlight);
    }

    // Prism Live only updates the text area on an input event
    // So we issue a fake input event to make it update
    textArea.dispatchEvent(new Event("input"));
};

const updateSpeedhackForm = function(shData) {
	const shEnabled = shData.enabled;
	const shMultiplier = shData.multiplier;

	document.getElementById('shRange').value = shMultiplier;

	const shButton = document.getElementById('toggleSpeedhack');

	if (shEnabled) {
		shButton.innerText = 'Disable';
		shButton.setAttribute('enabled', 'true');
	} else {
		shButton.innerText = 'Enable';
		shButton.setAttribute('enabled', 'false');
	}

	updateSpeedhackGauge();
};

// Modal Windows

// Initialization

const savePatchModal = document.getElementById('savePatchModal');
const loadPatchModal = document.getElementById('loadPatchModal');

const stackTraceModal = document.getElementById('stackTraceModal');

const openSavePatchModalButton = document.getElementById('openSavePatchModalButton');
const openLoadPatchModalButton = document.getElementById('openLoadPatchModalButton');

const overlayLoadPatchModalButton = document.getElementById('overlayLoadPatchModalButton');

const openStackTraceModalButton = document.getElementById('oepnStackTraceModalButton');

const closeSavePatchModalButton = document.getElementById('closeSavePatchModalButton');
const closeLoadPatchModalButton = document.getElementById('closeLoadPatchModalButton');

const closeStackTraceModalButton = document.getElementById('closeStackTraceModalButton');

const importPatchButton = document.getElementById('importPatchButton');

// Actions
const openSavePatchModal = function() {
	savePatchModal.classList.remove('modal-hidden');
	document.getElementById('patchName').focus();
}

const createLoadPatchModal = function(savedPatches) {
	const table = document.getElementById('loadedPatchesTable');
	const tableHead = table.createTHead();

	if (table.innerHTML !== '') {
		table.innerHTML = '';
	}

	let headRow = tableHead.insertRow();
	let headCell = headRow.insertCell();

	headCell.innerText = 'Index';
	headCell = headRow.insertCell();
	headCell.innerText = 'Name';
	headCell = headRow.insertCell();
	headCell.innerText = 'Load';
	headCell = headRow.insertCell();
	headCell.innerText = 'Remove';
	headCell = headRow.insertCell();

    for (let i = 0; i < savedPatches.length; i++) {
        const thisPatch = savedPatches[i];

        const downloadButtonId = "downloadPatchButton-" + i;

        const row = table.insertRow();
        let cell = row.insertCell();
        cell.innerText = thisPatch.index;

        cell = row.insertCell();
        cell.innerText = thisPatch.name;

        cell = row.insertCell();

        const enableButton = document.createElement('button');
        enableButton.className = 'button-checkbox';
        enableButton.value = thisPatch.enabled;

        if (thisPatch.enabled) {
            enableButton.classList.add("button-checkbox--active");
        }

        enableButton.onclick = function(e) {
            if (e.target.value) {
                enableButton.classList.remove("button-checkbox--active");

                extension.disablePatchByName(thisPatch.name);
            }
            else {
                enableButton.classList.add("button-checkbox--active");

                extension.enablePatchByName(thisPatch.name);
            }

            e.target.value = !(e.target.value);
        };

        const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgElement.setAttribute('width', '10');
        svgElement.setAttribute('height', '8');
        svgElement.setAttribute('viewBox', '0 0 10 8');
        svgElement.setAttribute('fill', 'none');
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute(
            'd',
            'M3.21 6.74914C3.30297 6.84287 3.41357 6.91726 3.53543 ' +
                '6.96803C3.65728 7.0188 3.78799 7.04494 3.92 7.04494C4.05201 ' +
                '7.04494 4.18272 7.0188 4.30458 6.96803C4.42644 6.91726 4.53704 ' +
                '6.84287 4.63 6.74914L8.71 2.66914C8.89831 2.48084 9.00409 ' +
                '2.22544 9.00409 1.95914C9.00409 1.69284 8.89831 1.43744 8.71 ' +
                '1.24914C8.5217 1.06084 8.2663 0.955048 8 0.955048C7.7337 ' +
                '0.955048 7.47831 1.06084 7.29 1.24914L3.92 4.62914L2.71 ' +
                '3.40914C2.5217 3.22083 2.2663 3.11505 2 3.11505C1.7337 ' +
                '3.11505 1.47831 3.22083 1.29 3.40914C1.1017 3.59744 0.995911 ' +
                '3.85284 0.995911 4.11914C0.995911 4.38544 1.1017 4.64084 1.29 ' +
                '4.82914L3.21 6.74914Z'
        );
        pathElement.setAttribute('fill', '#5352ED');

        svgElement.appendChild(pathElement);
        enableButton.appendChild(svgElement);

        cell.appendChild(enableButton);

        cell = row.insertCell();

        const downloadButtonDiv = document.createElement("div");
        downloadButtonDiv.id = downloadButtonId;

        const downloadButtonSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        downloadButtonSvg.setAttribute("width", "16");
        downloadButtonSvg.setAttribute("height", "16");
        downloadButtonSvg.setAttribute("viewBox", "0 0 16 16");

        const downloadButtonPath1 = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        downloadButtonPath1.setAttribute("style", "stroke:none;fill-rule:nonzero;fill:#5352ED;fill-opacity:1;");
        downloadButtonPath1.setAttribute("d", "M 14.898438 13.664062 L 1.089844 13.664062 C 0.488281 13.664062 0 14.140625 0 14.742188 C 0 15.34375 0.488281 15.820312 1.089844 15.820312 L 14.898438 15.820312 C 15.503906 15.820312 15.988281 15.34375 15.988281 14.742188 C 15.988281 14.140625 15.503906 13.664062 14.898438 13.664062 Z M 14.898438 13.664062");

        const downloadButtonPath2 = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        downloadButtonPath2.setAttribute("style", "stroke:none;fill-rule:nonzero;fill:#5352ED;fill-opacity:1;");
        downloadButtonPath2.setAttribute("d", "M 7.171875 12.222656 C 7.628906 12.871094 8.421875 12.8125 8.820312 12.222656 C 9.824219 10.730469 12.988281 6.351562 12.988281 6.351562 C 13.226562 6.015625 13.214844 5.5625 12.960938 5.238281 C 12.707031 4.914062 12.265625 4.796875 11.882812 4.949219 L 9.460938 5.910156 L 9.78125 1.164062 C 9.796875 0.90625 9.707031 0.652344 9.527344 0.460938 C 9.351562 0.273438 9.105469 0.167969 8.84375 0.167969 L 7.144531 0.167969 C 6.886719 0.167969 6.636719 0.273438 6.460938 0.460938 C 6.285156 0.652344 6.191406 0.90625 6.210938 1.164062 L 6.53125 5.910156 L 4.105469 4.949219 C 3.722656 4.796875 3.285156 4.914062 3.03125 5.238281 C 2.777344 5.5625 2.765625 6.015625 3.003906 6.351562 C 3.003906 6.351562 6.132812 10.753906 7.171875 12.222656 Z M 7.171875 12.222656");

        downloadButtonSvg.appendChild(downloadButtonPath1);
        downloadButtonSvg.appendChild(downloadButtonPath2);
        downloadButtonDiv.appendChild(downloadButtonSvg);

        const hiddenInputDownload = document.createElement("input");
        hiddenInputDownload.type = "hidden";
        hiddenInputDownload.value = thisPatch.name;

        downloadButtonDiv.appendChild(hiddenInputDownload);

        downloadButtonDiv.onclick = function(e) {
            extension.downloadPatchByName(thisPatch.name);
        };

        cell.appendChild(downloadButtonDiv);

        cell = row.insertCell();

        const removeButtonId = "removePatchButton-" + i;

        const removeButtonDiv = document.createElement("div");
        removeButtonDiv.id = removeButtonId;

        const removeButtonSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        removeButtonSvg.setAttribute("width", "24");
        removeButtonSvg.setAttribute("height", "24");
        removeButtonSvg.setAttribute("viewBox", "0 0 24 24");
        removeButtonSvg.setAttribute("fill", "none");

        const removeButtonPath = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        removeButtonPath.setAttribute("fill", "#FF6B81");
        removeButtonPath.setAttribute("d", "M13.4099 11.9999L17.7099 7.70994C17.8982 7.52164 18.004 7.26624 18.004 6.99994C18.004 6.73364 17.8982 6.47825 17.7099 6.28994C17.5216 6.10164 17.2662 5.99585 16.9999 5.99585C16.7336 5.99585 16.4782 6.10164 16.2899 6.28994L11.9999 10.5899L7.70994 6.28994C7.52164 6.10164 7.26624 5.99585 6.99994 5.99585C6.73364 5.99585 6.47824 6.10164 6.28994 6.28994C6.10164 6.47825 5.99585 6.73364 5.99585 6.99994C5.99585 7.26624 6.10164 7.52164 6.28994 7.70994L10.5899 11.9999L6.28994 16.2899C6.19621 16.3829 6.12182 16.4935 6.07105 16.6154C6.02028 16.7372 5.99414 16.8679 5.99414 16.9999C5.99414 17.132 6.02028 17.2627 6.07105 17.3845C6.12182 17.5064 6.19621 17.617 6.28994 17.7099C6.3829 17.8037 6.4935 17.8781 6.61536 17.9288C6.73722 17.9796 6.86793 18.0057 6.99994 18.0057C7.13195 18.0057 7.26266 17.9796 7.38452 17.9288C7.50638 17.8781 7.61698 17.8037 7.70994 17.7099L11.9999 13.4099L16.2899 17.7099C16.3829 17.8037 16.4935 17.8781 16.6154 17.9288C16.7372 17.9796 16.8679 18.0057 16.9999 18.0057C17.132 18.0057 17.2627 17.9796 17.3845 17.9288C17.5064 17.8781 17.617 17.8037 17.7099 17.7099C17.8037 17.617 17.8781 17.5064 17.9288 17.3845C17.9796 17.2627 18.0057 17.132 18.0057 16.9999C18.0057 16.8679 17.9796 16.7372 17.9288 16.6154C17.8781 16.4935 17.8037 16.3829 17.7099 16.2899L13.4099 11.9999Z");

        removeButtonSvg.appendChild(removeButtonPath);
        removeButtonDiv.appendChild(removeButtonSvg);

        const hiddenInputRemove = document.createElement("input");
        hiddenInputRemove.type = "hidden";
        hiddenInputRemove.value = thisPatch.name;

        removeButtonDiv.appendChild(hiddenInputRemove);

        removeButtonDiv.onclick = function(e) {
            extension.deletePatchByName(thisPatch.name);

            row.parentNode.removeChild(row);
        };

        cell.appendChild(removeButtonDiv);
    }

	loadPatchModal.classList.remove('modal-hidden');
}

const openLoadPatchModal = function() {
	const savedPatches = extension.getPatchesByUrl(extension.url);

    createLoadPatchModal(savedPatches);
}

const overlayLoadPatchModal = function() {
	const savedPatches = extension.getPatches();

    createLoadPatchModal(savedPatches);
}

const openStackTraceModal = function(stackTrace) {
	const table = document.getElementById("stackTraceTable");
	const thead = table.createTHead();

	if (table.innerHTML !== "") {
		table.innerHTML = "";
	}

	let row = thead.insertRow();
	let cell = row.insertCell();

	cell.innerText = 'Location';
	cell = row.insertCell();

    for (let i = 0; i < stackTrace.length; i++) {
        const thisCall = stackTrace[i];

        const fileName = thisCall.fileName;
        const lineNumber = thisCall.lineNumber;

        const callLocation = `${fileName}:${lineNumber}`;

        row = table.insertRow();

        cell = row.insertCell();
        cell.innerText = callLocation;

        row.onclick = function(e) {
            const thisFrame = stackTrace[i];

            const fileName = thisFrame.fileName;
            const lineNumber = thisFrame.lineNumber;

            const funcRegex = /\[(.*?)\]/;
            const funcIndex = funcRegex.exec(fileName)[1];

            extension.sendBGMessage("queryFunction", {
                index: funcIndex,
                lineNum: lineNumber
            });

            closeStackTraceModal();
        };
    }

	stackTraceModal.classList.remove('modal-hidden');
}

const closeSavePatchModal = function() {
	savePatchModal.classList.add('modal-hidden');
}

const closeLoadPatchModal = function() {
	loadPatchModal.classList.add('modal-hidden');
}

const closeStackTraceModal = function() {
	stackTraceModal.classList.add('modal-hidden');
}

const importPatch = function() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";

    fileInput.onchange = function(e) {
        const uploadedFile = e.target.files[0];

        const fileReader = new FileReader();

        fileReader.readAsText(uploadedFile, "UTF-8");

        // TODO Handle file upload error
        fileReader.onload = function(e) {
            const fileContents = e.target.result;

            let patchObj;

            try {
                patchObj = JSON.parse(fileContents);
            }
            catch (err) {
                // TODO Alert user on JSON parse error
                return;
            }

            if (typeof patchObj.name !== "string" ||
                typeof patchObj.index !== "string" ||
                typeof patchObj.url !== "string" ||
                !(patchObj.bytes instanceof Array)) {
                // TODO Alert user on bad format error
                return;
            }

            extension.savePatch(patchObj);
        };
    };

    fileInput.click();
};

const loadPatch = function(loadButton) {
	const patchWillBeLoaded = {
		name: loadButton.querySelector('#hiddenInputWithName').value,
		index: loadButton.querySelector('#hiddenInputWithIndex').value,
		bytes: loadButton.querySelector('#hiddenInputWithBytes').value,
		url: loadButton.querySelector('#hiddenInputWithUrl').value
	};

	closeLoadPatchModal();
}

// Events
openSavePatchModalButton.addEventListener('click', openSavePatchModal);
openLoadPatchModalButton.addEventListener('click', openLoadPatchModal);

overlayLoadPatchModalButton.addEventListener('click', overlayLoadPatchModal);

closeSavePatchModalButton.addEventListener('click', closeSavePatchModal);
closeLoadPatchModalButton.addEventListener('click', closeLoadPatchModal);

importPatchButton.addEventListener('click', importPatch);

const updateSpeedhackGauge = function() {
    const range = document.getElementById("shRange");

    if (bigintIsNaN(range.value)) {
        return;
    }

    const valText = document.getElementById('shValue');
    const arrow = document.getElementById('arrow');
    const currentValue = Math.floor((+range.value - 5) * 22);
    const stripesValue = Math.floor(+range.value * 22) / 3.5;
    const boldStripesValue = Math.floor(+range.value * 22);
    arrow.style.transform = 'translate(0px, -157px) rotate(' + currentValue + 'deg)';

    const stripes = document.getElementsByClassName('paint');
    const processedStripes = Object.keys(stripes);

    const boldStripes = document.getElementsByClassName('paint-bold');
    const processedBoldStripes = Object.keys(boldStripes);

    const round = document.getElementById('slider-round');
    const fillLine = document.getElementById('slider-item-fill');
    round.style.transform = `translate(${boldStripesValue * 1.75}px, -50%)`;
    fillLine.style.transform = `translateX(${-100 + range.value * 10}%)`;

    processedStripes.forEach((index, value) => {
        if (index <= stripesValue) {
            stripes[index].style.fill = '#5352ED';
        } else {
            stripes[index].style.fill = '#2A303E';
        }
    });

    processedBoldStripes.forEach((index, value) => {
        if (index <= boldStripesValue / 20) {
            boldStripes[index].style.fill = '#5352ED';
        } else {
            boldStripes[index].style.fill = '#2A303E';
        }
    });

    valText.innerText = range.value + 'x';
};

document.getElementById('shRange').oninput = updateSpeedhackGauge;

const enableMemView = function(address) {
	document.getElementById("toggleMemView").setAttribute("enabled", "true");
	document.getElementById("toggleMemView").innerHTML = "Disable";

	extension.sendBGMessage("memToggle", {
		enabled: 1,
		startAddress: address,
	});
};

const disableMemView = function(address) {
	document.getElementById("toggleMemView").setAttribute("enabled", "false");
	document.getElementById("toggleMemView").innerHTML = "Enable";

	extension.sendBGMessage("memToggle", {
		enabled: 0,
		startAddress: address,
	});
};
document.getElementById('toggleMemView').onclick = function(e) {
    e.preventDefault();

    const buttonEnabled = event.currentTarget.getAttribute("enabled") == "true";
    const memViewStartAddress = parseInt(document.getElementById("memViewStartAddress").value);

    if (buttonEnabled) {
		disableMemView(memViewStartAddress);
    }
    else {
		enableMemView(memViewStartAddress);
    }
};

document.getElementById('toggleSpeedhack').onclick = function(e) {
    e.preventDefault();

    const buttonEnabled = event.currentTarget.getAttribute("enabled") == "true";

    if (buttonEnabled) {
        event.currentTarget.setAttribute("enabled", "false");
        event.currentTarget.innerHTML = "Enable";
    }
    else {
        event.currentTarget.setAttribute("enabled", "true");
        event.currentTarget.innerHTML = "Disable";
    }

    const range = document.getElementById('shRange');
    const multiplier = range.value;

    if (bigintIsNaN(multiplier)) {
        return;
    }

    extension.sendBGMessage("shToggle", {
        multiplier: multiplier
    });
};
