class ViewPort {
  constructor () {
    this.scrollTop = 0
    this.height = 0
    this.items = []
    this.itemsFromIndex = 0
  }
  
  get itemsCount () {
    const items = this.items || []
    return items.length
  }

  get scrollBotom () {
    return (this.scrollTop || 0) + (this.height || 0)
  }
}

export default ViewPort
