import { verifySessionToken, getSessionFromCookies } from './utils/auth.js'
import { jsonResponse, errorResponse, parseBody } from './utils/response.js'
import { getQuota, incrementQuota, canUseQuota, trackApiUsage } from './utils/storage.js'
import { logSearch } from './utils/logger.js'
import {
  getDistance,
  isMultiFamilyText,
  isClubText,
  classifyCourt,
  reclassifyWithAddress,
  clusterCourts,
  findNearbyClub,
  findNearbyMultiFamily,
  CLUB_ASSOCIATION_DISTANCE_METERS,
  MULTIFAMILY_ASSOCIATION_DISTANCE_METERS
} from './utils/court-utils.js'

// Overpass API endpoints (fallbacks in case primary is overloaded)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]

// Query Overpass API for nearby club features (sports centres, golf courses, etc.)
async function queryNearbyClubFeatures(lat, lng, radiusMiles) {
  try {
    const radiusMeters = radiusMiles * 1609.34

    // Query for features that might indicate a private club
    const query = `
      [out:json][timeout:15];
      (
        way["leisure"="sports_centre"](around:${radiusMeters},${lat},${lng});
        node["leisure"="sports_centre"](around:${radiusMeters},${lat},${lng});
        way["leisure"="golf_course"](around:${radiusMeters},${lat},${lng});
        node["leisure"="golf_course"](around:${radiusMeters},${lat},${lng});
        way["club"](around:${radiusMeters},${lat},${lng});
        node["club"](around:${radiusMeters},${lat},${lng});
        way["amenity"="club_house"](around:${radiusMeters},${lat},${lng});
        node["amenity"="club_house"](around:${radiusMeters},${lat},${lng});
      );
      out center tags;
    `

    // Try each endpoint (but don't let this block the main query)
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.error(`Club features query returned ${response.status} on ${endpoint}`)
          continue
        }

        const data = await response.json()
        // Filter to only features with names containing club-related keywords
        // IMPORTANT: Require "club" in the name to avoid false positives from golf courses
        // that don't have "club" (e.g., "Hill Country Golf Course" should NOT match,
        // but "Westwood Country Club" SHOULD match because it contains "club")
        const clubFeatures = (data.elements || []).filter(el => {
          const name = (el.tags?.name || '').toLowerCase()
          // Must have "club" in name - this catches country clubs, tennis clubs, etc.
          // "resort" and "athletic" without "club" are less reliable indicators
          return name.includes('club')
        }).map(el => ({
          lat: el.center?.lat || el.lat,
          lng: el.center?.lon || el.lon,
          name: el.tags?.name || '',
          type: el.tags?.leisure || el.tags?.amenity || el.tags?.club || 'unknown'
        }))

        console.log(`Found ${clubFeatures.length} club features nearby`)
        return clubFeatures
      } catch (err) {
        console.error(`Club features query failed on ${endpoint}:`, err.message)
        continue
      }
    }
  } catch (err) {
    console.error('Club features query error:', err.message)
  }

  // Return empty array on any failure - don't break the main search
  return []
}

// Query Overpass API for nearby apartment/multi-family buildings
async function queryNearbyMultiFamilyFeatures(lat, lng, radiusMiles) {
  try {
    const radiusMeters = radiusMiles * 1609.34

    // Query for apartment buildings and residential complexes
    const query = `
      [out:json][timeout:15];
      (
        way["building"="apartments"](around:${radiusMeters},${lat},${lng});
        way["building"="residential"]["residential"="apartments"](around:${radiusMeters},${lat},${lng});
        way["landuse"="residential"]["residential"="apartments"](around:${radiusMeters},${lat},${lng});
        relation["building"="apartments"](around:${radiusMeters},${lat},${lng});
      );
      out center tags;
    `

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.error(`Multi-family features query returned ${response.status} on ${endpoint}`)
          continue
        }

        const data = await response.json()
        const multiFamilyFeatures = (data.elements || []).map(el => ({
          lat: el.center?.lat || el.lat,
          lng: el.center?.lon || el.lon,
          name: el.tags?.name || '',
          type: el.tags?.building || el.tags?.residential || 'apartments'
        }))

        console.log(`Found ${multiFamilyFeatures.length} multi-family features nearby`)
        return multiFamilyFeatures
      } catch (err) {
        console.error(`Multi-family features query failed on ${endpoint}:`, err.message)
        continue
      }
    }
  } catch (err) {
    console.error('Multi-family features query error:', err.message)
  }

  return []
}

// Query Overpass API for tennis courts
async function queryOverpass(lat, lng, radiusMiles) {
  // Convert miles to meters (approximately)
  const radiusMeters = radiusMiles * 1609.34

  // Overpass QL query for tennis courts
  const query = `
    [out:json][timeout:30];
    (
      way["leisure"="pitch"]["sport"="tennis"](around:${radiusMeters},${lat},${lng});
      node["leisure"="pitch"]["sport"="tennis"](around:${radiusMeters},${lat},${lng});
      way["sport"="tennis"](around:${radiusMeters},${lat},${lng});
      node["sport"="tennis"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `

  let lastError = null

  // Try each endpoint until one works
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Trying Overpass endpoint: ${endpoint}`)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(query)}`
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Overpass API error (${endpoint}):`, response.status, errorText.substring(0, 500))
        lastError = new Error(`Overpass API returned ${response.status}: ${errorText.substring(0, 100)}`)
        continue // Try next endpoint
      }

      const data = await response.json()
      console.log(`Overpass query successful, found ${data.elements?.length || 0} elements`)
      return data.elements || []
    } catch (err) {
      console.error(`Overpass endpoint failed (${endpoint}):`, err.message)
      lastError = err
      // Continue to next endpoint
    }
  }

  // All endpoints failed
  throw lastError || new Error('All Overpass API endpoints failed')
}

// Reverse geocode using OpenStreetMap Nominatim (free, good coverage)
async function reverseGeocodeNominatim(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TennisCourtFinder/1.0'
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data && data.display_name) {
        // Check if we got a real address (has house number or road)
        const addr = data.address || {}
        const hasStreetAddress = addr.house_number || addr.road

        // Build a cleaner address string
        let address = ''
        if (addr.house_number && addr.road) {
          address = `${addr.house_number} ${addr.road}`
          if (addr.city || addr.town || addr.village) {
            address += `, ${addr.city || addr.town || addr.village}`
          }
          if (addr.state) {
            address += `, ${addr.state}`
          }
          if (addr.postcode) {
            address += ` ${addr.postcode}`
          }
        } else {
          // Use display_name but truncate to reasonable length
          address = data.display_name.split(',').slice(0, 4).join(',')
        }

        return {
          address,
          type: hasStreetAddress ? 'address' : 'poi'
        }
      }
    }
  } catch (err) {
    console.error('Nominatim geocode error:', err.message)
  }

  return null
}

// Reverse geocode to get address
async function reverseGeocode(lat, lng, mapboxToken) {
  // First try to get a street address from Mapbox
  const addressUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address&limit=1`

  try {
    const addressResponse = await fetch(addressUrl)
    if (addressResponse.ok) {
      const addressData = await addressResponse.json()
      if (addressData.features && addressData.features.length > 0) {
        return {
          address: addressData.features[0].place_name,
          type: 'address'
        }
      }
    }
  } catch (err) {
    console.error('Address geocode error:', err.message)
  }

  // Try OpenStreetMap Nominatim (often has better coverage for residential areas)
  const nominatimResult = await reverseGeocodeNominatim(lat, lng)
  if (nominatimResult && nominatimResult.type === 'address') {
    return nominatimResult
  }

  // If no exact address, try to get POI or place name from Mapbox (for parks, schools, etc.)
  const poiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=poi,place,locality,neighborhood&limit=1`

  try {
    const poiResponse = await fetch(poiUrl)
    if (poiResponse.ok) {
      const poiData = await poiResponse.json()
      if (poiData.features && poiData.features.length > 0) {
        const feature = poiData.features[0]
        return {
          address: feature.place_name,
          type: 'poi',
          poiName: feature.text || feature.place_name.split(',')[0] // Get just the POI name
        }
      }
    }
  } catch (err) {
    console.error('POI geocode error:', err.message)
  }

  // Return Nominatim result if we got something (even if not a street address)
  if (nominatimResult) {
    return nominatimResult
  }

  // Last resort: get any location info from Mapbox
  const anyUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&limit=1`

  try {
    const anyResponse = await fetch(anyUrl)
    if (anyResponse.ok) {
      const anyData = await anyResponse.json()
      if (anyData.features && anyData.features.length > 0) {
        return {
          address: anyData.features[0].place_name,
          type: 'general'
        }
      }
    }
  } catch (err) {
    console.error('General geocode error:', err.message)
  }

  return null
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  // Verify authentication
  const sessionToken = getSessionFromCookies(event.headers.cookie)
  if (!sessionToken) {
    return errorResponse('Authentication required', 401)
  }

  let email
  try {
    const session = await verifySessionToken(sessionToken)
    email = session.email
  } catch (error) {
    return errorResponse('Invalid session', 401)
  }

  // Check quota
  if (!canUseQuota(email)) {
    const quota = getQuota(email)
    return jsonResponse({
      error: 'Daily search limit reached',
      quota: {
        used: quota.used,
        limit: quota.limit,
        resetTime: 'midnight UTC'
      }
    }, 429)
  }

  const { lat, lng, distanceMiles } = parseBody(event)

  if (!lat || !lng || !distanceMiles) {
    return errorResponse('lat, lng, and distanceMiles are required')
  }

  try {
    // Query Overpass API for tennis courts and nearby features in parallel
    await trackApiUsage('overpass')
    const [elements, clubFeatures, multiFamilyFeatures] = await Promise.all([
      queryOverpass(lat, lng, distanceMiles),
      queryNearbyClubFeatures(lat, lng, distanceMiles),
      queryNearbyMultiFamilyFeatures(lat, lng, distanceMiles)
    ])

    console.log(`Found ${elements.length} tennis courts, ${clubFeatures.length} club features, ${multiFamilyFeatures.length} multi-family features`)

    // Get Mapbox token for reverse geocoding
    const mapboxToken = process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN

    // Process results
    const courts = []

    for (const element of elements) {
      // Get coordinates (center for ways, direct for nodes)
      const courtLat = element.center?.lat || element.lat
      const courtLng = element.center?.lon || element.lon

      if (!courtLat || !courtLng) continue

      // Calculate distance
      const distance = getDistance(lat, lng, courtLat, courtLng)

      // Skip if outside search radius (in case Overpass returns extras)
      if (distance > distanceMiles) continue

      // Try to get address (limit geocoding calls)
      let address = null
      let addressType = null
      let geocodeResult = null
      let coords = `${courtLat.toFixed(5)}, ${courtLng.toFixed(5)}`

      if (courts.length < 50) { // Limit reverse geocoding to first 50
        await trackApiUsage('mapbox-geocoding')
        geocodeResult = await reverseGeocode(courtLat, courtLng, mapboxToken)
        if (geocodeResult) {
          address = geocodeResult.address
          addressType = geocodeResult.type
        }
      }

      // Classify court type (using both OSM tags and address info)
      let { type, verified } = classifyCourt(element.tags || {}, geocodeResult)

      // If we got address info, try to reclassify (e.g., detect apartments from POI name)
      if (geocodeResult) {
        const reclassified = reclassifyWithAddress(type, verified, geocodeResult)
        type = reclassified.type
        verified = reclassified.verified
      }

      // Check if court is near a known club feature (e.g., country club, sports centre)
      // Only reclassify if currently unverified public or private
      if ((type === 'public' && !verified) || type === 'private') {
        const nearbyClub = findNearbyClub(courtLat, courtLng, clubFeatures)
        if (nearbyClub) {
          console.log(`Court at ${courtLat.toFixed(4)},${courtLng.toFixed(4)} is near "${nearbyClub.name}" - classifying as club`)
          type = 'club'
          verified = false // Not verified from OSM tags, but detected from nearby feature
        }
      }

      // Check if court is near an apartment building (multi-family housing)
      // Only reclassify if currently unverified public or private (not already club)
      if ((type === 'public' && !verified) || type === 'private') {
        const nearbyMultiFamily = findNearbyMultiFamily(courtLat, courtLng, multiFamilyFeatures)
        if (nearbyMultiFamily) {
          console.log(`Court at ${courtLat.toFixed(4)},${courtLng.toFixed(4)} is near apartment building "${nearbyMultiFamily.name || 'unnamed'}" - classifying as multi-family`)
          type = 'multi-family'
          verified = false // Not verified from OSM tags, but detected from nearby feature
        }
      }

      courts.push({
        id: `osm-${element.type}-${element.id}`,
        lat: courtLat,
        lng: courtLng,
        address: address || coords,
        coords: coords,
        addressType: addressType, // 'address', 'poi', 'general', or null
        type,
        verified,
        distance,
        tags: element.tags || {}
      })
    }

    // Cluster nearby courts of the same type
    const clusteredCourts = clusterCourts(courts)
    console.log(`Clustered ${courts.length} courts into ${clusteredCourts.length} locations`)

    // Sort by distance
    clusteredCourts.sort((a, b) => a.distance - b.distance)

    // Log the search
    await logSearch(email, lat, lng, distanceMiles, clusteredCourts.length)

    // Increment quota
    const quota = incrementQuota(email)

    return jsonResponse({
      courts: clusteredCourts,
      count: clusteredCourts.length,
      quota: {
        used: quota.used,
        limit: quota.limit,
        resetTime: 'midnight UTC'
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    return errorResponse('Search failed: ' + error.message, 500)
  }
}
