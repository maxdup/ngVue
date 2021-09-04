import angular from 'angular'
import Vue from 'vue'
import getVueComponent from '../components/getVueComponent'
import getPropExprs from '../components/props/getExpressions'
import watchPropExprs from '../components/props/watchExpressions'
import evalValues from '../components/props/evaluateValues'
import evalPropEvents from '../components/props/evaluateEvents'
import evaluateDirectives from '../directives/evaluateDirectives'
import extractSpecialAttributes from '../components/props/extractSpecialAttributes'
import watchSpecialAttributes from '../components/props/watchSpecialAttributes'

export function ngVueLinker (componentName, jqElement, elAttributes, scope, $injector) {
  if (!jqElement.parent().length) throw new Error('ngVue components must have a parent tag or they will not render')

  const $compile = $injector.get('$compile')
  const $ngVue = $injector.has('$ngVue') ? $injector.get('$ngVue') : null
  const dataExprsMap = getPropExprs(elAttributes)
  const Component = getVueComponent(componentName, $injector)
  const directives = evaluateDirectives(elAttributes, scope) || []
  const reactiveData = {
    _v: {
      props: evalValues(dataExprsMap.props || dataExprsMap.data, scope) || {},
      attrs: evalValues(dataExprsMap.htmlAttributes, scope) || {},
      special: extractSpecialAttributes(elAttributes)
    }
  }
  const on = evalPropEvents(dataExprsMap, scope) || {}

  const inQuirkMode = $ngVue ? $ngVue.inQuirkMode() : false
  const rootProps = $ngVue ? $ngVue.getRootProps() : {}

  const mounted = rootProps.mounted
  const props = Object.assign({}, rootProps)

  let namedTemplates = {}
  const element = jqElement[0]
  if (element.innerHTML.trim()) {
    if (element.children.length === 0) {
      // todo: revise
      const span = document.createElement('span')
      span.innerHTML = element.innerHTML.trim()
    } else {
      let templates = []
      let unnamedTemplates = []
      let notTemplates = []

      element.children.forEach(function (el) {
        if (el.tagName === 'TEMPLATE') {
          templates.push(el)
        } else {
          notTemplates.push(el)
        }
      })

      templates.forEach(el => {
        let named = null
        el.attributes.forEach(attr => {
          if (attr.name.startsWith('v-slot:')) {
            named = attr.name.split(':')[1]
          }
        })
        if (named) {
          // namedTemplates[named] = el.cloneNode(true).content.firstElementChild.outerHTML;
          // let div = document.createElement('div')
          // div.appendChild(el.cloneNode(true).content)
          // namedTemplates[named] = div
          namedTemplates[named] = el.cloneNode(true).content
        } else {
          // unnamedTemplates.push(el.cloneNode(true).content.firstElementChild.outerHTML);
          unnamedTemplates.push(el.cloneNode(true).content)
        }
      })
      if (!namedTemplates['default']) {
        if (unnamedTemplates.length > 0) {
          namedTemplates['default'] = unnamedTemplates[0]
        } else {
          if (notTemplates.length > 0) {
            namedTemplates['default'] = notTemplates[0]
          } else {
            namedTemplates['default'] = element.innerHTML
          }
        }
      }
    }
  }
  let slotwrapper = Vue.component('slotwrapper', {
    template: '<div></div>',
    props: ['rawhtml'],
    mounted () {
      $compile(this.rawhtml)(scope)
      this.$el.parentNode.replaceChild(this.rawhtml, this.$el)
    }
  })

  props.mounted = () => {
    if (angular.isFunction(mounted)) {
      mounted.apply(this, arguments)
    }
  }

  const watchOptions = {
    depth: elAttributes.watchDepth,
    quirk: inQuirkMode
  }
  watchPropExprs(dataExprsMap, reactiveData, jqElement, watchOptions, scope, 'props')
  watchPropExprs(dataExprsMap, reactiveData, jqElement, watchOptions, scope, 'attrs')
  watchSpecialAttributes(reactiveData, jqElement, scope)

  let vueInstance = new Vue({
    name: 'NgVue',
    el: jqElement[0],
    data: reactiveData,
    render (h) {
      let scopedslots = {}
      Object.keys(namedTemplates).forEach(key => {
        scopedslots[key] = () => {
          return h(slotwrapper, { props: { rawhtml: namedTemplates[key] } })
        }
      })
      return (
        <Component
          {...{ directives }}
          {...{ props: reactiveData._v.props, on, scopedSlots: scopedslots, attrs: reactiveData._v.attrs }}
          {...reactiveData._v.special}
        >
          {<span ref="__slot__" />}
        </Component>
      )
    },
    ...props
  })

  scope.$on('$destroy', () => {
    vueInstance.$destroy()
    angular.element(vueInstance.$el).remove()
    vueInstance = null
  })
}
