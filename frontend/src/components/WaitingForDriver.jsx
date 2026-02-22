import React from 'react'

const WaitingForDriver = (props) => {
  const captainName = props.ride?.captain?.fullname?.firstname || 'Captain'
  const vehicleType = props.ride?.captain?.vehicle?.vehicleType || 'car'
  const vehicleNameByType = {
    car: 'Sedan',
    moto: 'Moto',
    auto: 'Auto'
  }
  const vehicleImageByType = {
    car: 'https://img.icons8.com/color/96/sedan.png',
    moto: 'https://img.icons8.com/color/96/motorcycle.png',
    auto: 'https://img.icons8.com/color/96/taxi.png'
  }

  return (
    <div>
      <h5 className='p-1 text-center w-[93%] absolute top-0 cursor-pointer' onClick={() => {
        props.setWaitingForDriver(false)
      }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5>

      <div className='flex items-center justify-between'>
        <img className='h-14 w-14 object-contain' src={vehicleImageByType[ vehicleType ] || vehicleImageByType.car} alt="Assigned vehicle" />
        <div className='text-right'>
          <h2 className='text-lg font-medium capitalize'>{captainName}</h2>
          <h4 className='text-xl font-semibold -mt-1 -mb-1'>{props.ride?.captain?.vehicle?.plate || 'N/A'}</h4>
          <p className='text-sm text-gray-600'>{vehicleNameByType[ vehicleType ] || 'Vehicle'}</p>
          <h1 className='text-lg font-semibold'>  {props.ride?.otp} </h1>
        </div>
      </div>

      <div className='flex gap-2 justify-between flex-col items-center'>
        <div className='w-full mt-5 bg-gray-50 rounded-xl border border-gray-100'>
          <div className='flex items-center gap-5 p-3 border-b border-gray-200'>
            <i className="ri-map-pin-user-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>Pickup point</h3>
              <p className='text-sm -mt-1 text-gray-600'>{props.ride?.pickup}</p>
            </div>
          </div>
          <div className='flex items-center gap-5 p-3 border-b border-gray-200'>
            <i className="text-lg ri-map-pin-2-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>Drop-off point</h3>
              <p className='text-sm -mt-1 text-gray-600'>{props.ride?.destination}</p>
            </div>
          </div>
          <div className='flex items-center gap-5 p-3'>
            <i className="ri-currency-line"></i>
            <div>
              <h3 className='text-lg font-medium'>₹{props.ride?.fare} </h3>
              <p className='text-sm -mt-1 text-gray-600'>Cash Cash</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaitingForDriver