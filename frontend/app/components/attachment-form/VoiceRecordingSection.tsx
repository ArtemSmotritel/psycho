import { Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyMessage } from '../EmptyMessage'
import { useObjectUrl } from '~/hooks/useObjectUrl'
import { MAX_VOICE_FILES, isAttachmentFile, type AttachmentFileInput } from './schema'

interface VoiceRecordingSectionProps {
    mode: 'create' | 'edit'
    status: string
    voiceFiles: AttachmentFileInput[]
    errorMessage?: string
    onStartRecording: () => void
    onStopRecording: () => void
    onToggleFileRemoval: (file: AttachmentFileInput) => void
    isFileMarkedForRemoval: (file: AttachmentFileInput) => boolean
}

export function VoiceRecordingSection({
    mode,
    status,
    voiceFiles,
    errorMessage,
    onStartRecording,
    onStopRecording,
    onToggleFileRemoval,
    isFileMarkedForRemoval,
}: VoiceRecordingSectionProps) {
    return (
        <>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant={status === 'recording' ? 'destructive' : 'outline'}
                        className="flex items-center gap-2"
                        onClick={status === 'recording' ? onStopRecording : onStartRecording}
                        disabled={
                            mode === 'edit' ||
                            (voiceFiles.length >= MAX_VOICE_FILES && status !== 'recording')
                        }
                    >
                        {status === 'recording' ? (
                            <>
                                <Square className="h-4 w-4" />
                                Stop Recording
                            </>
                        ) : (
                            <>
                                <Mic className="h-4 w-4" />
                                Start Recording
                            </>
                        )}
                    </Button>
                    {status === 'recording' && (
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-sm text-muted-foreground">Recording...</span>
                        </div>
                    )}
                </div>
                <span className="text-sm text-muted-foreground">
                    {voiceFiles.length}/{MAX_VOICE_FILES} recordings
                </span>
            </div>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            {voiceFiles.length > 0 ? (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Voice Recordings</h4>
                    <div className="space-y-2">
                        {voiceFiles.map((file, index) => (
                            <VoiceRecordingItem
                                key={index}
                                file={file}
                                markedForRemoval={isFileMarkedForRemoval(file)}
                                onToggleFileRemoval={onToggleFileRemoval}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <EmptyMessage
                    title="No Voice Recordings"
                    description="Start recording or upload voice files to add them here."
                    className="py-4"
                />
            )}
        </>
    )
}

interface VoiceRecordingItemProps {
    file: AttachmentFileInput
    markedForRemoval: boolean
    onToggleFileRemoval: (file: AttachmentFileInput) => void
}

function VoiceRecordingItem({
    file,
    markedForRemoval,
    onToggleFileRemoval,
}: VoiceRecordingItemProps) {
    const src = useObjectUrl(isAttachmentFile(file) ? file.url : file)
    return (
        <div className={`flex items-center gap-2 ${markedForRemoval ? 'opacity-40' : ''}`}>
            <audio controls src={src} />
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleFileRemoval(file)}
            >
                {markedForRemoval ? 'Restore' : 'Remove'}
            </Button>
        </div>
    )
}
