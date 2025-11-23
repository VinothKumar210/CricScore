import * as React from "react"

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  open?: boolean
}

interface State {
  toasts: ToasterToast[]
}

const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

export const reducer = (state: State, action: any): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts] }
    default:
      return state
  }
}

function dispatch(action: any) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])
  return { ...state }
}

export { useToast }

// previous code from commit 1 remains

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

function toast({ ...props }: Omit<ToasterToast, "id">) {
  const id = genId()
  dispatch({ type: "ADD_TOAST", toast: { ...props, id, open: true } })
  return { id }
}

export { useToast, toast }
