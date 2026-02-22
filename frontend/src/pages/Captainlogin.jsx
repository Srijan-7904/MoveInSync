import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { CaptainDataContext } from '../context/CapatainContext'
import { requestAndRegisterFcmToken } from '../services/fcm.service'
import VoiceAssistant from '../components/VoiceAssistant'
import AiVoiceButton from '../components/AiVoiceButton'

const Captainlogin = () => {

  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')

  const { captain, setCaptain } = React.useContext(CaptainDataContext)
  const navigate = useNavigate()



  const submitHandler = async (e) => {
    e.preventDefault();
    const captain = {
      email: email,
      password
    }

    const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/login`, captain)

    if (response.status === 200) {
      const data = response.data

      setCaptain(data.captain)
      localStorage.setItem('captain-token', data.token)
      localStorage.setItem('token', data.token)
      requestAndRegisterFcmToken({ role: 'captain', authToken: data.token })
      navigate('/captain-home')

    }

    setEmail('')
    setPassword('')
  }
  return (
    <div className='min-h-screen bg-slate-100 flex items-center justify-center p-6'>
      {/* Voice Assistant Integration */}
      <VoiceAssistant
        onEmailFill={(value) => setEmail(value)}
        onPasswordFill={(value) => setPassword(value)}
        onConfirmAction={(e) => submitHandler({ preventDefault: () => {} })}
      />
      <AiVoiceButton />

      <div className='w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2'>
        <div className='hidden md:flex relative overflow-hidden text-white p-10 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700'>
          <div className='relative z-10'>
            <h2 className='text-4xl font-bold'>Captain Console</h2>
            <p className='mt-4 text-slate-200'>Drive corporate routes, manage assigned rides, and keep enterprise travel on time.</p>
          </div>
          <div className='relative z-10 h-[320px]'>
            <img className='absolute top-0 left-0 w-[78%] h-[220px] object-cover rounded-2xl shadow-2xl animate-pulse' src='https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=2070&auto=format&fit=crop' alt='' />
            <img className='absolute bottom-0 right-0 w-[76%] h-[220px] object-cover rounded-2xl shadow-2xl border border-white/20' src='https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1974&auto=format&fit=crop' alt='' />
          </div>
        </div>
        <div className='p-8 md:p-10'>
          <h3 className='text-3xl font-bold mb-1'>Captain sign in</h3>
          <p className='text-gray-500 mb-6'>Access your captain dashboard</p>

          <form onSubmit={(e) => {
            submitHandler(e)
          }}>
            <h3 className='text-lg font-medium mb-2'>What's your email</h3>
            <input
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
              className='bg-[#eeeeee] mb-6 rounded-lg px-4 py-3 border w-full text-lg placeholder:text-base'
              type="email"
              placeholder='email@example.com'
            />

            <h3 className='text-lg font-medium mb-2'>Enter Password</h3>

            <input
              className='bg-[#eeeeee] mb-6 rounded-lg px-4 py-3 border w-full text-lg placeholder:text-base'
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              required type="password"
              placeholder='password'
            />

            <button
              className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-3 w-full text-lg placeholder:text-base'
            >Login</button>

          </form>
          <p className='text-center mb-4'>Join a fleet? <Link to='/captain-signup' className='text-blue-600 font-medium'>Register as a Captain</Link></p>
          <Link
            to='/login'
            className='bg-[#d5622d] flex items-center justify-center text-white font-semibold rounded-lg px-4 py-3 w-full text-lg placeholder:text-base'
          >Sign in as User</Link>
        </div>
      </div>
    </div>
  )
}

export default Captainlogin