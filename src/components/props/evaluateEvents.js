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
    let args = events[eventName].match(/[^,()]+/g)
    let ngfn = scope.$eval(args.shift())
    args.length === 0 && args.push('$event')
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
        return ngfn.apply(null, evalArgs)
      })
    }
  })
  return evaluatedEvents
}
