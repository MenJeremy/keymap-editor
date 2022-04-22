<script>
import keyBy from 'lodash/keyBy'

import { healthcheck, loadBehaviours, loadMacros } from '../api'
import { loadKeycodes } from '../keycodes'

import Loader from './loader.vue'

export default {
  name: 'Initialize',
  components: { Loader },
  data () {
    return {
      keycodes: [],
      macros: [],
      behaviours: [],
      indexedKeycodes: {},
      indexedBehaviours: {}
    }
  },
  provide() {
    return {
      keycodes: this.keycodes,
      macros: this.macros,
      behaviours: this.behaviours,
      indexedKeycodes: this.indexedKeycodes,
      indexedBehaviours: this.indexedBehaviours
    }
  },
  methods: {
    async doReadyCheck() {
      await healthcheck()
      await this.loadAppData()
    },
    async loadAppData () {
      const [ keycodes, behaviours, macros ] = await Promise.all([
        loadKeycodes(),
        loadBehaviours(),
        loadMacros()
      ])

      this.keycodes.splice(0, this.keycodes.length, ...keycodes)
      this.behaviours.splice(0, this.behaviours.length, ...behaviours)
      this.macros.splice(0, this.macros.length, ...macros)
      Object.assign(this.indexedKeycodes, keyBy(this.keycodes, 'code'))
      Object.assign(this.indexedBehaviours, keyBy(this.behaviours, 'code'))
    }
  }
}
</script>

<template>
  <loader :load="doReadyCheck">
    <slot />
  </loader>
</template>
