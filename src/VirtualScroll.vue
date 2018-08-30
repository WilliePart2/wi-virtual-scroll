<template>
  <div ref="scroll_container" class="scroll-container">
    <div class="scroll-height"></div>
    <div ref="scroll_view" class="view-port" :style="`transform: translateY(${scrollTop}px); padding-top: -${negativePadding};`">
      <template v-if="multicast">
        <!-- top viewPort -->
        <tempate v-if="emitItems">
          <slot :items="topViewPort.items"></slot>
        </tempate>
        <template v-if="!emitItems">
          <slot v-for="item in topViewPort.items" :item="item"></slot>
        </template>
        <!-- middle viewPort -->
        <tempate v-if="emitItems">
          <slot :items="middleViewPort.items"></slot>
        </tempate>
        <template v-if="!emitItems">
          <slot v-for="item in middleViewPort.items" :item="item"></slot>
        </template>
        <!-- bottom viewPort -->
        <tempate v-if="emitItems">
          <slot :items="bottomViewPort.items"></slot>
        </tempate>
        <template v-if="!emitItems">
          <slot v-for="item in bottomViewPort.items" :item="item"></slot>
        </template>
      </template>
      <template v-if="unicast">
        <!-- single viewPort -->
        <tempate v-if="emitItems">
          <slot :items="singleViewPort.items"></slot>
        </tempate>
        <template v-if="!emitItems">
          <slot v-for="item in singleViewPort.items" :item="item"></slot>
        </template>
      </template>
    </div>
  </div>
</template>

<script>
import ViewPort from './models/viewPort.js'

const DELAY_AFTER_SCROLL = 10
const VIEW_PORT_HEIGHT_MULTIPLIER = 1.5
const SCROLL_BOUNDARY_MULTIPLIER = 0.5

const MODE_MULTICAST = 'multicast'
const MODE_UNICAST = 'unicast'

export default {
  scrollContainer: null,
  /** height our visible area */
  viewHeight: 0,
  /** available height * VIEW_PORT_HEIGHT_MULTIPLIER */
  topViewPortHeight: 0,
  viewPortHeight: 0,
  itemsPerViewPort: 0,

  topBoundary: 0,
  bottomBoundary: 0,

  params: {
    itemHeight: {
      type: Number,
      required: true
    },
    itemSpace: Number,
    multicast: {
      type: Boolean,
      default: true
    },
    unicast: {
      type: Boolean,
      default: false
    },
    emitItems: {
      type: Boolean,
      default: false
    },
    topViewPortMultiplier: Number,
    bottomViewPortMultiplier: Number
  },
  data: () => ({
    topViewPort: new ViewPort(), // secondary viewPort
    middleViewPort: new ViewPort(), // main viewPort
    bottomViewPort: new ViewPort(), // secondary viewPort
    singleViewPort: new ViewPort(),
    scrollTop: 0,
    negativePadding: 0
  }),
  computed: {
    scrollContainer () {
      return this.$refs.scroll_container
    },
    scrollView () {
      return this.$refs.scroll_view
    },
    viewHeight () {
      return this.$options.viewHeight
    },
    viewPortHeight: {
      get () {
        return this.$options.viewPortsHeight
      },
      set (val) {
        this.$options.viewPortsHeight
      }
    },
    itemsPerViewPort: {
      get () {
        return this.$options.itemsPerViewPort
      },
      set (val) {
        this.$options.itemsPerViewPort = val
      }
    },
    topBoundary: {
      get () {
        return this.$options.topBoundary
      },
      set (val) {
        this.$options.topBoundary = val
      }
    },
    bottomBoundary: {
      get () {
        return this.$options.bottomBoundary
      },
      set (val) {
        this.$optins.bottomBoundary = val
      }
    },
    topViewPortHeight: {
      get () {
        return this.$options.topViewPortHeight
      },
      set (val) {
        this.$options.topViewPortHeight = val
        this.updateNegativePadding()
      }
    }
  },
  methods: {
    calculateViewHeight () {
      this.viewHeight = this.scrollView.clientHeight
    },
    // calculate viewPortHeight, itemsPerViewPort
    calculateParams () {
      this.$options.viewPortHeight = this.calculateViewPortHeight()
      this.$options.itemsPerViewPort = this.$optins.viewPortHeight / this.calculateItemHeight()
    },

    calculateViewPortHeight () {
      const dirtyHeight = this.getAvailableHeight() * VIEW_PORT_HEIGHT_MULTIPLIER
      const itemHeight = this.calculateItemHeight()
      const countItemsPerViewPort = Math.round(dirtyHeight / itemHeight)
      return countItemsPerViewPort * itemHeight
    },

    calculateItemHeight () {
      return this.itemHeight + 2 * (this.itemSpace || 0)
    },

    getAvailableHeight () {
      return this.scrollContainer.clientHeight
    },

    calculateTopViewPortHeight () {
      return this.topViewPortMultiplier ? this.viewPortHeight * +this.topViewPortMultiplier : this.viewPortHeight
    },

    calculateBottomViewPortHeight () {
      return this.bottomViewPortMultiplier ? this.viewPortHeight * +this.bottomViewPortMultiplier : this.viewPortHeight
    },

    normalizeHeight (height) {
      const itemHeight = this.calculateItemHeight()
      const itemsPerHeight = Math.round(height / itemHeight)
      return itemsPerHeight * itemHeight
    },

    updateNegativePadding () {
      this.calculateNegativePadding()
    },

    calculateNegativePadding () {
      const totalHeight = this.viewPortHeight + this.topViewPortHeight
      const availableHeight = this.calculateViewHeight()
      const remains = totalHeight - availableHeight
      this.negativePadding = remains / 2
    },

    preRenderAsync () {
      this.reRenderOnScrollAsync(true)
    },

    reRenderOnScrollAsync (start) {
      setTimeout(() => {
        const scrollTop = this.scrollContainer.scrollTop

        const topViewPortHeight = this.normalizeHeight(
          this.calculateTopViewPort()
        )
        this.topViewPortHeight = topViewPortHeight
        const middleViewPortHeight = this.viewPortHeight
        const bottomViewPortHeight = this.normalizeHeight(
          this.calculateBottomViewPort()
        )
        const viewPortsHeight = topViewPortHeight + middleViewPortHeight + bottomViewPortHeight
        
        const itemHeight = this.calculateItemHeight()
        const itemsForTopViewPort = topViewPortHeight / itemHeight
        const itemsForMiddleViewPort = middleViewPortHeight / itemHeight
        const itemsForBottomViewPort = bottomViewPortHeight / itemHeight

        let currentViewPortIndex = start ? 0 : Math.floor(scrollTop / viewPortsHeight)
        currentViewPortIndex = isFinite(currentViewPortIndex) ? currentViewPortIndex : 0
        const currentScrollTop = currentViewPortIndex * this.viewPortHeight
        let fromIndex = currentViewPortIndex * (this.itemsPerViewPort + itemsForTopViewPort + itemsForMiddleViewPort + itemsForBottomViewPort)

        let totalItemsCount = viewPortsHeight / itemHeight

        if (this.multicast) {
          // const itemsForTopViewPort = topViewPortHeight / itemHeight
          const topViewPort = new ViewPort()
          topViewPort.items = this.getItems(fromIndex, itemsForTopViewPort)
          topViewPort.scrollTop = start ? currentScrollTop - topViewPortHeight : currentScrollTop
          topViewPort.height = topViewPortHeight
          topViewPort.itemsFromIndex = fromIndex
          this.topViewPort = topViewPort
          fromIndex += itemsForTopViewPort
          totalItemsCount = totalItemsCount - itemsForTopViewPort
          
          // const itemsForMiddleViewPort = middleViewPortHeight / itemHeight
          const middleViewPort = new ViewPort()
          middleViewPort.items = this.getItems(fromIndex, itemsForMiddleViewPort)
          middleViewPort.scrollTop = start ? 0 : currentScrollTop + topViewPortHeight
          middleViewPort.height = middleViewPortHeight
          middleViewPort.itemsFromIndex = fromIndex
          this.middleViewPort = middleViewPort
          fromIndex += itemsForMiddleViewPort
          totalItemsCount - totalItemsCount - itemsForMiddleViewPort
          
          const remainsItems = totalItemsCount
          const bottomViewPort = new ViewPort()
          bottomViewPort.items = this.getItems(fromIndex, totalItemsCount)
          bottomViewPort.scrollTop = this.viewHeight
          bottomViewPort.height = bottomViewPortHeight
          bottomViewPort.itemsFromIndex = fromIndex
          this.bottomViewPort = bottomViewPort
        } else {
          // bottom view port
        }
      })
    },

    moveUpAsync (scrollTop) {
      setTimeout(() => {
        const viewPort = this.topViewPort
        const itemHeight = this.calculateItemHeight()
        const gap = viewPort.scrollTop - scrollTop
        const itemsForRender = Math.floor(gap / itemHeight)
        if (itemsForRender > 0) {
          const fromIndex = viewPort.itemsFromIndex - itemsForRender
          const items = this.getItems(fromIndex, viewPort.itemsCount + itemsForRender)
          const topViewPort = new ViewPort()
          topViewPort.items = items
          topViewPort.scrollTop = viewPort.scrollTop
          topViewPort.height = viewPort.height + itemHeight * itemsForRender
          topViewPort.itemsFromIndex = fromIndex
          this.topViewPort = topViewPort
        }
      })
    },

    moveDownAsync (scrollTop) {
      setTimeout(() => {
        const viewPort = this.bottomViewPort
        const itemHeight = this.calculateItemHeight()
        const gap = scrollTop - viewPort.scrollTop
        const itemsForRender = gap / itemHeight
        if (itemsForRender > 0) {
          const fromIndex = viewPort.itemsFromIndex
          const items = this.getItems(fromIndex, viewPort.itemsCount + itemsForRender)
          const bottomViewPort = new ViewPort()
          bottomViewPort.scrollTop = viewPort.scrollTop
          bottomViewPort.height = viewPort.height + itemHeight * itemsForRender
          bottomViewPort.items = items
          bottomViewPort.itemsFromIndex = fromIndex
          this.bottomViewPort = bottomViewPort
        }
      })
    },

    calculateBoundaries () {
      const scrollTop = this.scrollContainer.scrollTop
      // calculate top boundary
      this.topBoundary = scrollTop - this.viewPortHeight * SCROLL_BOUNDARY_MULTIPLIER

      // calculate bottom boundary
      this.bottomBoundary = scrollTop + this.viewPortHeight * SCROLL_BOUNDARY_MULTIPLIER

      this.scrollTop = scrollTop
    },

    onScroll () {
      const capturedScrollTop = this.scrollContainer.scrollTop
      setTimeout(() => {
        const latestScrollTop = this.scrollContainer.scrollTop
        if (capturedScrollTop !== latestScrollTop) {
          return
        }

        requestAnimationFrame(
          this.handleScroll(this.scrollContainer.scrollTop)
        )
      }, DELAY_AFTER_SCROLL)

      this.calculateBoundaries()
    },

    handleScroll (scrollTop) {
      if (scrollTop < this.topViewPort.scrollTop || scrollTop > this.bottomViewPort.scrollTop) {
        this.reRenderOnScrollAsync()
      } else if (scrollTop < this.topBoundary) {
        this.moveUpAsync(scrollTop)
      } else if ((scrollTop + this.viewHeight) > this.bottomBoundary) {
        this.moveDownAsync(scrollTop)
      }
    },

    /**
     * we can get items from simple array or from iterator is object has property named as @@SymbolIterator
     */
    getItems (fromIndex, countItems) {
      let items = []
      if (this.items[Symbol.iterator]) {
        const iterator = this.items[Symbol.iterator]()
        const item = iterator.next()

        let count = 0
        while (!item.done) {
          count++
          if (count < fromIndex) {
            continue
          }

          items.push(item.value)

          if (items.length >= countItems) {
            break
          }
        }

        return items
      }

      return this.items.slice(fromIndex, countItems)
    }
  },
  created () {
    this.calculateViewHeight()
    this.calculateParams()
    this.preRenderAsync()
    this.calculateNegativePadding()
  }
}
</script>

<style>
  .scroll-container {
    overflow: hidden;
    overflow-y: auto;
  }

  .scroll-height {
    width: 1px;
    opacity: 0;
  }
</style>
