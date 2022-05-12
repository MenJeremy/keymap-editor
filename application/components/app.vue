<script>

import Initialize from './initialize.vue'
import Keymap from './keymap.vue'
import KeyboardPicker from './keyboard-picker.vue'
import Spinner from './spinner.vue'

import * as config from '../config'
import github from './github/api'
import MacroDialog from './macro-dialog.vue'
import Macro from './macro.vue'
import Modal from './modal.vue'
import pick from 'lodash/pick'

export default {
  components: {
    keymap: Keymap,
    KeyboardPicker,
    Initialize,
    Spinner,
    Modal, 
    MacroDialog,
    macro: Macro
  },
  data() {
    return {
      config,
      source: null,
      sourceOther: null,
      layout: [],
      keymap: {},
      macro: [],
      editingKeymap: {},
      saving: false,
      terminalOpen: false,
      socket: null,
      macroEdit: null,
      macroUpdated: false
    }
  },
  methods: {
    handleKeyboardSelected({ source, layout, keymap, macro, ...other }) {
      this.source = source
      this.sourceOther = other
      this.layout.splice(0, this.layout.length, ...layout)
      Object.assign(this.keymap, keymap)
      Object.assign(this.macro, macro)
      this.editingKeymap = {}
    },
    handleUpdateKeymap(keymap) {
      Object.assign(this.editingKeymap, keymap)
    },
    async handleCommitChanges() {
      const { repository, branch } = this.sourceOther.github

      if (!this.editingKeymap || !this.editingKeymap.keyboard)
        Object.assign(this.editingKeymap, this.keymap)

      this.saving = true
      await github.commitChanges(repository, branch, this.layout, this.editingKeymap, this.macro)
      this.saving = false
      Object.assign(this.keymap, this.editingKeymap)
      this.editingKeymap = {}
      this.macroUpdated = false
    },
    handleCompile() {    
      if (!this.editingKeymap || !this.editingKeymap.keyboard)
        Object.assign(this.editingKeymap, this.keymap)

      fetch('/keymap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.editingKeymap)
      })

      fetch('/macro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.macro)
      })

      Object.assign(this.keymap, this.editingKeymap)
      this.editingKeymap = {}
      this.macroUpdated = false
    },
    openCloseMacroList(event) {
      if (this.macroEdit == null)
      {
        this.macroEdit = pick(event, ['target', 'key', 'label', 'param'])
        this.macroEdit.targets = this.macro
      }
      else
      {
        this.macroEdit = null
      }
    },
    handleAcceptMacro() {
      this.macroEdit = null
    },
    handleMacroUpdate() {
      this.macroUpdated = true;
    },
    createPromptMessage(param) {
      const promptMapping = {
        layer: 'Select layer',
        mod: 'Select modifier',
        behaviour: 'Select behaviour',
        command: 'Select command',
        keycode: 'Select key macro or create a new one'
      }
      
      // if (param.name) {
      //   return `Select ${param.name}`
      // }

      return promptMapping[param] || promptMapping.keycode
    }

  }
}
</script>

<template>
  <initialize>
    <keyboard-picker @select="handleKeyboardSelected" />

    <template v-if="keymap.keyboard">
      <keymap
        :layout="layout"
        :keymap="editingKeymap.keyboard ? editingKeymap : keymap"
        :macro="macro"
        @update="handleUpdateKeymap"
      />
      <div v-if="macroEdit">
        <macro :target="macroEdit.target"
              :value="macroEdit.label"
              :param="macroEdit.param"
              :choices="macroEdit.targets"
              :prompt="createPromptMessage(macroEdit.param)"
              searchKey="label"
              @macroupdate="handleMacroUpdate"
              @done="handleAcceptMacro"
              @cancel="macroEdit = null">
        </macro>
      </div>
      <div id="actions">
        <button
          id="macroList"
          @click="openCloseMacroList">
          <template v-if="macroEdit === null">Edit Macros </template>
          <template v-else>Close Macros</template>
        </button>
        <button
          v-if="source === 'local'"
          v-text="`Save Local`"
          id="compile"
          :disabled="!this.editingKeymap.keyboard && (!this.macroUpdated || this.macroEdit)"
          @click="handleCompile"
        />

        <button
          v-if="source === 'github'"
          @click="handleCommitChanges"
          :disabled="!this.editingKeymap.keyboard && (!this.macroUpdated || this.macroEdit)"
          title="Commit keymap changes to GitHub repository"
        >
          <template v-if="saving">Saving </template>
          <template v-else>Commit Changes</template>
          <spinner v-if="saving" />
        </button>
      </div>
    </template>

  </initialize>
</template>

<style scoped>
button {
  cursor: pointer;
  background-color: var(--hover-selection);
  color: white;

  font-size: 16px;
  border: none;
  border-radius: 5px;
  padding: 5px;
  margin: 2px;
}

button[disabled] {
  background-color: #ccc;
  cursor: not-allowed;
}

.github-link {
  display: inline-block;
  position: absolute;
  z-index: 100;
  bottom: 5px;
  left: 5px;
  font-size: 110%;
  font-style: italic;
  background-color: white;
  border-radius: 20px;
  padding: 5px 10px;
  text-decoration: none;

  color: royalblue;
}

</style>
