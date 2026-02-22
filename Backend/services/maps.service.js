const axios = require('axios');
const https = require('https');
const captainModel = require('../models/captain.model');

const coordinateCache = new Map();
const suggestionsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const SUGGESTIONS_CACHE_TTL_MS = 2 * 60 * 1000;
const MIN_REQUEST_INTERVAL = 2000; // Nominatim: 2 seconds between requests
const OSRM_ROUTE_ENDPOINTS = [
    'https://router.project-osrm.org/route/v1/driving',
    'https://routing.openstreetmap.de/routed-car/route/v1/driving',
    'http://router.project-osrm.org/route/v1/driving'
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Global request mutex
let lastNominatimRequestTime = 0;
let nominatimRequestPromise = Promise.resolve();
const insecureTlsAgent = new https.Agent({ rejectUnauthorized: false });

const hasTlsCertificateError = (error) => {
    const errorCode = error?.code || '';
    const message = String(error?.message || '').toLowerCase();

    return [
        'SELF_SIGNED_CERT_IN_CHAIN',
        'DEPTH_ZERO_SELF_SIGNED_CERT',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    ].includes(errorCode) ||
        message.includes('self-signed certificate') ||
        message.includes('certificate chain');
}

const getCachedCoordinates = (address) => {
    const cached = coordinateCache.get(address);
    if (!cached) {
        return null;
    }

    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        coordinateCache.delete(address);
        return null;
    }

    return cached.value;
}

const setCachedCoordinates = (address, value) => {
    coordinateCache.set(address, {
        value,
        timestamp: Date.now()
    });
}

const getCachedSuggestions = (query) => {
    const cached = suggestionsCache.get(query);
    if (!cached) {
        return null;
    }

    if (Date.now() - cached.timestamp > SUGGESTIONS_CACHE_TTL_MS) {
        suggestionsCache.delete(query);
        return null;
    }

    return cached.value;
}

const setCachedSuggestions = (query, value) => {
    suggestionsCache.set(query, {
        value,
        timestamp: Date.now()
    });
}

// Serialize all Nominatim requests to prevent rate limiting
const makeThrottledNominatimRequest = async (url, params, headers) => {
    return (nominatimRequestPromise = nominatimRequestPromise
        .catch(() => null)
        .then(async () => {
        // Wait for minimum interval since last request
        const timeSinceLastRequest = Date.now() - lastNominatimRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            await wait(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
        }

        try {
            const requestConfig = {
                params,
                timeout: 10000,
                headers
            };

            try {
                return await axios.get(url, requestConfig);
            } catch (error) {
                if (!hasTlsCertificateError(error)) {
                    throw error;
                }

                return await axios.get(url, {
                    ...requestConfig,
                    httpsAgent: insecureTlsAgent
                });
            }
        } finally {
            lastNominatimRequestTime = Date.now();
        }
    }));
}

const getRouteFromProviders = async (originCoords, destinationCoords, options = {}) => {
    const coordsStr = `${originCoords.lng},${originCoords.ltd};${destinationCoords.lng},${destinationCoords.ltd}`;
    let lastError = null;

    const query = new URLSearchParams(options).toString();

    for (const endpoint of OSRM_ROUTE_ENDPOINTS) {
        const url = `${endpoint}/${coordsStr}${query ? `?${query}` : ''}`;

        try {
            const response = await axios.get(url, { timeout: 10000 });
            if (response?.data?.code === 'Ok' && Array.isArray(response?.data?.routes) && response.data.routes.length > 0) {
                return response.data.routes[0];
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('No routes found');
}

module.exports.getAddressCoordinate = async (address) => {
    if (!address || !address.trim()) {
        throw new Error('Address is required');
    }

    const normalizedAddress = address.trim();
    const cachedCoordinates = getCachedCoordinates(normalizedAddress);
    if (cachedCoordinates) {
        return cachedCoordinates;
    }

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await makeThrottledNominatimRequest(
                'https://nominatim.openstreetmap.org/search',
                {
                    q: normalizedAddress,
                    format: 'json',
                    limit: 1,
                    addressdetails: 0
                },
                {
                    'User-Agent': 'MoveInSync/1.0',
                    'Accept-Language': 'en'
                }
            );

            if (Array.isArray(response.data) && response.data.length > 0) {
                const location = response.data[0];
                const coordinates = {
                    ltd: parseFloat(location.lat),
                    lng: parseFloat(location.lon)
                };

                if (Number.isFinite(coordinates.ltd) && Number.isFinite(coordinates.lng)) {
                    setCachedCoordinates(normalizedAddress, coordinates);
                    return coordinates;
                }
            }

            throw new Error('No results found');
        } catch (error) {
            const status = error?.response?.status;
            const isTransient = [429, 500, 502, 503, 504].includes(status) || !status;

            if (attempt < maxRetries && isTransient) {
                const delayMs = Math.min(1000 * Math.pow(2, attempt + 1), 15000);
                await wait(delayMs);
                continue;
            }

            throw new Error('Unable to fetch coordinates');
        }
    }

    throw new Error('Unable to fetch coordinates');
}

module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    try {
        // First, geocode both addresses to get coordinates
        const originCoords = await module.exports.getAddressCoordinate(origin);
        const destCoords = await module.exports.getAddressCoordinate(destination);

        const route = await getRouteFromProviders(originCoords, destCoords, {
            overview: 'false'
        });

        // Map OSRM response (distance in meters, duration in seconds) to look roughly like Google's format to avoid breaking existing code
        return {
            distance: {
                text: `${(route.distance / 1000).toFixed(1)} km`,
                value: route.distance
            },
            duration: {
                text: `${Math.round(route.duration / 60)} mins`,
                value: route.duration
            },
            status: 'OK'
        };

    } catch (err) {
        const status = err?.response?.status;
        if (!(status >= 500 && status < 600)) {
            console.error('Routing service error:', err.message);
        }
        
        // Fallback: Calculate straight-line distance as estimate when OSRM is down
        try {
            const originCoords = await module.exports.getAddressCoordinate(origin);
            const destCoords = await module.exports.getAddressCoordinate(destination);
            
            // Haversine formula for distance between two coordinates
            const R = 6371; // Earth's radius in km
            const dLat = (destCoords.ltd - originCoords.ltd) * Math.PI / 180;
            const dLng = (destCoords.lng - originCoords.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(originCoords.ltd * Math.PI / 180) * Math.cos(destCoords.ltd * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distanceKm = R * c;
            const distanceMeters = distanceKm * 1000;
            
            // Estimate duration assuming average speed of 40 km/h in city
            const durationMinutes = Math.round((distanceKm / 40) * 60);
            const durationSeconds = durationMinutes * 60;
            
            console.log(`Using fallback estimate: ${distanceKm.toFixed(1)} km, ${durationMinutes} mins`);
            
            return {
                distance: {
                    text: `${distanceKm.toFixed(1)} km (est.)`,
                    value: distanceMeters
                },
                duration: {
                    text: `${durationMinutes} mins (est.)`,
                    value: durationSeconds
                },
                status: 'OK'
            };
        } catch (fallbackErr) {
            console.error('Fallback calculation also failed:', fallbackErr);
            throw err; // Throw original error if fallback fails
        }
    }
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    const normalizedInput = input.trim().toLowerCase();
    const cachedSuggestions = getCachedSuggestions(normalizedInput);
    if (cachedSuggestions) {
        return cachedSuggestions;
    }

    try {
        const response = await makeThrottledNominatimRequest(
            'https://nominatim.openstreetmap.org/search',
            {
                q: normalizedInput,
                format: 'json',
                limit: 5,
                addressdetails: 0
            },
            {
                'User-Agent': 'UberVideoClone/1.0 (dev)',
                'Accept-Language': 'en'
            }
        );
        
        if (response.data && Array.isArray(response.data)) {
            // Map to an array of location description strings, which is what the frontend expects
            const suggestions = response.data.map(prediction => prediction.display_name).filter(value => value);
            setCachedSuggestions(normalizedInput, suggestions);
            return suggestions;
        } else {
            throw new Error('Unable to fetch suggestions');
        }
    } catch (err) {
        const status = err?.response?.status;
        if (status === 429 || (status >= 500 && status < 600) || hasTlsCertificateError(err) || !err?.response) {
            return [];
        }

        console.error('Autocomplete error:', err?.response?.status || err?.message || 'Unknown error');
        throw new Error('Unable to fetch suggestions');
    }
}

module.exports.reverseGeocode = async (lat, lng) => {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        throw new Error('Valid latitude and longitude are required');
    }

    try {
        const response = await makeThrottledNominatimRequest(
            'https://nominatim.openstreetmap.org/reverse',
            {
                format: 'jsonv2',
                lat: parsedLat,
                lon: parsedLng,
                addressdetails: 0
            },
            {
                'User-Agent': 'MoveInSync/1.0 (dev)',
                'Accept-Language': 'en'
            }
        );

        const displayName = response?.data?.display_name;
        if (!displayName) {
            return `${parsedLat.toFixed(6)}, ${parsedLng.toFixed(6)}`;
        }

        return displayName;
    } catch (err) {
        if (err?.response?.status === 429) {
            return `${parsedLat.toFixed(6)}, ${parsedLng.toFixed(6)}`;
        }

        throw new Error('Unable to reverse geocode location');
    }
}

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {
    const centerLat = Number(ltd);
    const centerLng = Number(lng);
    const radiusKm = Number(radius);

    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) || !Number.isFinite(radiusKm)) {
        return [];
    }

    const toRadians = (value) => (value * Math.PI) / 180;
    const distanceInKm = (lat1, lng1, lat2, lng2) => {
        const earthRadiusKm = 6371;
        const dLat = toRadians(lat2 - lat1);
        const dLng = toRadians(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    };

    const captains = await captainModel.find({
        'location.ltd': { $ne: null },
        'location.lng': { $ne: null }
    });

    return captains.filter((captain) => {
        const captainLat = Number(captain?.location?.ltd);
        const captainLng = Number(captain?.location?.lng);

        if (!Number.isFinite(captainLat) || !Number.isFinite(captainLng)) {
            return false;
        }

        return distanceInKm(centerLat, centerLng, captainLat, captainLng) <= radiusKm;
    });


}

module.exports.getRoutePath = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const originCoords = await module.exports.getAddressCoordinate(origin);
    const destinationCoords = await module.exports.getAddressCoordinate(destination);

    const route = await getRouteFromProviders(originCoords, destinationCoords, {
        overview: 'full',
        geometries: 'geojson'
    });

    const geometryCoordinates = Array.isArray(route?.geometry?.coordinates)
        ? route.geometry.coordinates
        : [];

    const path = geometryCoordinates
        .map((point) => {
            if (!Array.isArray(point) || point.length < 2) {
                return null;
            }

            const lng = Number(point[0]);
            const ltd = Number(point[1]);

            if (!Number.isFinite(lng) || !Number.isFinite(ltd)) {
                return null;
            }

            return { ltd, lng };
        })
        .filter(Boolean);

    if (path.length < 2) {
        throw new Error('Unable to fetch route path');
    }

    return path;
}