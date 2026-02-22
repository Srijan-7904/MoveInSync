import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'

const Start = () => {
  const [ typedText, setTypedText ] = useState('')
  const cursorRef = useRef(null)

  useEffect(() => {
    const lines = [
      'Book rides instantly.',
      'Track captains live on map.',
      'Move safely, every day.'
    ]

    let lineIndex = 0
    let charIndex = 0
    let isDeleting = false
    let typingCall

    const typeLoop = () => {
      const currentLine = lines[ lineIndex ]

      if (!isDeleting) {
        charIndex += 1
        setTypedText(currentLine.slice(0, charIndex))

        if (charIndex === currentLine.length) {
          isDeleting = true
          typingCall = gsap.delayedCall(1.1, typeLoop)
          return
        }

        typingCall = gsap.delayedCall(0.05, typeLoop)
        return
      }

      charIndex -= 1
      setTypedText(currentLine.slice(0, charIndex))

      if (charIndex === 0) {
        isDeleting = false
        lineIndex = (lineIndex + 1) % lines.length
        typingCall = gsap.delayedCall(0.35, typeLoop)
        return
      }

      typingCall = gsap.delayedCall(0.03, typeLoop)
    }

    typeLoop()

    const cursorTween = gsap.to(cursorRef.current, {
      opacity: 0,
      repeat: -1,
      yoyo: true,
      duration: 0.6,
      ease: 'power1.inOut'
    })

    return () => {
      if (typingCall) typingCall.kill()
      cursorTween.kill()
    }
  }, [])

  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center p-6'>
      <div className='w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2'>
        <div className='bg-cover bg-center min-h-[320px] md:min-h-[620px] bg-[url(https://images.unsplash.com/photo-1619059558110-c45be64b73ae?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)]'></div>
        <div className='p-8 md:p-12 flex flex-col justify-center'>
          <h1 className='text-4xl md:text-5xl font-bold'>MoveInSync</h1>
          <p className='text-gray-600 mt-4 text-lg'>MoveInSync connects passengers and captains in real time with quick booking, live tracking, and smooth trip management.</p>

          <div className='mt-6 min-h-[42px] flex items-center'>
            <p className='text-2xl md:text-3xl font-semibold text-black'>
              {typedText}
              <span ref={cursorRef} className='ml-1'>|</span>
            </p>
          </div>

          <Link to='/login' className='flex items-center justify-center w-full bg-black text-white py-3 rounded-lg mt-8 text-lg font-medium'>Continue</Link>
        </div>
      </div>
    </div>
  )
}

export default Start