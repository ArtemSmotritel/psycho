import { useState } from 'react'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'

interface ImpressionFormProps {
    onSubmit: (text: string) => Promise<void>
    isSubmitting: boolean
}

export function ImpressionForm({ onSubmit, isSubmitting }: ImpressionFormProps) {
    const [text, setText] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(text)
        setText('')
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your impression..."
                disabled={isSubmitting}
            />
            <Button type="submit" disabled={isSubmitting}>
                Submit
            </Button>
        </form>
    )
}
