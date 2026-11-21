// Same limits as Excalidraw's own image tool. The package does not export them, so they are
// copied here: it shrinks an image to at most 1440 px on the longer side, then rejects a file
// above 4 MiB. An image that follows this rule also fits the whiteboard server limit
// (`MAX_FILE_BYTES` in `backend/src/features/whiteboard/limits.ts`) with room to spare.
export const MAX_IMAGE_DIMENSION = 1440
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const JPEG_QUALITY = 0.85

const SVG_TYPE = 'image/svg+xml'
const JPEG_TYPE = 'image/jpeg'
const PNG_TYPE = 'image/png'

export class ImageTooLargeError extends Error {
    constructor() {
        super('The image is too large for the whiteboard, also after shrinking it.')
        this.name = 'ImageTooLargeError'
    }
}

export type ImagePlan =
    | { action: 'keep' }
    | { action: 'reject' }
    | { action: 'resize'; width: number; height: number; type: typeof JPEG_TYPE | typeof PNG_TYPE }

/**
 * Decides what to do with an image before it goes onto the whiteboard.
 * An SVG is never redrawn. A raster image that already fits keeps its original bytes, which
 * keeps its quality and the animation of a GIF. Any other raster image is redrawn at
 * `MAX_IMAGE_DIMENSION` or less. A JPEG stays a JPEG, and every other type becomes a PNG.
 */
export function planImage(image: {
    type: string
    width: number
    height: number
    bytes: number
}): ImagePlan {
    if (image.type === SVG_TYPE) {
        return image.bytes <= MAX_IMAGE_BYTES ? { action: 'keep' } : { action: 'reject' }
    }

    const longerSide = Math.max(image.width, image.height)
    if (longerSide <= MAX_IMAGE_DIMENSION && image.bytes <= MAX_IMAGE_BYTES) {
        return { action: 'keep' }
    }

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / longerSide)
    return {
        action: 'resize',
        width: Math.max(1, Math.round(image.width * scale)),
        height: Math.max(1, Math.round(image.height * scale)),
        type: image.type === JPEG_TYPE ? JPEG_TYPE : PNG_TYPE,
    }
}

export interface PreparedImage {
    blob: Blob
    width: number
    height: number
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('The image could not be decoded.'))
        }
        img.src = url
    })
}

function redraw(img: HTMLImageElement, width: number, height: number, type: string): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.reject(new Error('The canvas is not available.'))
    // A JPEG has no transparency. Transparent pixels would turn black.
    if (type === JPEG_TYPE) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(img, 0, 0, width, height)
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (result) =>
                result ? resolve(result) : reject(new Error('The image was not encoded.')),
            type,
            JPEG_QUALITY,
        )
    })
}

/**
 * Returns an image that follows the whiteboard rule, redrawn if it needs to be.
 * Throws `ImageTooLargeError` if the image is still above `MAX_IMAGE_BYTES`.
 */
export async function prepareImageForWhiteboard(blob: Blob): Promise<PreparedImage> {
    const img = await loadImage(blob)
    const width = img.naturalWidth
    const height = img.naturalHeight

    const plan = planImage({ type: blob.type, width, height, bytes: blob.size })
    if (plan.action === 'reject') throw new ImageTooLargeError()
    if (plan.action === 'keep') return { blob, width, height }

    const redrawn = await redraw(img, plan.width, plan.height, plan.type)
    if (redrawn.size > MAX_IMAGE_BYTES) throw new ImageTooLargeError()
    return { blob: redrawn, width: plan.width, height: plan.height }
}
