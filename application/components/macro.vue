<script>
import filter from 'lodash/filter'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import keyBy from 'lodash/keyBy'
import times from 'lodash/times'
import fuzzysort from 'fuzzysort'
import { getKeyStyles } from '../key-units'

import { getKeyBoundingBox } from '../key-units'

export default {
  name: 'macro',
  components: {
  },
  props: {
    target: Object,
    choices: Array,
    param: [String, Object],
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
  emits: ['cancel', 'update'],
  inject: [
    'keycodes',
    'behaviours',
    'indexedKeycodes',
    'indexedBehaviours'
  ],
  provide() {
    return {
      getSearchTargets: this.getSearchTargets,
      getSources: () => this.sources
    }
  },
  data() {
    return {
      query: null,
      highlighted: null,
      showAll: false,
      selectedMacro: {},
      editing: null
    }
  },
mounted() {
    document.body.addEventListener('click', this.handleClickOutside, true)
  },
  unmounted() {
    document.body.removeEventListener('click', this.handleClickOutside, true)
  },
  computed: {
    macros() {
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
    isReady() {
      return (
        Object.keys(this.macros).length > 0
      )
    },
    highlightMacro(result) {
      return fuzzysort.highlight(result)
    },
    handleClickResult(result) {
      //this.$emit('select', result)
      this.selectedMacro = result;//.textArray.toString()
    },
    handleKeyPress(event) {
      setTimeout(() => {
        this.query = event.target.value
      })
    },
    handleSelectActive() {
      if (this.macros.length > 0 && this.highlighted !== null) {
        this.handleClickResult(this.macros[this.highlighted])
      }
    },
    handleHighlightNext() {
      //this.setHighlight(0, 1)
    },
    handleHighlightPrev() {
      //this.setHighlight(this.macros.length - 1, -1)
    },
    setHighlight(initial, offset) {
      if (this.macros.length === 0) {
        this.highlighted = null
        return
      }
      if (offset === undefined) {
        this.highlighted = initial
        return
      }

      this.highlighted = this.highlighted === null ? initial : cycle(this.macros, this.highlighted, offset)
      this.scrollIntoViewIfNeeded(this.$el.querySelector(`.macros li[data-result-index="${this.highlighted}`), false)
    },
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.cancel()
      }
    },
    cancel() {
      this.$emit('cancel', 'select')
    },
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
          return this.macros
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
    handleUpdateMacros() {
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
  }
}
</script>

<template>
  <div id="editMacros">
    <div class="container">
    <div id="macroList">
        <ul class="macros">
            <li
                :key="`result-${i}`"
                :class="{ highlighted: highlighted === i }"
                :title="result.label"
                :data-result-index="i"
                v-for="(result, i) in macros"
                @click="handleClickResult(result); setHighlight(i);"
            >
                <span v-if="result.search" v-html="highlight(result.search)" />
                <span v-else v-text="result[searchKey]" />
            </li>
        </ul>
    </div>
    <div id="macroItems">
        <div v-for="(item, i) in selectedMacro.textArray" 
            :key="`item-key-${i}`"
            class="keyMacro"
            :class="[uClass, hClass]"
            :data-label="item"
            :data-u="size.u"
            :data-h="size.h"
            :data-simple="true"
            :data-long="false"
            :style="positioningStyle"
            @mouseover="onMouseOver"
            @mouseleave="onMouseLeave"
            >
            <span v-text="item" />
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
      <!-- <textarea v-model="selectedMacro" class="macrosText" disabled>  
      </textarea> -->
    </div>
    </div>
  </div>
</template>

<style scoped>

#editMacros {
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
ul.macros {
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
.macros li {
	cursor: pointer;
	color: white;
	padding: 5px;
}
.macros li:hover, .macros li.highlighted {
	background: white;
	color: black;
}
.macros li b { color: red; }

.choices-counter {
  font-size: 10px;
}

.choices-counter a {
  color: var(--selection);
  border-bottom: 1px dotted var(--selection);
  cursor: pointer;
}

.macrosText {
  width: 100%;
  height: 200px;
}
.keyMacro {
	float: left;
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
}
.keyMacro:hover {
	background-color: var(--hover-selection);
	transition: 200ms;
	z-index: 1;
}
.keyMacro:hover .code, .key:hover .behaviour-binding {
	color: white;
}
.keyMacro > .code {
	padding: 5px;
}

.keyMacro[data-simple="true"] { font-size: 100%; }
.keyMacro[data-long="true"] { font-size: 60%; }
</style>