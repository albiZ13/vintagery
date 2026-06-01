'use client'

import { useRef, useState } from 'react'

interface Props {
  length?: number
  onComplete: (code: string) => void
  disabled?: boolean
  error?: boolean
}

export default function OtpInput({ length = 6, onComplete, disabled, error }: Props) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...values]
    next[index] = digit
    setValues(next)

    if (digit && index < length - 1) inputs.current[index + 1]?.focus()

    const code = next.join('')
    if (code.length === length && !next.includes('')) onComplete(code)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (values[index]) {
        const next = [...values]; next[index] = ''; setValues(next)
      } else if (index > 0) {
        inputs.current[index - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft'  && index > 0)          inputs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < length - 1) inputs.current[index + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    const next = Array(length).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setValues(next)
    const focusIdx = Math.min(pasted.length, length - 1)
    inputs.current[focusIdx]?.focus()
    if (pasted.length === length) onComplete(pasted)
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {Array(length).fill(null).map((_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={values[i]}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          onPaste={handlePaste}
          className={`w-11 h-14 text-center text-2xl font-serif font-bold rounded-xl border-2 text-espresso bg-white
            focus:outline-none transition-all
            ${error
              ? 'border-red-400 bg-red-50'
              : values[i]
                ? 'border-sienna bg-sienna/5'
                : 'border-border focus:border-sienna'
            }
            disabled:opacity-40`}
        />
      ))}
    </div>
  )
}
