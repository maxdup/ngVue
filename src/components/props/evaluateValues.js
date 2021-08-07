import angular from 'angular'

/**
 * @param expr Object|string|null
 * @param scope Object
 * @returns {string|Object|null}
 */
export default function evaluateValues (expr, scope) {
  if (!expr) {
    return null
  }

  if (angular.isString(expr)) {
    return scope.$eval(expr)
  }

  const evaluatedValues = {}
  Object.keys(expr).forEach(key => {
    if (key.startsWith(':') || key.startsWith('v-bind:')) {
      let actualkey = key.split(':').slice(-1)[0]
      evaluatedValues[actualkey] = scope.$eval(expr[key])
    } else {
      evaluatedValues[key] = expr[key]
    }
  })

  return evaluatedValues
}
