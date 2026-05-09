import { EmptyMessage } from './common/EmptyMessage'

interface WhiteboardSnapshotProps {
    url?: string | null
}

export function WhiteboardSnapshot({ url }: WhiteboardSnapshotProps) {
    return (
        <div className="mt-6 space-y-2">
            <h3 className="text-lg font-semibold">Whiteboard Snapshot</h3>
            {url ? (
                <img src={url} alt="Whiteboard snapshot" className="w-full rounded-md border" />
            ) : (
                <EmptyMessage title="No whiteboard snapshot available." />
            )}
        </div>
    )
}
