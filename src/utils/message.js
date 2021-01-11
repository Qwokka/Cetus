// Event will be captured by content.js and passed along to the extension
export const sendExtensionMessage = function (type, msg) {
  const msgBody = {
    type: type,
    body: msg,
  }

  const evt = new CustomEvent('cetusMsgIn', { detail: JSON.stringify(msgBody) })
  window.dispatchEvent(evt)
}

// TODO Validation on all these messages
window.addEventListener(
  'cetusMsgOut',
  function (msgRaw) {
    if (cetus == null) {
      return
    }

    const msg = JSON.parse(msgRaw.detail)

    const msgType = msg.type
    const msgBody = msg.body

    if (typeof msgType !== 'string') {
      return
    }

    switch (msgType) {
      case 'queryMemory':
        const queryIndex = msgBody.index
        const queryMemType = msgBody.memType

        if (typeof queryIndex !== 'number') {
          return
        }

        const queryResult = cetus.queryMemory(queryIndex, queryMemType)

        sendExtensionMessage('queryMemoryResult', {
          index: queryIndex,
          value: queryResult,
          memType: queryMemType,
        })

        break
      case 'restartSearch':
        cetus.restartSearch()

        break
      case 'search':
        const searchMemType = msgBody.memType
        const searchComparison = msgBody.compare
        const searchLower = msgBody.lower
        const searchUpper = msgBody.upper
        const searchParam = msgBody.param

        let searchReturn
        let searchResults
        let searchResultsCount

        searchReturn = cetus.search(
          searchComparison,
          searchMemType,
          searchParam,
          searchLower,
          searchUpper
        )

        searchResultsCount = searchReturn.count
        searchResults = searchReturn.results

        let subset = {}

        // We do not want to send too many results or we risk crashing the extension
        // If there are more than 100 results, only send 100 but send the real count
        if (searchResultsCount > 100) {
          for (let property in searchResults) {
            subset[property] = searchResults[property]

            if (Object.keys(subset).length >= 100) {
              break
            }
          }

          searchResults = subset
        }

        sendExtensionMessage('searchResult', {
          count: searchResultsCount,
          results: searchResults,
          memType: searchMemType,
        })

        break
      case 'modifyMemory':
        const modifyIndex = msgBody.memIndex
        const modifyValue = msgBody.memValue
        const modifyMemType = msgBody.memType

        if (isNaN(modifyIndex) || isNaN(modifyValue) || !isValidMemType(modifyMemType)) {
          return
        }

        console.log('Changing ' + modifyIndex + ' to ' + modifyValue + ' (' + modifyMemType + ')')

        const memory = cetus.memory(modifyMemType)

        memory[modifyIndex] = modifyValue

        break
      case 'updateWatch':
        const watchIndex = msgBody.index
        const watchAddr = msgBody.addr
        const watchValue = msgBody.value
        const watchSize = msgBody.size
        const watchFlags = msgBody.flags

        if (
          isNaN(watchIndex) ||
          isNaN(watchAddr) ||
          isNaN(watchValue) ||
          isNaN(watchSize) ||
          isNaN(watchFlags)
        ) {
          return
        }

        if (typeof cetus.watchpointExports[watchIndex] === 'undefined') {
          return
        }

        cetus.watchpointExports[watchIndex](watchAddr, watchValue, watchSize, watchFlags)

        break
      case 'queryFunction':
        const funcIndex = msgBody.index

        const funcBytes = cetus.queryFunction(funcIndex)

        if (typeof funcBytes !== 'undefined') {
          sendExtensionMessage('queryFunctionResult', {
            bytes: funcBytes,
          })
        }

        break
      case 'shEnable':
        const shMultiplier = msgBody.multiplier

        if (isNaN(shMultiplier)) {
          return
        }

        console.log('Enabling speedhack at ' + shMultiplier + 'x')

        cetus.setSpeedhackMultiplier(shMultiplier)

        break
    }
  },
  false
)
