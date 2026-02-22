import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import { useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { calculateDistance } from '../utils/distance'

// Fix for default marker icons not showing in React Leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});

const PickupIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});

const DestinationIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const center = {
    lat: -3.745,
    lng: -38.523
};

const buildInterpolatedPath = (start, end, steps = 40) => {
    const safeSteps = Math.max(2, Number(steps) || 40);
    const points = [];

    for (let index = 0; index <= safeSteps; index += 1) {
        const progress = index / safeSteps;
        const lat = start.lat + (end.lat - start.lat) * progress;
        const lng = start.lng + (end.lng - start.lng) * progress;
        points.push([lat, lng]);
    }

    return points;
};

// Component to update map viewport
const MapUpdater = ({ currentPosition, pickupPosition, destinationPosition, routePath }) => {
    const map = useMap();

    useEffect(() => {
        if (routePath.length > 1) {
            map.fitBounds(routePath, { padding: [40, 40] });
            return;
        }

        if (pickupPosition && destinationPosition) {
            map.fitBounds([
                [pickupPosition.lat, pickupPosition.lng],
                [destinationPosition.lat, destinationPosition.lng]
            ], { padding: [40, 40] });
            return;
        }

        if (pickupPosition) {
            map.setView([pickupPosition.lat, pickupPosition.lng], 14);
            return;
        }

        if (destinationPosition) {
            map.setView([destinationPosition.lat, destinationPosition.lng], 14);
        }
    }, [map, pickupPosition, destinationPosition, routePath]);

    useEffect(() => {
        if (!pickupPosition && !destinationPosition && routePath.length === 0 && currentPosition) {
            map.setView([currentPosition.lat, currentPosition.lng]);
        }
    }, [map, currentPosition, pickupPosition, destinationPosition, routePath.length]);

    return null;
};

const LiveTracking = ({ pickup, destination, onPickupChange, onDestinationChange, markersDraggable = true, rideId = null, actorType = null, isRideCompleted = false }) => {
    const { socket } = useContext(SocketContext)
    const [currentPosition, setCurrentPosition] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pickupPosition, setPickupPosition] = useState(null);
    const [destinationPosition, setDestinationPosition] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const hasSentProximityAlertRef = useRef(false);

    useEffect(() => {
        if (!markersDraggable) {
            setCurrentPosition(center);
            setIsLoading(false);
            return;
        }

        const updatePosition = () => {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                console.log('Position updated:', latitude, longitude);
                setCurrentPosition({
                    lat: latitude,
                    lng: longitude
                });
                setIsLoading(false);
            }, (error) => {
                console.log('Geolocation error:', error.message);
                // Fallback to default position
                setCurrentPosition(center);
                setIsLoading(false);
            });
        };

        updatePosition(); // Initial position update

        const watchId = navigator.geolocation.watchPosition((position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({
                lat: latitude,
                lng: longitude
            });
        });

        return () => navigator.geolocation.clearWatch(watchId);
    }, [markersDraggable]);

    useEffect(() => {
        if (!pickup || pickup.trim().length < 3) {
            setPickupPosition(null);
            return;
        }

        let isCancelled = false;
        const timeoutId = setTimeout(async () => {
            if (!pickup || pickup.trim().length < 3) {
                setPickupPosition(null);
                return;
            }

            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                    params: { address: pickup },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const data = response.data;
                if (!isCancelled) {
                    setPickupPosition({ lat: data.ltd, lng: data.lng });
                }
            } catch {
                if (!isCancelled) {
                    setPickupPosition(null);
                }
            }
        }, 900);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [pickup]);

    useEffect(() => {
        if (!destination || destination.trim().length < 3) {
            setDestinationPosition(null);
            return;
        }

        let isCancelled = false;
        const timeoutId = setTimeout(async () => {
            if (!destination || destination.trim().length < 3) {
                setDestinationPosition(null);
                return;
            }

            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                    params: { address: destination },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const data = response.data;
                if (!isCancelled) {
                    setDestinationPosition({ lat: data.ltd, lng: data.lng });
                }
            } catch {
                if (!isCancelled) {
                    setDestinationPosition(null);
                }
            }
        }, 900);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [destination]);

    useEffect(() => {
        const fetchRoute = async () => {
            if (!pickupPosition || !destinationPosition) {
                setRoutePath([]);
                return;
            }

            try {
                const routeResponse = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-route`, {
                    params: {
                        origin: pickup,
                        destination
                    },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const path = Array.isArray(routeResponse.data?.path) ? routeResponse.data.path : [];
                const convertedPath = path
                    .map((point) => [Number(point?.ltd), Number(point?.lng)])
                    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));

                if (convertedPath.length >= 2) {
                    setRoutePath(convertedPath);
                    return;
                }

                setRoutePath(buildInterpolatedPath(pickupPosition, destinationPosition));
            } catch {
                setRoutePath(buildInterpolatedPath(pickupPosition, destinationPosition));
            }
        };

        fetchRoute();
    }, [pickupPosition, destinationPosition, pickup, destination]);

    useEffect(() => {
        if (isRideCompleted) {
            return;
        }

        const shouldSimulateMovement = actorType === 'captain';

        if (!shouldSimulateMovement || markersDraggable || routePath.length < 2) {
            return;
        }

        let index = 0;
        setCurrentPosition({ lat: routePath[0][0], lng: routePath[0][1] });

        // Emit initial position to other client
        if (socket && rideId) {
            socket.emit('ride-location-update', {
                rideId,
                senderType: actorType,
                location: { lat: routePath[0][0], lng: routePath[0][1] }
            });
        }

        const intervalId = setInterval(() => {
            index += 1;

            if (index >= routePath.length) {
                clearInterval(intervalId);
                return;
            }

            const [lat, lng] = routePath[index];
            setCurrentPosition({ lat, lng });

            if (!hasSentProximityAlertRef.current && destinationPosition && socket && rideId) {
                const distanceLeft = calculateDistance(lat, lng, destinationPosition.lat, destinationPosition.lng);

                if (distanceLeft <= 100) {
                    socket.emit('ride-proximity-alert', {
                        rideId,
                        distanceLeftMeters: Math.round(distanceLeft),
                        message: 'Only 100m left to destination.'
                    });
                    hasSentProximityAlertRef.current = true;
                }
            }

            // Emit position to other client during animation
            if (socket && rideId) {
                socket.emit('ride-location-update', {
                    rideId,
                    senderType: actorType,
                    location: { lat, lng }
                });
            }
        }, 700);

        return () => clearInterval(intervalId);
    }, [markersDraggable, routePath, socket, rideId, actorType, isRideCompleted, destinationPosition]);

    useEffect(() => {
        hasSentProximityAlertRef.current = false;
    }, [rideId]);

    useEffect(() => {
        if (isRideCompleted) {
            return;
        }

        if (!socket || !rideId || !actorType) {
            return;
        }

        socket.emit('join-ride-room', { rideId });

        const handleRideLocationUpdate = (payload) => {
            if (!payload || payload.rideId !== rideId) {
                return;
            }

            if (actorType === 'captain') {
                return;
            }

            if (payload.senderType !== 'captain') {
                return;
            }

            const lat = Number(payload.location?.lat);
            const lng = Number(payload.location?.lng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
            }

            setCurrentPosition({ lat, lng });
        };

        socket.on('ride-location-update', handleRideLocationUpdate);

        return () => {
            socket.off('ride-location-update', handleRideLocationUpdate);
        };
    }, [socket, rideId, actorType, isRideCompleted]);

    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/reverse-geocode`, {
                params: {
                    lat,
                    lng
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            return response.data?.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        } catch {
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    };

    if (isLoading || !currentPosition) {
        return <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading map...</div>;
    }

    return (
        <MapContainer
            center={[currentPosition.lat, currentPosition.lng]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[currentPosition.lat, currentPosition.lng]} />
            {pickupPosition && (
                <Marker
                    position={[pickupPosition.lat, pickupPosition.lng]}
                    icon={PickupIcon}
                    draggable={markersDraggable}
                    eventHandlers={{
                        dragend: async (event) => {
                            const { lat, lng } = event.target.getLatLng();
                            setPickupPosition({ lat, lng });
                            if (onPickupChange) {
                                const address = await reverseGeocode(lat, lng);
                                onPickupChange(address);
                            }
                        }
                    }}
                />
            )}
            {destinationPosition && (
                <Marker
                    position={[destinationPosition.lat, destinationPosition.lng]}
                    icon={DestinationIcon}
                    draggable={markersDraggable}
                    eventHandlers={{
                        dragend: async (event) => {
                            const { lat, lng } = event.target.getLatLng();
                            setDestinationPosition({ lat, lng });
                            if (onDestinationChange) {
                                const address = await reverseGeocode(lat, lng);
                                onDestinationChange(address);
                            }
                        }
                    }}
                />
            )}
            {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#111111', weight: 5 }} />}
            <MapUpdater
                currentPosition={currentPosition}
                pickupPosition={pickupPosition}
                destinationPosition={destinationPosition}
                routePath={routePath}
            />
        </MapContainer>
    )
}

export default LiveTracking