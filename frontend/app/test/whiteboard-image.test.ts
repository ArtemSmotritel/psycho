import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION, planImage } from '~/utils/whiteboard-image'

const MB = 1024 * 1024

describe('planImage', () => {
    it('keeps an image that fits, with its original bytes', () => {
        expect(planImage({ type: 'image/jpeg', width: 1000, height: 800, bytes: MB })).toEqual({
            action: 'keep',
        })
    })

    it('keeps an image that is exactly at both limits', () => {
        expect(
            planImage({
                type: 'image/png',
                width: MAX_IMAGE_DIMENSION,
                height: 100,
                bytes: MAX_IMAGE_BYTES,
            }),
        ).toEqual({ action: 'keep' })
    })

    it('shrinks a wide image to the dimension limit and keeps its aspect ratio', () => {
        expect(planImage({ type: 'image/jpeg', width: 3000, height: 2000, bytes: 2 * MB })).toEqual(
            {
                action: 'resize',
                width: 1440,
                height: 960,
                type: 'image/jpeg',
            },
        )
    })

    it('shrinks a tall image by its longer side', () => {
        expect(planImage({ type: 'image/jpeg', width: 2000, height: 4000, bytes: MB })).toEqual({
            action: 'resize',
            width: 720,
            height: 1440,
            type: 'image/jpeg',
        })
    })

    it('never makes a side smaller than one pixel', () => {
        const plan = planImage({ type: 'image/png', width: 10000, height: 1, bytes: MB })

        expect(plan).toEqual({ action: 'resize', width: 1440, height: 1, type: 'image/png' })
    })

    it.each(['image/png', 'image/webp', 'image/gif'])('redraws %s as a PNG', (type) => {
        const plan = planImage({ type, width: 3000, height: 3000, bytes: MB })

        expect(plan).toMatchObject({ action: 'resize', type: 'image/png' })
    })

    it('redraws a small image that is above the byte limit, at the same size', () => {
        expect(planImage({ type: 'image/png', width: 1000, height: 1000, bytes: 5 * MB })).toEqual({
            action: 'resize',
            width: 1000,
            height: 1000,
            type: 'image/png',
        })
    })

    it('keeps an SVG that is within the byte limit, whatever its dimensions', () => {
        expect(planImage({ type: 'image/svg+xml', width: 9000, height: 9000, bytes: MB })).toEqual({
            action: 'keep',
        })
    })

    it('rejects an SVG above the byte limit, because it cannot be redrawn', () => {
        expect(
            planImage({ type: 'image/svg+xml', width: 100, height: 100, bytes: 5 * MB }),
        ).toEqual({ action: 'reject' })
    })
})
