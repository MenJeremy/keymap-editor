<script>
export default {
  name: 'InputDialog',
  emits: ['accept', 'cancel'],
  props: {
  },
  data() {
    return {
      inputVal: "",
    }
  },
  mounted() {
    this.focusInput();
    document.body.addEventListener('click', this.handleClickOutside, true)

    if (this.$refs.searchBox) {
      this.$refs.searchBox.focus()
    }
  },
  unmounted() {
    document.body.removeEventListener('click', this.handleClickOutside, true)
  },
  methods: {
    accept() {     
      this.$emit('accept', this.inputVal)
    },
    handleClickOutside(event) {
      if (!this.$el.contains(event.target)) {
        this.cancel()
      }
    },
    cancel() {
      this.$emit('cancel')
    },
    focusInput() {
      this.$refs.inputBox.focus();
    }
  }
}
</script>

<template>
  <div class="dialog">
    <span>Enter new macro name</span>
    <div>
      <input
        ref="inputBox"
        type="text"
        v-model="this.inputVal"      
      />
    </div>
    <button
      @click="accept"
      :disabled="this.inputVal === ''"
      title="Add new macro">
      Add
    </button>
  </div>
</template>

<style scoped>
.dialog {
  background-color: white;
  padding: 20px 40px;
  margin: 40px;
  max-width: 500px;
  box-shadow: 0px 10px 25px rgba(0, 0, 0, 0.4);
}

.dismiss {
  display: block;
  margin: 0 auto;
}

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
</style>
