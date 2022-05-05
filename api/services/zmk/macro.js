const fs = require('fs')
const path = require('path')
const filter = require('lodash/filter')
const flatten = require('lodash/flatten')
const get = require('lodash/get')
const keyBy = require('lodash/keyBy')
const map = require('lodash/map')
const uniq = require('lodash/uniq')

const { renderTable } = require('./layout')
const defaults = require('./defaults')
const { INSPECT_MAX_BYTES } = require('buffer')

class MacroValidationError extends Error {
  constructor (errors) {
    super()
    this.name = 'MacroValidationError'
    this.errors = errors
  }
}

function encodeBindValue(parsed) {
  const params = (parsed.params || []).map(encodeBindValue)
  const paramString = params.length > 0 ? `(${params.join(',')})` : ''
  return parsed.value + paramString
}

function encodeKeyBinding(parsed) {
  const { value, params } = parsed

  return `<${value} ${params.map(encodeBindValue).join(' ')}>`.trim()
}

/**
 * Parse a bind string into a tree of values and parameters
 * @param {String} binding
 * @returns {Object}
 */
function parseKeyBinding(binding) {
  const paramsPattern = /\((.+)\)/

  function parse(code) {
    const value = code.replace(paramsPattern, '')
    const params = get(code.match(paramsPattern), '[1]', '').split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(parse)

    return { value, params }
  }

  const value = binding.match(/^(&.+?)\b/)[1]
  const params = filter(binding.replace(/^&.+?\b\s*/, '')
    .split(' '))
    .map(parse)

  return { value, params }
}

function parseMacro (macro) {
  const macroObj = []
  const macroPrefix = 'macro_';
  const macroLabel = 'label';
  const macroBindings = 'bindings';
  let lastMacro = null

  if (macro && macro.length > 0) {
    macro.split(/\r?\n/).forEach(line =>  {
      let text = String(line)
      //Start of a Macro
      if (text.includes("{"))
      {
        lastMacro = new Object()
        let iStart = text.indexOf(macroPrefix)
        let iEnd = text.indexOf(':')
        lastMacro.code = text.substring(iStart + macroPrefix.length, iEnd).trim()
      }
      else if (text.includes(macroLabel))
      {
        let iStart = text.indexOf('=')
        let iEnd = text.indexOf(';')
        lastMacro.label = text.substring(iStart + 1, iEnd).trim().replace(/"/g, "");
      }
      else if (text.includes(macroBindings))
      {
        let iStart = text.indexOf('=')
        let iEnd = text.indexOf(';')

        lastMacro.keys = [];
        lastMacro.textArray = [];
        lastMacro.bindings = text.substring(iStart + 1, iEnd - 1)
        lastMacro.bindingArray = lastMacro.bindings.split(", ")             
        for (let i = 0; i < lastMacro.bindingArray.length; i++) {
          var binding = parseKeyBinding(lastMacro.bindingArray[i].replace(/</g, "").replace(/>/g, "").trim())                    
          if (binding)
          {
            lastMacro.keys.push(binding)
            if (binding.params && binding.params !== null && binding.params.length > 0)
            {
              lastMacro.textArray.push(binding.params[0].value)
            }
          }
        }
      }

      //End of a Macro
      if (text.includes("}"))
      {
        macroObj.push(lastMacro)
      }
    })
  }
  return macroObj;
}

function generateMacro(macro) {
  return generateMacroText(macro)
}

function generateMacroText (macro) {
  var macroList = [];

  macro.map(item => {
    var macroName = "macro_" + item.code
    var bindings = []
    for(const key of item.keys) {
      bindings.push(encodeKeyBinding(key))
    }

    var macroItem = {}
    
    macroItem = macroName + ': ' + macroName + '{\n' +
        'compatible = "zmk,behavior-macro";\n' +
        'label = "' + macroName + '";\n' +
        '#binding-cells = <0>;\n' +
        'bindings = ' + bindings.join(', ') + ';\n' +
      '};';

      macroList.push(macroItem)
  })
  
  var value = macroList.join('\n')
  return value
}

function validateMacroJson(macro) {
  const errors = []

  if (errors.length) {
    throw new MacroValidationError(errors)
  }
}

module.exports = {
  MacroValidationError,
  parseMacro,
  generateMacro,
  validateMacroJson
}
