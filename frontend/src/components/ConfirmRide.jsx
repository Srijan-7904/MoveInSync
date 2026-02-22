import React from 'react'

const ConfirmRide = (props) => {
    const vehicleImageByType = {
        car: 'https://img.icons8.com/color/96/sedan.png',
        moto: 'https://img.icons8.com/color/96/motorcycle.png',
        auto: 'https://img.icons8.com/color/96/taxi.png'
    }

    return (
        <div>
            <h5 className='p-1 text-center w-[93%] absolute top-0 cursor-pointer' onClick={() => {
                props.setConfirmRidePanel(false)
            }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5>
            <h3 className='text-2xl font-semibold mb-5'>Confirm your Ride</h3>

            <div className='flex gap-2 justify-between flex-col items-center'>
                <img className='h-20 w-20 object-contain' src={vehicleImageByType[ props.vehicleType ] || vehicleImageByType.car} alt="Selected vehicle" />
                <div className='w-full mt-5 bg-gray-50 rounded-xl border border-gray-100'>
                    <div className='flex items-center gap-5 p-3 border-b border-gray-200'>
                        <i className="ri-map-pin-user-fill"></i>
                        <div>
                            <h3 className='text-lg font-medium'>Pickup point</h3>
                            <p className='text-sm -mt-1 text-gray-600'>{props.pickup}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-5 p-3 border-b border-gray-200'>
                        <i className="text-lg ri-map-pin-2-fill"></i>
                        <div>
                            <h3 className='text-lg font-medium'>Drop-off point</h3>
                            <p className='text-sm -mt-1 text-gray-600'>{props.destination}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-5 p-3'>
                        <i className="ri-currency-line"></i>
                        <div>
                            <h3 className='text-lg font-medium'>₹{props.fare[ props.vehicleType ]}</h3>
                            <p className='text-sm -mt-1 text-gray-600'>Cash Cash</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => {
                    props.setVehicleFound(true)
                    props.setConfirmRidePanel(false)
                    props.createRide()

                }} className='w-full mt-5 mb-9 bg-green-600 text-white font-semibold p-3 rounded-xl'>Confirm</button>
            </div>
        </div>
    )
}

export default ConfirmRide