import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CaptainDataContext } from '../context/CapatainContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { requestAndRegisterFcmToken } from '../services/fcm.service'
import VoiceAssistant from '../components/VoiceAssistant'
import AiVoiceButton from '../components/AiVoiceButton'

const CaptainSignup = () => {

  const navigate = useNavigate()

  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')
  const [ firstName, setFirstName ] = useState('')
  const [ lastName, setLastName ] = useState('')
  const [ phoneNumber, setPhoneNumber ] = useState('')

  const [ vehicleColor, setVehicleColor ] = useState('')
  const [ vehiclePlate, setVehiclePlate ] = useState('')
  const [ vehicleCapacity, setVehicleCapacity ] = useState('')
  const [ vehicleType, setVehicleType ] = useState('')


  const { captain, setCaptain } = React.useContext(CaptainDataContext)


  const submitHandler = async (e) => {
    e.preventDefault()
    const captainData = {
      fullname: {
        firstname: firstName,
        lastname: lastName
      },
      email: email,
      phoneNumber,
      password: password,
      vehicle: {
        color: vehicleColor,
        plate: vehiclePlate,
        capacity: vehicleCapacity,
        vehicleType: vehicleType
      }
    }

    const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/register`, captainData)

    if (response.status === 201) {
      const data = response.data
      setCaptain(data.captain)
      localStorage.setItem('captain-token', data.token)
      localStorage.setItem('token', data.token)
      requestAndRegisterFcmToken({ role: 'captain', authToken: data.token })
      navigate('/captain-home')
    }

    setEmail('')
    setFirstName('')
    setLastName('')
    setPhoneNumber('')
    setPassword('')
    setVehicleColor('')
    setVehiclePlate('')
    setVehicleCapacity('')
    setVehicleType('')

  }
  return (
    <div className='min-h-screen bg-slate-100 flex items-center justify-center p-6'>
      {/* Voice Assistant Integration */}
      <VoiceAssistant
        onFirstNameFill={(value) => setFirstName(value)}
        onLastNameFill={(value) => setLastName(value)}
        onEmailFill={(value) => setEmail(value)}
        onPhoneFill={(value) => setPhoneNumber(value)}
        onPasswordFill={(value) => setPassword(value)}
        onConfirmAction={(e) => submitHandler({ preventDefault: () => {} })}
      />
      <AiVoiceButton />

      <div className='w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2'>
        <div className='hidden md:flex relative overflow-hidden text-white p-10 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700'>
          <div className='relative z-10'>
            <h2 className='text-4xl font-bold'>Captain Onboarding</h2>
            <p className='mt-4 text-slate-200'>Join the corporate taxi network and deliver smooth office commute experiences.</p>
          </div>
          <div className='relative z-10 h-[320px]'>
            <img className='absolute top-0 left-0 w-[78%] h-[220px] object-cover rounded-2xl shadow-2xl animate-pulse' src='https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=2070&auto=format&fit=crop' alt='' />
            <img className='absolute bottom-0 right-0 w-[76%] h-[220px] object-cover rounded-2xl shadow-2xl border border-white/20' src='https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1974&auto=format&fit=crop' alt='' />
          </div>
        </div>
        <div className='py-8 px-8 md:px-10 max-h-[90vh] overflow-y-auto'>
          <h3 className='text-3xl font-bold mb-1'>Create captain account</h3>
          <p className='text-gray-500 mb-6'>Join MoveInSync as a driver</p>

          <form onSubmit={(e) => {
            submitHandler(e)
          }}>

          <h3 className='text-lg w-full  font-medium mb-2'>What's our Captain's name</h3>
            <div className='flex gap-4 mb-6'>
            <input
              required
                className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-3 border  text-lg placeholder:text-base'
              type="text"
              placeholder='First name'
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
              }}
            />
            <input
              required
                className='bg-[#eeeeee] w-1/2  rounded-lg px-4 py-3 border  text-lg placeholder:text-base'
              type="text"
              placeholder='Last name'
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value)
              }}
            />
          </div>

          <h3 className='text-lg font-medium mb-2'>What's our Captain's email</h3>
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

          <h3 className='text-lg font-medium mb-2'>Captain phone number</h3>
          <input
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value)
            }}
            className='bg-[#eeeeee] mb-6 rounded-lg px-4 py-3 border w-full text-lg placeholder:text-base'
            type="tel"
            placeholder='+91XXXXXXXXXX'
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

          <h3 className='text-lg font-medium mb-2'>Vehicle Information</h3>
          <div className='flex gap-4 mb-6'>
            <input
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-3 border text-lg placeholder:text-base'
              type="text"
              placeholder='Vehicle Color'
              value={vehicleColor}
              onChange={(e) => {
                setVehicleColor(e.target.value)
              }}
            />
            <input
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-3 border text-lg placeholder:text-base'
              type="text"
              placeholder='Vehicle Plate'
              value={vehiclePlate}
              onChange={(e) => {
                setVehiclePlate(e.target.value)
              }}
            />
          </div>
          <div className='flex gap-4 mb-6'>
            <input
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-3 border text-lg placeholder:text-base'
              type="number"
              placeholder='Vehicle Capacity'
              value={vehicleCapacity}
              onChange={(e) => {
                setVehicleCapacity(e.target.value)
              }}
            />
            <select
              required
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-3 border text-lg placeholder:text-base'
              value={vehicleType}
              onChange={(e) => {
                setVehicleType(e.target.value)
              }}
            >
              <option value="" disabled>Select Vehicle Type</option>
              <option value="car">Car</option>
              <option value="auto">Auto</option>
              <option value="moto">Moto</option>
            </select>
          </div>

          <button
            className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-3 w-full text-lg placeholder:text-base'
          >Create Captain Account</button>

        </form>
        <p className='text-center'>Already have an account? <Link to='/captain-login' className='text-blue-600 font-medium'>Login here</Link></p>
        <p className='text-[11px] mt-6 leading-tight text-gray-500'>This site is protected by reCAPTCHA and the <span className='underline'>Google Privacy
          Policy</span> and <span className='underline'>Terms of Service apply</span>.</p>
        </div>
      </div>
    </div>
  )
}

export default CaptainSignup