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
        case "tabSearch":
            document.getElementById('tabOne').style.display = 'block';
            document.getElementById('tabTwo').style.display = 'none';
            document.getElementById('tabThree').style.display = 'none';
            document.getElementById('tabFour').style.display = 'none';

            document.getElementById('liTabSearch').className = 'tabs-item is-active';
            document.getElementById('liTabPatch').className = 'tabs-item';
            document.getElementById('liTabSpeedHack').className = 'tabs-item';
            document.getElementById('liTabBookmarks').className = 'tabs-item';

            break;
        case "tabPatch":
            document.getElementById('tabOne').style.display = 'none';
            document.getElementById('tabTwo').style.display = 'block';
            document.getElementById('tabThree').style.display = 'none';
            document.getElementById('tabFour').style.display = 'none';

            document.getElementById('liTabSearch').className = 'tabs-item';
            document.getElementById('liTabPatch').className = 'tabs-item is-active';
            document.getElementById('liTabSpeedHack').className = 'tabs-item';
            document.getElementById('liTabBookmarks').className = 'tabs-item';

            break;
        case "tabSpeedHack":
            document.getElementById('tabOne').style.display = 'none';
            document.getElementById('tabTwo').style.display = 'none';
            document.getElementById('tabThree').style.display = 'block';
            document.getElementById('tabFour').style.display = 'none';

            document.getElementById('liTabSearch').className = 'tabs-item';
            document.getElementById('liTabPatch').className = 'tabs-item';
            document.getElementById('liTabSpeedHack').className = 'tabs-item is-active';
            document.getElementById('liTabBookmarks').className = 'tabs-item';

            break;
        case "tabBookmarks":
            document.getElementById('tabOne').style.display = 'none';
            document.getElementById('tabTwo').style.display = 'none';
            document.getElementById('tabThree').style.display = 'none';
            document.getElementById('tabFour').style.display = 'block';

            document.getElementById('liTabSearch').className = 'tabs-item';
            document.getElementById('liTabPatch').className = 'tabs-item';
            document.getElementById('liTabSpeedHack').className = 'tabs-item';
            document.getElementById('liTabBookmarks').className = 'tabs-item is-active';

            break;
        default:
            throw new Error("Bad tab ID ");
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
