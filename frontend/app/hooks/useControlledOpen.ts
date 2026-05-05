import { useState } from 'react'

export function useControlledOpen(
    controlledOpen: boolean | undefined,
    onOpenChange?: (next: boolean) => void,
): [boolean, (next: boolean) => void] {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = (next: boolean) => {
        if (!isControlled) setInternalOpen(next)
        onOpenChange?.(next)
    }
    return [open, setOpen]
}
