# CETUS

![Logo](/icons/logo.png)

## Overview

Check out the slides for [Hacking WebAssembly Games with Binary Instrumentation](https://media.defcon.org/DEF%20CON%2027/DEF%20CON%2027%20presentations/DEFCON-27-Jack-Baker-Hacking-Web-Assembly-Games.pdf) at Defcon 27.

Cetus is a browser extension (Tested on Chrome and Firefox) for hacking WebAssembly games. Cetus implements a number of features familiar to [Cheat Engine](https://www.cheatengine.org) users

- Memory searching
- Watchpoints (Implemented via binary instrumentation using [WAIL](https://github.com/Qwokka/wail))
- Memory freezing
- Code disassembly
- Code patching

The name Cetus comes from the Latin word for "sea monster"

## Examples

[Read the Tutorial](https://github.com/Qwokka/Cetus/wiki/Cetus-101---Invincibility)

[Check out some CTF Writeups](https://github.com/Qwokka/Cetus/wiki/CTF-Writeups)

[Or watch this video](https://www.youtube.com/watch?v=V8UkCsPzbhQ)

## Installation

Official packages are coming post-Defcon (Assuming Google/Mozilla allow them). For now Cetus can be installed as a developer extension.

Download the latest release or:

`git clone --recursive https://github.com/Qwokka/Cetus`

### Chrome

- Download [the latest release](https://github.com/Qwokka/Cetus/releases)
- Unpack zip file
- Follow [these instructions](https://stackoverflow.com/a/24577660)

### Firefox

- Download [the latest release](https://github.com/Qwokka/Cetus/releases)
- Unpack zip file
- Follow [these instructions](https://www.ghacks.net/2015/12/24/temporary-add-on-loading-coming-to-firefox/)
## Credits

[Jack Baker](https://github.com/Qwokka): Development

[Tigran Tumasov](https://github.com/Shugar): UI, UX, CSS, front end design

[Bradlee Keith Setliff](http://bradsetliff.com/): WAIL and Cetus logo designs

[wasm-cheat-engine](https://github.com/vakzz/wasm-cheat-engine): Inspiration, a little bit of derivative code

### Major Contributors

@nailgg (Real-Time Memory Viewer)

## License

Cetus is licensed under [Apache License 2.0](/LICENSE)

[stacktrace.js](https://www.stacktracejs.com/) is licensed under the [MIT License](content/thirdparty/stacktrace/LICENSE)

[prism.js](https://prismjs.com/) is licensed under the [MIT License](extension/thirdparty/prism/LICENSE)

[bliss.js](https://blissfuljs.com/) is licensed under the [MIT License](extension/thirdparty/bliss/LICENSE)

[wasm-cheat-engine](https://github.com/vakzz/wasm-cheat-engine) is licensed under the [MIT License](https://github.com/vakzz/wasm-cheat-engine/blob/master/LICENSE.txt)
