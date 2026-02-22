import React, { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { UserDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { requestAndRegisterFcmToken } from '../services/fcm.service'
import VoiceAssistant from '../components/VoiceAssistant'
import AiVoiceButton from '../components/AiVoiceButton'

const UserLogin = () => {
  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')
  const [ userData, setUserData ] = useState({})
  const [ error, setError ] = useState('')

  const { user, setUser } = useContext(UserDataContext)
  const navigate = useNavigate()



  const submitHandler = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    const userData = {
      email: email,
      password: password
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/users/login`, userData)

      if (response.status === 200) {
        const data = response.data
        setUser(data.user)
        localStorage.removeItem('captain-token')
        localStorage.setItem('token', data.token)
        requestAndRegisterFcmToken({ role: 'user', authToken: data.token })
        navigate('/home')
      }

      setEmail('')
      setPassword('')
    } catch (err) {
      // Handle error responses
      if (err.response) {
        // Server responded with a status code outside 2xx range
        setError(err.response.data.message || 'Login failed. Please try again.')
      } else if (err.request) {
        // Request was made but no response received
        setError('No response from server. Please check if the server is running.')
      } else {
        // Something else happened
        setError('An error occurred. Please try again.')
      }
      console.error('Login error:', err)
    }
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
            <h2 className='text-4xl font-bold'>MoveInSync</h2>
            <p className='mt-4 text-slate-200'>Corporate taxi operations for teams, clients, and business travel—always in sync.</p>
          </div>
          <div className='relative z-10 h-[320px]'>
            <img className='absolute top-0 left-0 w-[78%] h-[220px] object-cover rounded-2xl shadow-2xl animate-pulse' src='https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop' alt='' />
            <img className='absolute bottom-0 right-0 w-[76%] h-[220px] object-cover rounded-2xl shadow-2xl border border-white/20' src='https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1974&auto=format&fit=crop' alt='' />
          </div>
        </div>
        <div className='p-8 md:p-10'>
          <h3 className='text-3xl font-bold mb-1'>Sign in</h3>
          <p className='text-gray-500 mb-6'>Welcome back</p>

          <form onSubmit={(e) => {
            submitHandler(e)
          }}>
            {error && (
              <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
                {error}
              </div>
            )}
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

          <p className='text-center mb-4'>New here? <Link to='/signup' className='text-blue-600 font-medium'>Create new Account</Link></p>
          <Link
            to='/captain-login'
            className='bg-[#10b461] flex items-center justify-center text-white font-semibold rounded-lg px-4 py-3 w-full text-lg placeholder:text-base'
          >Sign in as Captain</Link>
        </div>
      </div>
    </div>
  )
}

export default UserLogin