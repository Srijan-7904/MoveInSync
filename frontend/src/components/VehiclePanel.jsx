import React from 'react'

const VehiclePanel = (props) => {
    const vehicleMeta = {
        car: {
            title: 'Sedan',
            seats: 4,
            eta: '2 mins away',
            subtitle: 'Comfort rides for office travel',
            image: 'https://img.icons8.com/color/96/sedan.png'
        },
        moto: {
            title: 'Moto',
            seats: 1,
            eta: '3 mins away',
            subtitle: 'Quick bike rides for short trips',
            image: 'https://img.icons8.com/color/96/motorcycle.png'
        },
        auto: {
            title: 'Auto',
            seats: 3,
            eta: '3 mins away',
            subtitle: 'Budget friendly auto rides',
            image: 'https://img.icons8.com/color/96/taxi.png'
        }
    }

    return (
        <div>
            <h5 className='p-1 text-center w-[93%] absolute top-0 cursor-pointer' onClick={() => {
                props.setVehiclePanel(false)
            }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5>
            <h3 className='text-2xl font-semibold mb-5'>Choose a Vehicle</h3>
            <div onClick={() => {
                props.setConfirmRidePanel(true)
                props.selectVehicle('car')
            }} className='flex border active:border-black hover:border-black mb-2 rounded-xl w-full p-3 items-center justify-between cursor-pointer transition-all'>
                <img className='h-11 w-11 object-contain' src={vehicleMeta.car.image} alt="Sedan" />
                <div className='ml-2 w-1/2'>
                    <h4 className='font-medium text-base'>{vehicleMeta.car.title} <span><i className="ri-user-3-fill"></i>{vehicleMeta.car.seats}</span></h4>
                    <h5 className='font-medium text-sm'>{vehicleMeta.car.eta}</h5>
                    <p className='font-normal text-xs text-gray-600'>{vehicleMeta.car.subtitle}</p>
                </div>
                <h2 className='text-lg font-semibold'>₹{props.fare.car}</h2>
            </div>
            <div onClick={() => {
                props.setConfirmRidePanel(true)
                props.selectVehicle('moto')
            }} className='flex border active:border-black hover:border-black mb-2 rounded-xl w-full p-3 items-center justify-between cursor-pointer transition-all'>
                <img className='h-11 w-11 object-contain' src={vehicleMeta.moto.image} alt="Moto" />
                <div className='-ml-2 w-1/2'>
                    <h4 className='font-medium text-base'>{vehicleMeta.moto.title} <span><i className="ri-user-3-fill"></i>{vehicleMeta.moto.seats}</span></h4>
                    <h5 className='font-medium text-sm'>{vehicleMeta.moto.eta}</h5>
                    <p className='font-normal text-xs text-gray-600'>{vehicleMeta.moto.subtitle}</p>
                </div>
                <h2 className='text-lg font-semibold'>₹{props.fare.moto}</h2>
            </div>
            <div onClick={() => {
                props.setConfirmRidePanel(true)
                props.selectVehicle('auto')
            }} className='flex border active:border-black hover:border-black mb-2 rounded-xl w-full p-3 items-center justify-between cursor-pointer transition-all'>
                <img className='h-11 w-11 object-contain' src={vehicleMeta.auto.image} alt="Auto" />
                <div className='ml-2 w-1/2'>
                    <h4 className='font-medium text-base'>{vehicleMeta.auto.title} <span><i className="ri-user-3-fill"></i>{vehicleMeta.auto.seats}</span></h4>
                    <h5 className='font-medium text-sm'>{vehicleMeta.auto.eta}</h5>
                    <p className='font-normal text-xs text-gray-600'>{vehicleMeta.auto.subtitle}</p>
                </div>
                <h2 className='text-lg font-semibold'>₹{props.fare.auto}</h2>
            </div>
        </div>
    )
}

export default VehiclePanel