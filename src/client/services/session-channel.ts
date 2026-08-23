export class SessionChannel<T> {
  private pending: T | undefined
  private listeners = new Set<(value: T) => void>()

  publish(value: T) {
    if (this.listeners.size) {
      for (const listener of this.listeners) listener(value)
    } else {
      this.pending = value
    }
  }

  subscribe(listener: (value: T) => void) {
    this.listeners.add(listener)
    if (this.pending !== undefined) {
      const value = this.pending
      this.pending = undefined
      listener(value)
    }
    return () => {
      this.listeners.delete(listener)
    }
  }

  clear() {
    this.pending = undefined
  }
}
