// Haversine distance formula (returns miles by default)
export function getDistance(lat1, lon1, lat2, lon2, unit = 'miles') {
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

// Keywords that indicate multi-family/apartment housing
export const multiFamilyKeywords = [
  'apartment', 'apartments', 'apt', 'apts',
  'condo', 'condos', 'condominium', 'condominiums',
  'complex', 'community', // when combined with residential context
  'townhome', 'townhomes', 'townhouse', 'townhouses',
  'villa', 'villas',
  'loft', 'lofts',
  'manor',
  'terrace',
  'residences', // plural often indicates multi-family
  'commons',
  'landing',
  'pointe', 'point', // common in apartment names
  'crossing',
  'place' // when part of complex name
]

// Check if text contains multi-family housing indicators
export function isMultiFamilyText(text) {
  const lowerText = text.toLowerCase()
  return multiFamilyKeywords.some(k => lowerText.includes(k))
}

// Keywords that indicate a private club from POI/address names
export const clubPoiKeywords = [
  'country club', 'countryclub',
  'tennis club', 'tennisclub',
  'golf club', 'golfclub',
  'swim club', 'swimclub',
  'athletic club', 'athleticclub',
  'racquet club', 'racquetclub',
  'sports club', 'sportsclub',
  'yacht club', 'yachtclub',
  'beach club', 'beachclub',
  'fitness club', 'fitnessclub',
  'health club', 'healthclub',
  'club house', 'clubhouse',
  ' cc', // e.g., "Westwood CC"
  'resort',
  'hotel'
]

// Check if text contains club indicators
export function isClubText(text) {
  const lowerText = text.toLowerCase()
  return clubPoiKeywords.some(k => lowerText.includes(k))
}

// Classify court type based on OSM tags
export function classifyCourt(tags, addressInfo = null) {
  const access = tags.access?.toLowerCase() || ''
  const leisure = tags.leisure?.toLowerCase() || ''
  const name = (tags.name || '').toLowerCase()
  const operator = (tags.operator || '').toLowerCase()
  const amenity = (tags.amenity || '').toLowerCase()
  const landuse = (tags.landuse || '').toLowerCase()
  const ownership = (tags.ownership || '').toLowerCase()
  const building = (tags.building || '').toLowerCase()
  const residential = (tags.residential || '').toLowerCase()

  // Keywords that indicate public facilities
  const publicKeywords = ['park', 'school', 'recreation', 'community', 'municipal', 'city', 'county', 'state', 'public', 'district', 'university', 'college', 'high school', 'middle school', 'elementary', 'academy', 'ymca', 'ywca', 'civic', 'township']

  // Keywords that indicate private clubs
  const clubKeywords = ['club', 'country', 'tennis center', 'tennis centre', 'racquet', 'racket', 'athletic', 'fitness', 'resort', 'hotel', 'swim', 'golf']

  // Keywords that indicate private residential (single-family)
  const privateKeywords = ['private', 'residence', 'home', 'estate']

  // Combine all text fields to search
  const allText = `${name} ${operator} ${tags.description || ''}`.toLowerCase()

  // Also check address/POI info from reverse geocoding
  const addressText = addressInfo?.poiName || ''

  // Check for multi-family indicators in OSM tags
  const hasMultiFamilyTags = (
    building === 'apartments' ||
    building === 'residential' && residential === 'apartments' ||
    residential === 'apartments' ||
    landuse === 'residential' && isMultiFamilyText(allText)
  )

  // Check for multi-family in name/operator or address
  const hasMultiFamilyName = isMultiFamilyText(allText) || isMultiFamilyText(addressText)

  // 1. Check explicit access tags first (most reliable)
  if (access === 'private') {
    if (clubKeywords.some(k => allText.includes(k))) {
      return { type: 'club', verified: true }
    }
    // Check if it's multi-family private
    if (hasMultiFamilyTags || hasMultiFamilyName) {
      return { type: 'multi-family', verified: true }
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
    if (hasMultiFamilyTags || hasMultiFamilyName) {
      return { type: 'multi-family', verified: true }
    }
    return { type: 'private', verified: true }
  }

  // 5. Check name and operator for keywords
  if (clubKeywords.some(k => allText.includes(k))) {
    return { type: 'club', verified: false }
  }

  if (publicKeywords.some(k => allText.includes(k))) {
    // But if it also has multi-family indicators, it might be an apartment "community"
    if (hasMultiFamilyName && !allText.includes('park') && !allText.includes('school')) {
      return { type: 'multi-family', verified: false }
    }
    return { type: 'public', verified: false }
  }

  // Check for multi-family before generic private
  if (hasMultiFamilyTags || hasMultiFamilyName) {
    return { type: 'multi-family', verified: false }
  }

  if (privateKeywords.some(k => allText.includes(k))) {
    return { type: 'private', verified: false }
  }

  // 6. Default: If no indicators, mark as public (unverified) since most
  // unmarked courts in OSM are at public facilities that weren't fully tagged.
  // Private residential courts are rare and usually explicitly tagged.
  return { type: 'public', verified: false }
}

// Re-classify a court based on reverse geocoding results
// This helps detect clubs and multi-family from POI names
export function reclassifyWithAddress(currentType, verified, addressInfo) {
  const poiName = addressInfo?.poiName || ''
  const address = addressInfo?.address || ''
  const textToCheck = `${poiName} ${address}`

  // Check for club indicators - reclassify unverified public or private to club
  if ((currentType === 'public' && !verified) || currentType === 'private') {
    if (isClubText(textToCheck)) {
      return { type: 'club', verified: false }
    }
  }

  // Check for multi-family indicators
  if (currentType === 'private' && isMultiFamilyText(textToCheck)) {
    return { type: 'multi-family', verified }
  }
  if (currentType === 'public' && !verified && isMultiFamilyText(textToCheck)) {
    return { type: 'multi-family', verified: false }
  }

  return { type: currentType, verified }
}

// Cluster nearby courts of the same type to avoid duplicate listings
// (e.g., a club with 6 courts should show as 1 result, not 6)
const CLUSTER_DISTANCE_METERS = 50 // Default for public courts
const CLUB_CLUSTER_DISTANCE_METERS = 150 // Larger distance for clubs (spread across property)

export function clusterCourts(courts) {
  if (courts.length === 0) return []

  const clustered = []
  const used = new Set()

  for (let i = 0; i < courts.length; i++) {
    if (used.has(i)) continue

    const court = courts[i]
    const cluster = [court]
    used.add(i)

    // Skip clustering for private residential and multi-family courts
    // - Private: neighboring houses could each have their own court
    // - Multi-family: different apartment complexes shouldn't be merged
    if (court.type === 'private' || court.type === 'multi-family') {
      clustered.push({ ...court, courtCount: 1 })
      continue
    }

    // Use larger clustering distance for clubs (courts spread across property)
    const clusterDistance = court.type === 'club' ? CLUB_CLUSTER_DISTANCE_METERS : CLUSTER_DISTANCE_METERS

    // Find all nearby courts of the same type (clubs and public only)
    for (let j = i + 1; j < courts.length; j++) {
      if (used.has(j)) continue

      const other = courts[j]

      // Must be same type to cluster
      if (other.type !== court.type) continue

      // Check if within clustering distance
      const distMeters = getDistance(court.lat, court.lng, other.lat, other.lng, 'meters')

      if (distMeters <= clusterDistance) {
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

// Distance threshold for associating courts with nearby club features (meters)
export const CLUB_ASSOCIATION_DISTANCE_METERS = 200

// Check if a court is near any known club feature
export function findNearbyClub(courtLat, courtLng, clubFeatures) {
  for (const club of clubFeatures) {
    if (!club.lat || !club.lng) continue
    const distanceMeters = getDistance(courtLat, courtLng, club.lat, club.lng, 'meters')
    if (distanceMeters <= CLUB_ASSOCIATION_DISTANCE_METERS) {
      return club
    }
  }
  return null
}

// Distance threshold for associating courts with nearby apartment buildings (meters)
export const MULTIFAMILY_ASSOCIATION_DISTANCE_METERS = 100

// Check if a court is near any known multi-family building
export function findNearbyMultiFamily(courtLat, courtLng, multiFamilyFeatures) {
  for (const building of multiFamilyFeatures) {
    if (!building.lat || !building.lng) continue
    const distanceMeters = getDistance(courtLat, courtLng, building.lat, building.lng, 'meters')
    if (distanceMeters <= MULTIFAMILY_ASSOCIATION_DISTANCE_METERS) {
      return building
    }
  }
  return null
}
