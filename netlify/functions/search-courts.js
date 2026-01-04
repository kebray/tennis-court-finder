import { verifySessionToken, getSessionFromCookies } from './utils/auth.js'
import { jsonResponse, errorResponse, parseBody } from './utils/response.js'
import { getQuota, incrementQuota, canUseQuota, trackApiUsage } from './utils/storage.js'
import { logSearch } from './utils/logger.js'

// Haversine distance formula (returns miles by default)
function getDistance(lat1, lon1, lat2, lon2, unit = 'miles') {
  const R = unit === 'meters' ? 6371000 : 3959 // Earth radius in meters or miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Classify court type based on OSM tags
function classifyCourt(tags) {
  const access = tags.access?.toLowerCase() || ''
  const leisure = tags.leisure?.toLowerCase() || ''
  const name = (tags.name || '').toLowerCase()
  const operator = (tags.operator || '').toLowerCase()
  const amenity = (tags.amenity || '').toLowerCase()
  const landuse = (tags.landuse || '').toLowerCase()
  const ownership = (tags.ownership || '').toLowerCase()

  // Keywords that indicate public facilities
  const publicKeywords = ['park', 'school', 'recreation', 'community', 'municipal', 'city', 'county', 'state', 'public', 'district', 'university', 'college', 'high school', 'middle school', 'elementary', 'academy', 'ymca', 'ywca', 'civic', 'township']

  // Keywords that indicate private clubs
  const clubKeywords = ['club', 'country', 'tennis center', 'tennis centre', 'racquet', 'racket', 'athletic', 'fitness', 'resort', 'hotel', 'swim', 'golf']

  // Keywords that indicate private residential
  const privateKeywords = ['private', 'residence', 'residential', 'home', 'estate']

  // Combine all text fields to search
  const allText = `${name} ${operator} ${tags.description || ''}`.toLowerCase()

  // 1. Check explicit access tags first (most reliable)
  if (access === 'private') {
    if (clubKeywords.some(k => allText.includes(k))) {
      return { type: 'club', verified: true }
    }
    return { type: 'private', verified: true }
  }

  if (access === 'public' || access === 'yes' || access === 'permissive') {
    return { type: 'public', verified: true }
  }

  if (access === 'members' || access === 'customers') {
    return { type: 'club', verified: true }
  }

  // 2. Check for club indicators
  if (tags.club === 'sport' || tags.club === 'yes' || tags.club === 'tennis') {
    return { type: 'club', verified: true }
  }

  // 3. Check amenity/leisure tags for public facilities
  if (amenity === 'school' || amenity === 'college' || amenity === 'university') {
    return { type: 'public', verified: true }
  }

  if (leisure === 'sports_centre' || leisure === 'stadium' || leisure === 'park') {
    return { type: 'public', verified: true }
  }

  if (landuse === 'recreation_ground' || landuse === 'village_green') {
    return { type: 'public', verified: true }
  }

  // 4. Check ownership tag
  if (ownership === 'public' || ownership === 'municipal' || ownership === 'government') {
    return { type: 'public', verified: true }
  }

  if (ownership === 'private') {
    return { type: 'private', verified: true }
  }

  // 5. Check name and operator for keywords
  if (clubKeywords.some(k => allText.includes(k))) {
    return { type: 'club', verified: false }
  }

  if (publicKeywords.some(k => allText.includes(k))) {
    return { type: 'public', verified: false }
  }

  if (privateKeywords.some(k => allText.includes(k))) {
    return { type: 'private', verified: false }
  }

  // 6. Default: If no indicators, mark as public (unverified) since most
  // unmarked courts in OSM are at public facilities that weren't fully tagged.
  // Private residential courts are rare and usually explicitly tagged.
  return { type: 'public', verified: false }
}

// Cluster nearby courts of the same type to avoid duplicate listings
// (e.g., a club with 6 courts should show as 1 result, not 6)
const CLUSTER_DISTANCE_METERS = 50 // Courts within 50 meters are clustered

function clusterCourts(courts) {
  if (courts.length === 0) return []

  const clustered = []
  const used = new Set()

  for (let i = 0; i < courts.length; i++) {
    if (used.has(i)) continue

    const court = courts[i]
    const cluster = [court]
    used.add(i)

    // Skip clustering for private residential courts - neighboring houses
    // could each have their own court and we don't want to merge them
    if (court.type === 'private') {
      clustered.push({ ...court, courtCount: 1 })
      continue
    }

    // Find all nearby courts of the same type (clubs and public only)
    for (let j = i + 1; j < courts.length; j++) {
      if (used.has(j)) continue

      const other = courts[j]

      // Must be same type to cluster
      if (other.type !== court.type) continue

      // Check if within clustering distance
      const distMeters = getDistance(court.lat, court.lng, other.lat, other.lng, 'meters')

      if (distMeters <= CLUSTER_DISTANCE_METERS) {
        // Additional check: if both have real addresses, they must match
        const courtHasAddress = court.address && court.address !== court.coords
        const otherHasAddress = other.address && other.address !== other.coords

        if (courtHasAddress && otherHasAddress) {
          // Both have addresses - only cluster if addresses are similar
          // (simple check: first 20 chars match, handles minor variations)
          const addr1 = court.address.substring(0, 20).toLowerCase()
          const addr2 = other.address.substring(0, 20).toLowerCase()
          if (addr1 !== addr2) continue
        }

        cluster.push(other)
        used.add(j)
      }
    }

    // Create merged court from cluster
    if (cluster.length === 1) {
      // No clustering needed
      clustered.push({ ...court, courtCount: 1 })
    } else {
      // Calculate centroid
      const avgLat = cluster.reduce((sum, c) => sum + c.lat, 0) / cluster.length
      const avgLng = cluster.reduce((sum, c) => sum + c.lng, 0) / cluster.length

      // Find the best address (prefer real addresses over coords)
      let bestAddress = null
      let bestAddressType = null
      for (const c of cluster) {
        if (c.address && c.address !== c.coords) {
          if (!bestAddress || c.addressType === 'address') {
            bestAddress = c.address
            bestAddressType = c.addressType
          }
        }
      }

      // Use first court's distance as base (will be recalculated)
      const avgDistance = cluster.reduce((sum, c) => sum + c.distance, 0) / cluster.length

      // Merge verified status (verified if any in cluster is verified)
      const isVerified = cluster.some(c => c.verified)

      // Combine all OSM IDs for reference
      const combinedId = cluster.map(c => c.id).join('+')

      const coords = `${avgLat.toFixed(5)}, ${avgLng.toFixed(5)}`

      clustered.push({
        id: combinedId,
        lat: avgLat,
        lng: avgLng,
        address: bestAddress || coords,
        coords: coords,
        addressType: bestAddressType,
        type: court.type,
        verified: isVerified,
        distance: avgDistance,
        courtCount: cluster.length,
        tags: court.tags // Keep first court's tags
      })
    }
  }

  return clustered
}

// Overpass API endpoints (fallbacks in case primary is overloaded)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
]

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
        return {
          address: poiData.features[0].place_name,
          type: 'poi'
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
    // Query Overpass API
    trackApiUsage('overpass')
    const elements = await queryOverpass(lat, lng, distanceMiles)

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

      // Classify court type
      const { type, verified } = classifyCourt(element.tags || {})

      // Try to get address (limit geocoding calls)
      let address = null
      let addressType = null
      let coords = `${courtLat.toFixed(5)}, ${courtLng.toFixed(5)}`

      if (courts.length < 50) { // Limit reverse geocoding to first 50
        trackApiUsage('mapbox-geocoding')
        const geocodeResult = await reverseGeocode(courtLat, courtLng, mapboxToken)
        if (geocodeResult) {
          address = geocodeResult.address
          addressType = geocodeResult.type
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
