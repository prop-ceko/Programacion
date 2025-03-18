import { createRef, useEffect, useMemo, useState } from 'react';
import './TimeSlider.css'

interface TimeSliderProps {
    value: number[]
    min: number
    max: number
    step?: number
    disabledIntervals?: number[][]
    collideWithEnds?: boolean
    onChange: (value: number[]) => void
}

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max)
}

function formatTime(minutes: number) {
    const hour = Math.round(minutes / 60)
    const minute = Math.round(minutes % 60)

    const hourStr = hour.toString().padStart(2, '0')
    const minuteStr = minute.toString().padStart(2, '0');
    return hourStr + ':' + minuteStr;
  }

function getDivisors(n) {
    const divisors = [ 1, n ];
    const half = Math.floor(Math.sqrt(n));
    for (let i = 2; i < half; i++) {
      if (n % i === 0) {
        divisors.push(i);
        divisors.push(n / i);
      }
    }
    return divisors.toSorted((a, b) => a - b);
  }


export function TimeSlider({ value, min, max, step, collideWithEnds, disabledIntervals, onChange }: TimeSliderProps) {
    useEffect(() => {
        if (value.length !== 2) {
            throw new Error('TimeSlider value must have exactly 2 elements')
        }

        const sorted = value.toSorted((a, b) => a - b)
        if (sorted.some((v, i) => v != value[i])){
            onChange(sorted)
        }
    }, [value])

    const range = max - min
    const normalizedValue = value.map(v => clamp((v - min) / range, 0, 1))

    const [clickedHandle, setClickedHandle] = useState(-1)
    const [startX, setStartX] = useState(0)
    const [width, setWidth] = useState(0)

    const first = normalizedValue[0] ?? 0
    const second = normalizedValue[1] ?? 0

    const getGoodLookingTicks = () => {
        const divisors = getDivisors(range)
        const stepDivisors = divisors.filter(d => d % step === 0).map(d => range / d)
        // TODO: Determine this value dynamically
        const desiredTicks = 6;

        const next = stepDivisors.findLast(d => d >= desiredTicks)
        const previous = stepDivisors.find(d => d <= desiredTicks)

        const distanceToNext = next - desiredTicks
        const distanceToPrevious = desiredTicks - previous

        const nearest = distanceToNext < distanceToPrevious ? next : previous
        return nearest
    }

    const ticks = useMemo(getGoodLookingTicks, [width, range, step])

    const sliderRef = createRef<HTMLDivElement>()

    const makeLabels = () => {
        const tickSepartion = range / (ticks - 1)
        const labels = []
        for (let i = 0; i < ticks; i++) {
            labels.push(min + i * tickSepartion)
        }
        return labels
    }

    const labels = makeLabels().map((time, index, array) => {
        return (
            <span
                key={index}
                className='label'
                style={{ left: index / (array.length - 1) * 100 + '%'}}
            >
                {formatTime(time)}
            </span>
        )
    })

    // Event handlers
    const getDownHandler = (index: number) => {
        return (e: MouseEvent) => {
            e.preventDefault()
            setStartX(e.clientX)
            setClickedHandle(index)
        }
    }

    const up = (e) => {
        e.preventDefault()
        setClickedHandle(-1)
    }

    const getMoveHandler = (index: number) => {
        return (e: MouseEvent) => {
            e.preventDefault()

            const increment = (e.clientX - startX) / width * range;
            const stepIncrement = Math.ceil(increment / step) * step;

            if (index == -2){
                // Move the whole range coliding

                // First convert normalized value to unshifted range value and add the increment
                let incremented = normalizedValue.map(v => v * range + stepIncrement)

                // Avoids the range to shrink
                if (collideWithEnds) {
                    const leftmostHandle = incremented[0];
                    const rightmostHandle = incremented[1];
                    if (leftmostHandle < 0) {
                        incremented = incremented.map(v => v - leftmostHandle)
                    }
                    else if (rightmostHandle > range) {
                        incremented = incremented.map(v => v - rightmostHandle + range)
                    }
                }

                // Then clamp the values to the range and convert back to shifted range value
                onChange(incremented.map(v => clamp(v, 0, range) + min))
            }
            else {
                const incremented = normalizedValue[index] * range + stepIncrement
                const inRange = clamp(incremented, 0, range)
                onChange(value.with(index, inRange + min))
            }
        }
    }

    // Handle mouse events
    useEffect(() => {
        if (clickedHandle !== -1) {
            const move = getMoveHandler(clickedHandle)
            document.addEventListener('mousemove', move)
            document.addEventListener('mouseup', up)
            return () => {
                document.removeEventListener('mousemove', move)
                document.removeEventListener('mouseup', up)
            }
        }
    }, [clickedHandle])

    // Update width
    useEffect(() => {
        const rect = sliderRef.current.getBoundingClientRect()
        setWidth(rect.width)
    }, [sliderRef])

    const disabledIntervalsElements = disabledIntervals?.map(interval => {
        const start = clamp((interval[0] - min) / range, 0, 1)
        const end = clamp((interval[1] - min) / range, 0, 1)
        return (
            <div
                key={interval[0]}
                className='unavailable'
                style={{ left: start * 100 + '%', width: (end - start) * 100 + '%' }}
            >
            </div>
        )
    })

    return (
        <div id='slider-container'>
            <div id='slider' ref={sliderRef}>
                {disabledIntervalsElements}
                <div
                    id='selected'
                    style={{ left: first * 100 + '%', width: (second - first) * 100 + '%' }}
                    onMouseDown={getDownHandler(-2)}
                >
                </div>
                <div
                    className='handle' style={{ left: first * 100 + '%' }}
                    onMouseDown={getDownHandler(0)}
                >
                </div>
                <div
                    className='handle' style={{ left: second * 100 + '%' }}
                    onMouseDown={getDownHandler(1)}
                >
                </div>
            </div>
            <div className='labels'>
                {labels}
            </div>
        </div>
    )
}
