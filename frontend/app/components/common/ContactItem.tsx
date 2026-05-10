import { toast } from 'sonner'
import { Link } from 'react-router'
import { Copy } from 'lucide-react'
import { Button } from '~/components/ui/button'

type ContactType = 'telegram' | 'instagram' | 'email' | 'phone'

interface ContactItemProps {
    icon: React.ReactNode
    label: string
    value?: string | null
    type?: ContactType
    onCopy?: () => void
}

function buildLink(type: ContactType | undefined, value: string): string | null {
    switch (type) {
        case 'telegram': {
            const username = value.startsWith('@') ? value.slice(1) : value
            return `https://t.me/${username}`
        }
        case 'instagram': {
            const username = value.startsWith('@') ? value.slice(1) : value
            return `https://instagram.com/${username}`
        }
        case 'email':
            return `mailto:${value}`
        case 'phone':
            return `tel:${value.replace(/\s+/g, '')}`
        default:
            return null
    }
}

export function ContactItem({ icon, label, value, type, onCopy }: ContactItemProps) {
    const displayValue = value || '-'
    const link = value ? buildLink(type, value) : null
    const isExternal = type === 'telegram' || type === 'instagram'

    const handleCopy = () => {
        if (onCopy) {
            onCopy()
            return
        }
        if (!value) return
        navigator.clipboard.writeText(value)
        toast.success(`${label} copied to clipboard.`)
    }

    return (
        <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center space-x-2">
                {icon}
                <span className="font-medium">{label}:</span>
            </div>
            <div className="flex items-center space-x-1">
                {link ? (
                    <Link
                        to={link}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="hover:underline"
                    >
                        {displayValue}
                    </Link>
                ) : (
                    <span>{displayValue}</span>
                )}
                {value && (
                    <Button variant="ghost" size="icon" onClick={handleCopy}>
                        <Copy className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
