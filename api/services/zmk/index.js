const {
  parseKeyBinding,
  generateKeymap,
} = require('./keymap')

const {
  generateMacro
} = require('./macro')

const {
  loadBehaviors,
  loadKeycodes,
  loadLayout,
  loadKeymap,
  loadMacro,
  exportKeymap,
  exportMacro
} = require('./local-source')

module.exports = {
  parseKeyBinding,
  generateKeymap,
  generateMacro,
  loadBehaviors,
  loadKeycodes,
  loadLayout,
  loadKeymap,
  loadMacro,
  exportKeymap,
  exportMacro
}
