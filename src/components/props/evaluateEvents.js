import angular from 'angular'

/**
 * @param dataExprsMap Object
 * @param dataExprsMap.events Object|null
 * @param scope Object
 * @returns {Object|null}
 */
export default function evaluateEvents (dataExprsMap, scope) {
  const events = dataExprsMap.events

  if (!events || !angular.isObject(events)) {
    return null
  }

  const evaluatedEvents = {}
  Object.keys(events).forEach(eventName => {
    let re = /[^,()]+/g
    let match = re.exec(events[eventName])
    let ngfn = scope.$eval(match[0])
    let args = []
    while (match) {
      args.push(match[0])
      match = re.exec(events[eventName])
    }
    evaluatedEvents[eventName] = function () {
      var _arguments = arguments

      scope.$evalAsync(function () {
        let evalArgs = []
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '$event') {
            evalArgs = [...evalArgs, ..._arguments]
          } else {
            evalArgs.push(scope.$eval(args[i]))
          }
        }
        if (evalArgs.length > 0) {
          return ngfn.apply(null, evalArgs)
        } else {
          return ngfn.apply(null, _arguments)
        }
      })
    }
  })
  return evaluatedEvents
}
