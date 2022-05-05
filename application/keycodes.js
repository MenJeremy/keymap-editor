import * as api from './api'

export function loadBehaviours () {
  return api.loadBehaviours()
}

export function loadKeycodes () {
  return api.loadKeycodes().then(normalizeZmkKeycodes)
}

export function loadMacro () {
  return api.loadMacro()
}

function shortestAlias (aliases) {
  return [...aliases]
    .sort((a, b) => a.length - b.length)[0]
    .replace(/^KC_/, '')
}

function normalizeZmkKeycodes (keycodes) {
  const fnPattern = /^(.+?)\((code)\)$/

  return keycodes.reduce((keycodes, keycode) => {
    const { description, context, symbol } = keycode
    const aliases = keycode.names.filter(name => !name.match(fnPattern))
    const fnCode = keycode.names.map(name => name.match(fnPattern)).filter(v => !!v)[0]
    const base = { aliases, description, context, symbol: symbol || shortestAlias(aliases), params: [] }

    for (let code of aliases) {
      keycodes.push(Object.assign({}, base, {
        code,
        isModifier: !!fnCode
      }))
    }

    if (fnCode) {
      keycodes.push(Object.assign({}, base, {
        code: fnCode[1],
        params: fnCode[2].split(',')
      }))
    }

    return keycodes
  }, [])
}
