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

// Navigation logic
const changeTab = function(id) {
    switch (id) {
        case "tabSearchButton":
            document.getElementById('tabSearch').style.display = 'block';
            document.getElementById('tabStrings').style.display = 'none';
            document.getElementById('tabPatch').style.display = 'none';
            document.getElementById('tabSpeedHack').style.display = 'none';
            document.getElementById('tabBookmarks').style.display = 'none';
            document.getElementById('tabMemView').style.display = 'none';

            document.getElementById('liTabSearch').className = 'tabs-item is-active';
            document.getElementById('liTabStrings').className = 'tabs-item';
            document.getElementById('liTabPatch').className = 'tabs-item';
            document.getElementById('liTabSpeedHack').className = 'tabs-item';
            document.getElementById('liTabBookmarks').className = 'tabs-item';
            document.getElementById('liTabMemView').className = 'tabs-item';

            break;
        case "tabStringsButton":
            document.getElementById('tabSearch').style.display = 'none';
            document.getElementById('tabStrings').style.display = 'block';
            document.getElementById('tabPatch').style.display = 'none';
            document.getElementById('tabSpeedHack').style.display = 'none';
            document.getElementById('tabBookmarks').style.display = 'none';
            document.getElementById('tabMemView').style.display = 'none';

            document.getElementById('liTabSearch').className = 'tabs-item';
            document.getElementById('liTabStrings').className = 'tabs-item is-active';
            document.getElementById('liTabPatch').className = 'tabs-item';
            document.getElementById('liTabSpeedHack').className = 'tabs-item';
            document.getElementById('liTabBookmarks').className = 'tabs-item';
            document.getElementById('liTabMemView').className = 'tabs-item';

            break;
        case "tabPatchButton":
            document.getElementById('tabSearch').style.display = 'none';
            document.getElementById('tabStrings').style.display = 'none';
            document.getElementById('tabPatch').style.display = 'block';
            document.getElementById('tabSpeedHack').style.display = 'none';
            document.getElementById('tabBookmarks').style.display = 'none';
            document.getElementById('tabMemView').style.display = 'none';

            document.getElementById('liTabSearch').className = 'tabs-item';
            document.getElementById('liTabStrings').className = 'tabs-item';
            document.getElementById('liTabPatch').className = 'tabs-item is-active';
            document.getElementById('liTabSpeedHack').className = 'tabs-item';
            document.getElementById('liTabBookmarks').className = 'tabs-item';
            document.getElementById('liTabMemView').className = 'tabs-item';

            break;
        case "tabSpeedHackButton":
            document.getElementById('tabSearch').style.display = 'none';
            document.getElementById('tabStrings').style.display = 'none';
            document.getElementById('tabPatch').style.display = 'none';
            document.getElementById('tabSpeedHack').style.display = 'block';
            document.getElementById('tabBookmarks').style.display = 'none';
            document.getElementById('tabMemView').style.display = 'none';

            document.getElementById('liTabSearch').className = 'tabs-item';
            document.getElementById('liTabStrings').className = 'tabs-item';
            document.getElementById('liTabPatch').className = 'tabs-item';
            document.getElementById('liTabSpeedHack').className = 'tabs-item is-active';
            document.getElementById('liTabBookmarks').className = 'tabs-item';
            document.getElementById('liTabMemView').className = 'tabs-item';

            break;
        case "tabBookmarksButton":
            document.getElementById('tabSearch').style.display = 'none';
            document.getElementById('tabStrings').style.display = 'none';
            document.getElementById('tabPatch').style.display = 'none';
            document.getElementById('tabSpeedHack').style.display = 'none';
            document.getElementById('tabBookmarks').style.display = 'block';
            document.getElementById('tabMemView').style.display = 'none';

            document.getElementById('liTabSearch').className = 'tabs-item';
            document.getElementById('liTabStrings').className = 'tabs-item';
            document.getElementById('liTabPatch').className = 'tabs-item';
            document.getElementById('liTabSpeedHack').className = 'tabs-item';
            document.getElementById('liTabBookmarks').className = 'tabs-item is-active';
            document.getElementById('liTabMemView').className = 'tabs-item';

            break;
        case "tabMemViewButton":
            document.getElementById('tabSearch').style.display = 'none';
            document.getElementById('tabStrings').style.display = 'none';
            document.getElementById('tabPatch').style.display = 'none';
            document.getElementById('tabSpeedHack').style.display = 'none';
            document.getElementById('tabBookmarks').style.display = 'none';
            document.getElementById('tabMemView').style.display = 'block';

            document.getElementById('liTabSearch').className = 'tabs-item';
            document.getElementById('liTabStrings').className = 'tabs-item';
            document.getElementById('liTabPatch').className = 'tabs-item';
            document.getElementById('liTabSpeedHack').className = 'tabs-item';
            document.getElementById('liTabBookmarks').className = 'tabs-item';
            document.getElementById('liTabMemView').className = 'tabs-item is-active';

            break;
        default:
            throw new Error("Bad tab ID " + id);
    }
};

const buttons = document.getElementsByName('tabButton');

for (let i = 0; i < buttons.length; i++) {
	buttons[i].onclick = function(e) {
		e.preventDefault();

		const id = e.target.id;

		changeTab(id);
	};
}
