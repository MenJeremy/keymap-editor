<script>
import filter from 'lodash/filter'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import keyBy from 'lodash/keyBy'
import times from 'lodash/times'
import fuzzysort from 'fuzzysort'
import { getKeyStyles } from '../key-units'

import { getBehaviourParams } from '../keymap'
import { getKeyBoundingBox } from '../key-units'
import KeyValue from './key-value.vue'
import KeyParamlist from './key-paramlist.vue'
import Modal from './modal.vue'
import ValuePicker from './value-picker.vue'
import InputDialog from './input-dialog.vue'
import pick from 'lodash/pick'
import cloneDeep from 'lodash/cloneDeep'

function makeIndex (tree) {
  const index = []
  ;(function traverse(tree) {
    const params = tree.params || []
    index.push(tree)
    params.forEach(traverse)
  })(tree)

  return index
}
export default {
  name: 'macro',
  emits: ['macroupdate'],
  components: {
    Modal,
    ValuePicker,
    InputDialog
  },
  props: {
    target: Object,
    choices: Array,
    param: [String, Object],
    params: Object,
    value: String,
    prompt: String,
    searchKey: String,
    searchThreshold: {
      type: Number,
      default: 10
    },
    showAllThreshold: {
      type: Number,
      default: 50,
      validator: value => value >= 0
    }
  },
  emits: ['cancel', 'done'],
  inject: [
    'keycodes',
    'behaviours',
    'indexedKeycodes',
    'indexedBehaviours',
  ],
  provide() {
    return {

    }
  },
  data() {
    return {
      query: null,
      highlighted: null,
      showAll: false,
      selectedMacro: null,
      selectedIdx: -1,
      editing: null,
      editingMacro: false,
      saving: false,
      addMacro: false
    }
  },
mounted() {
    document.body.addEventListener('click', this.handleClickOutside, true)
},
unmounted() {
  document.body.removeEventListener('click', this.handleClickOutside, true)
},
computed: {
  macro() {
    const { query, choices } = this
    const options = { key: this.searchKey, limit: 30 }
    const filtered = fuzzysort.go(query, choices, options)
    const showAll = this.showAll || this.searchThreshold > choices.length

    if (showAll) {
      return choices
    } else if (!query) {
      return choices.slice(0, this.searchThreshold)
    }

    return filtered.map(result => ({
      ...result.obj,
      search: result
    }))
  },
  // behaviour() {
  //   const bind = this.value
  //   const sources = this.getSources()
  //   return get(sources, ['behaviours', bind])
  // },
  // behaviourParams() {
  //   return getBehaviourParams(this.params, this.behaviour)
  // },
  enableShowAllButton() {
      return (
        !this.showAll &&
        this.choices.length > this.searchThreshold &&
        this.choices.length <= this.showAllThreshold
      )
    },
    style() {
      const rect = this.target.getBoundingClientRect()
      return  {
        // display: 'block',
        // top: `${window.scrollY + (rect.top + rect.bottom) / 2}px`,
        // left: `${window.scrollX + (rect.left + rect.right) / 2}px`
      }
    }
  },
  methods: {
    getSources() {
      return {
        kc: this.indexedKeycodes,
        code: this.indexedKeycodes,
        mod: keyBy(filter(this.keycodes, 'isModifier'), 'code'),
        macro: this.macro,
        behaviours: this.indexedBehaviours,
        layer: keyBy(this.availableLayers, 'code')
      }
    },
    isReady() {
      return (
        Object.keys(this.macro).length > 0
      )
    },
    highlightMacro(result) {
      return fuzzysort.highlight(result)
    },
    handleClickResult(result, idx) {
      //Update selected macro
      //this.updateMacro()

      this.selectedMacro = result //cloneDeep(result)//.textArray.toString()
      this.selectedIdx = idx; 
    },
    handleKeyPress(event) {
      setTimeout(() => {
        this.query = event.target.value
      })
    },
    handleSelectActive() {
      if (this.macro.length > 0 && this.highlighted !== null) {
        this.handleClickResult(this.macro[this.highlighted])
      }
    },
    handleHighlightNext() {
      //this.setHighlight(0, 1)
    },
    handleHighlightPrev() {
      //this.setHighlight(this.macro.length - 1, -1)
    },
    setHighlight(initial, offset) {
      if (this.macro.length === 0) {
        this.highlighted = null
        return
      }
      if (offset === undefined) {
        this.highlighted = initial
        return
      }

      this.highlighted = this.highlighted === null ? initial : cycle(this.macro, this.highlighted, offset)
      this.scrollIntoViewIfNeeded(this.$el.querySelector(`.macro li[data-result-index="${this.highlighted}`), false)
    },
    handleClickOutside(event) {
      // if (!this.$el.contains(event.target)) {
      //   this.cancel()
      // }
    },
    // acceptMacro() {
    //   //this.$emit('done')
    //   this.updateMacro()
    //   this.$emit('done')
    // },
    // cancelMacro() {
    //   this.$emit('cancel', 'done')
    // },
    // updateMacro() {
    //   if (this.selectedMacro !== null)
    //   {
    //     this.macro[this.selectedIdx] = this.selectedMacro
    //   }
    // },
    scrollIntoViewIfNeeded (element, alignToTop) {
      const scroll = element.offsetParent.scrollTop
      const height = element.offsetParent.offsetHeight
      const top = element.offsetTop
      const bottom = top + element.scrollHeight

      if (top < scroll || bottom > scroll + height) {
        element.scrollIntoView(alignToTop)
      }
    },
    getSearchTargets(param, behaviour) {
      // Special case for behaviour commands which can dynamically add another
      // parameter that isn't defined at the root level of the behaviour.
      // Currently this is just `&bt BT_SEL` and is only represented as an enum.
      if (param.enum) {
        return param.enum.map(v => ({ code: v }))
      }

      switch (param) {
        case 'behaviour':
          return this.behaviours
        case 'layer':
          return this.availableLayers
        case 'macro':
          return this.macro
        case 'mod':
          return filter(this.keycodes, 'isModifier')
        case 'command':
          return get(this.sources, ['behaviours', behaviour, 'commands'], [])
        case 'kc':
        default:
          return this.keycodes
      }
    },
    boundingBox() {
      return this.layout.map(key => getKeyBoundingBox(
        { x: key.x, y: key.y },
        { u: key.u || key.w || 1, h: key.h || 1 },
        { x: key.rx, y: key.ry, a: key.r }
      )).reduce(({ x, y }, { max }) => ({
        x: Math.max(x, max.x),
        y: Math.max(y, max.y)
      }), { x: 0, y: 0 })
    },
    getWrapperStyle() {
      const bbox = this.boundingBox()
      return {
        width: `${bbox.x}px`,
        height: `${bbox.y}px`,
        margin: '0 auto',
        padding: '40px'
      }
    },
    handleUpdateMacro() {
    //   const original = this.keymap.layers
    //   const layers = [
    //     ...original.slice(0, layerIndex),
    //     updatedLayer,
    //     ...original.slice(layerIndex + 1)
    //   ]

    //   this.$emit('update', { ...this.keymap, layers })
    },
    // handleDeleteMacro(layerIndex) {
    //   const layer_names = [...this.keymap.layer_names];
    //   layer_names.splice(layerIndex, 1);
    //   const layers = [...this.keymap.layers];
    //   layers.splice(layerIndex, 1);
    //   this.$emit("update", { ...this.keymap, layers, layer_names });
    // },
    uClass() { return `key-${this.size.u}u` },
    hClass() { return `key-${this.size.h}h` },
    positioningStyle() {
      return getKeyStyles(this.position, this.size, this.rotation)
    },
    position(key) {
      const { x, y } = key
      return { x, y }
    },
    rotation(key) {
      const { rx, ry, r } = key
      return { x: rx, y: ry, a: r }
    },
    size(key) {
      const { w = 1, u = w, h = 1 } = key
      return { u, h }
    },
    onMouseOver(event) {
      const old = document.querySelector('.highlight')
      old && old.classList.remove('highlight')
      event.target.classList.add('highlight')
    },
    onMouseLeave(event) {
      event.target.classList.remove('highlight')
    },
    addNewMacro(event) {
      this.addMacro = true
    },
    addKey(event) {
      const newObject = {};
      newObject.target = this.$refs.items;
      newObject.codeIndex = 1;
      newObject.param = 'code';

      this.editing = pick(newObject,  ['target', 'codeIndex', 'code', 'param'])
      this.editing.insertIdx = -1
      this.editing.targets = this.getSearchTargets(this.editing.param, this.value)
    },
    insertKey(idx) {
      const newObject = {};
      newObject.target = this.$refs.items;
      newObject.codeIndex = 1;
      newObject.param = 'code';

      this.editing = pick(newObject,  ['target', 'codeIndex', 'code', 'param'])
      this.editing.insertIdx = idx
      this.editing.targets = this.getSearchTargets(this.editing.param, this.value)
    },
    createPromptMessage(param) {
      const promptMapping = {
        layer: 'Select layer',
        mod: 'Select modifier',
        behaviour: 'Select behaviour',
        command: 'Select command',
        keycode: 'Select key code'
      }

      if (param.name) {
        return `Select ${param.name}`
      }

      return promptMapping[param] || promptMapping.keycode
    },
    handleSelectKey(source) {
      // const { normalized } = this
      const { codeIndex } = this.editing
      const updated = cloneDeep(this.normalized('&kp', source.params))
      const index = makeIndex(updated)
      const targetCode = index[codeIndex]

      targetCode.value = source.code
      targetCode.params = []
      index.forEach(node => {
        delete node.source
      })
      //this.normalize(source, 'code')

      if (this.editing.insertIdx >= 0)
      {
        this.selectedMacro.textArray.splice(this.editing.insertIdx, 0, source.code)
        this.selectedMacro.keys.splice(this.editing.insertIdx, 0, updated)
      }
      else
      {
        this.selectedMacro.textArray.push(source.code)
        this.selectedMacro.keys.push(updated)
      }

      this.editing = null

      this.$emit('macroupdate')
    },
    deleteKey(idx) {
      this.selectedMacro.textArray.splice(idx, 1)
      this.selectedMacro.keys.splice(idx, 1)

      this.$emit('macroupdate')
    },
    getSourceValue(value, as) {
      if (as === 'command') return commands[value]
      if (as === 'raw' || as.enum) return { code: value }
      if (as === 'macro') return { code: value }
      const sources = this.getSources()

      return sources[as][value]
    },
    normalize(node, as) {
      if (!node) {
        return { value: undefined, params: [] }
      }
      const { value, params } = node
      const source = this.getSourceValue(value, as)

      return {
        value,
        source,
        params: get(source, 'params', []).map((as, i) => (
         this.normalize(params[i], as)
        ))
      }
    },
    normalized(value, params) {
        //const commands = keyBy(this.behaviour.commands, 'code')

      return {
        value,
        source: this.behaviour(value),
        params: this.behaviourParams(value, this.behaviour(value)).map((as, i) => (
          this.normalize(params[i], as)
        ))
      }
    },
    behaviour(value) {
      const bind = value
      const sources = this.getSources()
      return get(sources, ['behaviours', bind])
    },
    behaviourParams(params, behaviour) {
      return getBehaviourParams(params, behaviour)
    },
    handleAddMacro(macroName) {
      var exists = false

      this.macro.filter(function(value) {
        if (value.code.toLowerCase() == macroName.toLowerCase()) {
          alert('This macro name already exists')
          exists = true;
        }
      })

      if (!exists)
      {
        var newMacro = {}
        newMacro.code = macroName.toLowerCase()
        newMacro.label = "macro_" + newMacro.code
        newMacro.keys = [];
        newMacro.textArray = [];
        this.macro.unshift(newMacro)

        this.addMacro = false
      }
    }
  }
}
</script>

<template>
  <div id="editMacro">
    <span>
      Macros
    </span>
    <button
      @click="addNewMacro"
      :disabled="this.editingMacro"
      title="Add a new macro">
      Add macro
    </button>
    <div class="container">
      <div id="macroList">
          <ul class="macro">
              <li
                  :key="`result-${i}`"
                  :class="{ highlighted: highlighted === i }"
                  :title="result.label"
                  :data-result-index="i"
                  v-for="(result, i) in macro"
                  @click="handleClickResult(result, i); setHighlight(i);">
                  <span v-if="result.search" v-html="highlight(result.search)" />
                  <span v-else v-text="result[searchKey]" />
              </li>
          </ul>
      </div>
      <div id="macroItems" ref="items">
          <div v-if="selectedMacro" id="macroContainer">
          <div v-for="(item, i) in selectedMacro.textArray" :key="`item-key-${i}`" class="macroKeyContainer">
            <span class="insertKey" @click="insertKey(i)" title="Insert key here"> + </span>
            <div class="keyMacro"
                :class="[uClass, hClass]"
                :data-label="item"
                :data-u="size.u"
                :data-h="size.h"
                :data-simple="item.length < 4"
                :data-long="item.length >= 4"
                :style="positioningStyle"
                @mouseover="onMouseOver"
                @mouseleave="onMouseLeave"
                >
                <span class="close" @click="deleteKey(i)">X</span>
                <!-- <span v-text="item" class="macroText"/> -->
                <span>
                  <span
                    class="code"
                    v-text="item">
                  </span>
                </span>
                
                </div>

            </div>
          </div>
          <!-- <ul>
              <li
                  :key="`item-key-${i}`"
                  :class="{ highlighted: highlighted === i }"
                  :title="item"
                  :data-item-index="i"
                  v-for="(item, i) in selectedMacro.textArray"              
              >
                  <span v-text="item" class="key"
                      :class="[uClass, hClass]"
                      :data-label="item"
                      :data-u="size.u"
                      :data-h="size.h"
                      :data-simple="isSimple"
                      :data-long="isComplex"
                      :style="positioningStyle"
                      />
              </li>
          </ul> -->
        <!-- <textarea v-model="selectedMacro" class="macroText" disabled>  
        </textarea> -->
      </div>
      <div class="macroActions">
        <button
          @click="addKey"
          :disabled="this.selectedMacro == null"
          title="Add new key">
          Add key
        </button>
        <!-- <button
          @click="acceptMacro"
          title="Done">
          Done
        </button>
        <button
          @click="cancelMacro"
          title="Cancel">
          Cancel
        </button> -->
      </div>
    </div>
    <modal v-if="editing">
      <value-picker
        :target="editing.target"
        :value="editing.code"
        :param="editing.param"
        :choices="editing.targets"
        :prompt="createPromptMessage(editing.param)"
        searchKey="code"
        @select="handleSelectKey"
        @cancel="editing = null"
      />
    </modal>
    <modal v-if="addMacro">
      <input-dialog
        @accept="handleAddMacro"
        @cancel="addMacro = false"
      />
    </modal>
  </div>
</template>

<style scoped>

#editMacro {
  margin: 20px;
  width: 80%;
}
.container {
    display: flex;
    align-items: stretch;
}
#macroList {
    width: 300px;
}
#macroItems {
    margin-left: 10px;
    flex-grow: 3;
    padding: 5px;
    border: black solid 1px;
    border-radius: 10px;
}
#macroContainer {
  display: flex;
}
.dialog input {
	display: block;
	width: 100%;
	height: 30px;
	line-height: 30px;

	font-size: 120%;
	margin: 0;
	padding: 4px;
	border: none;
	border-radius: 4px;
  box-sizing: border-box;
}
ul.macro {
	font-family: monospace;
	list-style-position: inside;
	list-style-type: none;
	max-height: 200px;
	overflow: scroll;
	padding: 4px;
  margin: 4px 0;
	background: rgba(0, 0, 0, 0.8);
	border-radius: 4px;
}
.macro li {
	cursor: pointer;
	color: white;
	padding: 5px;
}
.macro li:hover, .macro li.highlighted {
	background: white;
	color: black;
}
.macro li b { color: red; }

.choices-counter {
  font-size: 10px;
}

.choices-counter a {
  color: var(--selection);
  border-bottom: 1px dotted var(--selection);
  cursor: pointer;
}

.macroText {
  width: 100%;
  height: 200px;
}
.macroKeyContainer {
  display: flex;
}
.keyMacro {
	position: relative;
  margin-right: 5px;
  height: 50px;
  width: 50px;
	display: flex;
	justify-content: center;
	align-items: center;

	color: #999;
	background-color: whitesmoke;
	font-size: 110%;
	border-radius: 5px;
  z-index: 9998;
}
.keyMacro:hover {
	background-color: var(--hover-selection);
	transition: 200ms;
}
.keyMacro:hover .code, .key:hover .behaviour-binding {
	color: white;
}
.keyMacro > .code {
	padding: 5px;
}

.keyMacro[data-simple="true"] { font-size: 100%; }
.keyMacro[data-long="true"] { font-size: 60%; }

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

.close {
  position: absolute;
  top: 1px;
  right: 1px;
  z-index:9999;
  font-size: 10px;
  font-weight: bold;
  transition: 0.3s;
  border: 1px solid;
  border-radius: 50%;
  padding-left: 3px;
  padding-right: 3px;
}

/* Change cursor when pointing on button */
.close:hover,
.close:focus {
    text-decoration: none;
    cursor: pointer;
    background-color: #ffffff;
}

.code {
	cursor: pointer;
	display: inline-block;
	box-sizing: content-box;
	min-width: 0.5em;
	text-align: center;
	border-radius: 4px;
}
.code.highlight {
	background-color: white !important;
	color: var(--hover-selection) !important;
}

.insertKey {
  position: relative;
  top: 15px;
  height: 15px;
  margin-right: 5px;
  font-size: 15px;
  transition: 0.3s;
  border: 1px solid;
  border-radius: 50%;
  padding-left: 4px;
  padding-right: 4px;
  padding-bottom: 4px;
}

/* Change cursor when pointing on button */
.insertKey:hover,
.insertKey:focus {
    text-decoration: none;
    cursor: pointer;
    color: white;
    background-color: var(--hover-selection);
}

</style>