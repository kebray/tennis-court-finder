import { describe, it, expect } from 'vitest'
import {
  getDistance,
  isMultiFamilyText,
  isClubText,
  classifyCourt,
  reclassifyWithAddress,
  clusterCourts,
  findNearbyClub,
  findNearbyMultiFamily
} from './court-utils.js'

describe('getDistance', () => {
  it('returns 0 for same coordinates', () => {
    expect(getDistance(30.2672, -97.7431, 30.2672, -97.7431)).toBe(0)
  })

  it('calculates distance in miles correctly', () => {
    // Austin to Dallas is approximately 195 miles
    const distance = getDistance(30.2672, -97.7431, 32.7767, -96.7970, 'miles')
    expect(distance).toBeGreaterThan(180)
    expect(distance).toBeLessThan(210)
  })

  it('calculates distance in meters correctly', () => {
    // Two points about 1km apart
    const distance = getDistance(30.2672, -97.7431, 30.2762, -97.7431, 'meters')
    expect(distance).toBeGreaterThan(900)
    expect(distance).toBeLessThan(1100)
  })
})

describe('isMultiFamilyText', () => {
  it('detects apartment keywords', () => {
    expect(isMultiFamilyText('Sunset Apartments')).toBe(true)
    expect(isMultiFamilyText('Oak Ridge Apt Complex')).toBe(true)
  })

  it('detects condo keywords', () => {
    expect(isMultiFamilyText('Lakeside Condominiums')).toBe(true)
    expect(isMultiFamilyText('Park Place Condos')).toBe(true)
  })

  it('detects townhome keywords', () => {
    expect(isMultiFamilyText('River Townhomes')).toBe(true)
    expect(isMultiFamilyText('Downtown Townhouse Community')).toBe(true)
  })

  it('returns false for regular addresses', () => {
    expect(isMultiFamilyText('123 Main Street')).toBe(false)
    expect(isMultiFamilyText('456 Oak Lane')).toBe(false)
  })

  it('returns false for public facility names', () => {
    expect(isMultiFamilyText('Central Park')).toBe(false)
    expect(isMultiFamilyText('Lincoln High School')).toBe(false)
  })
})

describe('isClubText', () => {
  it('detects country club', () => {
    expect(isClubText('Westwood Country Club')).toBe(true)
    expect(isClubText('Austin Country Club')).toBe(true)
  })

  it('detects tennis club', () => {
    expect(isClubText('Downtown Tennis Club')).toBe(true)
  })

  it('detects other club types', () => {
    expect(isClubText('Lakeside Swim Club')).toBe(true)
    expect(isClubText('Athletic Club of Austin')).toBe(true)
    expect(isClubText('The Clubhouse')).toBe(true)
  })

  it('detects resorts and hotels', () => {
    expect(isClubText('Hyatt Resort')).toBe(true)
    expect(isClubText('Grand Hotel')).toBe(true)
  })

  it('returns false for regular addresses', () => {
    expect(isClubText('123 Main Street')).toBe(false)
    expect(isClubText('456 Oak Lane')).toBe(false)
  })

  it('returns false for parks and schools', () => {
    expect(isClubText('Central Park')).toBe(false)
    expect(isClubText('Austin High School')).toBe(false)
  })

  // Important: should NOT match "country" without "club"
  it('does not match standalone "country" in POI keywords', () => {
    // Note: isClubText uses clubPoiKeywords which requires "country club" together
    expect(isClubText('Hill Country Golf Course')).toBe(false)
  })
})

describe('classifyCourt', () => {
  it('classifies public access as public verified', () => {
    const result = classifyCourt({ access: 'public' })
    expect(result.type).toBe('public')
    expect(result.verified).toBe(true)
  })

  it('classifies private access as private verified', () => {
    const result = classifyCourt({ access: 'private' })
    expect(result.type).toBe('private')
    expect(result.verified).toBe(true)
  })

  it('classifies members access as club verified', () => {
    const result = classifyCourt({ access: 'members' })
    expect(result.type).toBe('club')
    expect(result.verified).toBe(true)
  })

  it('classifies schools as public', () => {
    const result = classifyCourt({ amenity: 'school' })
    expect(result.type).toBe('public')
    expect(result.verified).toBe(true)
  })

  it('classifies parks as public', () => {
    const result = classifyCourt({ name: 'Central Park Tennis Courts' })
    expect(result.type).toBe('public')
    expect(result.verified).toBe(false)
  })

  it('classifies clubs by name', () => {
    const result = classifyCourt({ name: 'Westwood Country Club' })
    expect(result.type).toBe('club')
    expect(result.verified).toBe(false)
  })

  it('defaults to public unverified for unknown courts', () => {
    const result = classifyCourt({ leisure: 'pitch', sport: 'tennis' })
    expect(result.type).toBe('public')
    expect(result.verified).toBe(false)
  })

  it('classifies apartment building courts as multi-family', () => {
    const result = classifyCourt({ building: 'apartments' })
    expect(result.type).toBe('multi-family')
    expect(result.verified).toBe(false)
  })

  it('classifies private access with club name as club', () => {
    const result = classifyCourt({ access: 'private', name: 'Tennis Club' })
    expect(result.type).toBe('club')
    expect(result.verified).toBe(true)
  })

  it('classifies private access with apartment name as multi-family', () => {
    const result = classifyCourt({ access: 'private', name: 'Lakeside Apartments' })
    expect(result.type).toBe('multi-family')
    expect(result.verified).toBe(true)
  })
})

describe('reclassifyWithAddress', () => {
  it('reclassifies unverified public to club based on POI name', () => {
    const result = reclassifyWithAddress('public', false, { poiName: 'Country Club of Austin' })
    expect(result.type).toBe('club')
  })

  it('reclassifies private to multi-family based on address', () => {
    const result = reclassifyWithAddress('private', true, { address: 'Sunset Apartments, Austin TX' })
    expect(result.type).toBe('multi-family')
  })

  it('does not reclassify verified public', () => {
    const result = reclassifyWithAddress('public', true, { poiName: 'Country Club of Austin' })
    expect(result.type).toBe('public')
  })

  it('keeps type if no indicators found', () => {
    const result = reclassifyWithAddress('public', false, { address: '123 Main St' })
    expect(result.type).toBe('public')
  })
})

describe('clusterCourts', () => {
  it('returns empty array for empty input', () => {
    expect(clusterCourts([])).toEqual([])
  })

  it('does not cluster private residential courts', () => {
    const courts = [
      { id: '1', lat: 30.2672, lng: -97.7431, type: 'private', distance: 1 },
      { id: '2', lat: 30.2673, lng: -97.7432, type: 'private', distance: 1 } // Very close
    ]
    const result = clusterCourts(courts)
    expect(result.length).toBe(2)
    expect(result[0].courtCount).toBe(1)
    expect(result[1].courtCount).toBe(1)
  })

  it('does not cluster multi-family courts', () => {
    const courts = [
      { id: '1', lat: 30.2672, lng: -97.7431, type: 'multi-family', distance: 1 },
      { id: '2', lat: 30.2673, lng: -97.7432, type: 'multi-family', distance: 1 }
    ]
    const result = clusterCourts(courts)
    expect(result.length).toBe(2)
  })

  it('clusters nearby public courts', () => {
    const courts = [
      { id: '1', lat: 30.2672, lng: -97.7431, type: 'public', distance: 1 },
      { id: '2', lat: 30.26725, lng: -97.74315, type: 'public', distance: 1 } // ~10m away
    ]
    const result = clusterCourts(courts)
    expect(result.length).toBe(1)
    expect(result[0].courtCount).toBe(2)
  })

  it('clusters nearby club courts with larger distance', () => {
    // Clubs use 150m clustering distance
    const courts = [
      { id: '1', lat: 30.2672, lng: -97.7431, type: 'club', distance: 1 },
      { id: '2', lat: 30.2682, lng: -97.7431, type: 'club', distance: 1 } // ~111m away (within 150m)
    ]
    const result = clusterCourts(courts)
    expect(result.length).toBe(1)
    expect(result[0].courtCount).toBe(2)
  })

  it('does not cluster courts of different types', () => {
    const courts = [
      { id: '1', lat: 30.2672, lng: -97.7431, type: 'public', distance: 1 },
      { id: '2', lat: 30.26725, lng: -97.74315, type: 'club', distance: 1 }
    ]
    const result = clusterCourts(courts)
    expect(result.length).toBe(2)
  })

  it('does not cluster courts that are too far apart', () => {
    const courts = [
      { id: '1', lat: 30.2672, lng: -97.7431, type: 'public', distance: 1 },
      { id: '2', lat: 30.2700, lng: -97.7431, type: 'public', distance: 1 } // ~300m away
    ]
    const result = clusterCourts(courts)
    expect(result.length).toBe(2)
  })
})

describe('findNearbyClub', () => {
  const clubFeatures = [
    { lat: 30.2672, lng: -97.7431, name: 'Westwood Country Club' },
    { lat: 30.3000, lng: -97.7000, name: 'Austin Tennis Club' }
  ]

  it('finds club within 200m', () => {
    // Court very close to Westwood
    const result = findNearbyClub(30.2673, -97.7432, clubFeatures)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Westwood Country Club')
  })

  it('returns null for court far from clubs', () => {
    // Court far from any club
    const result = findNearbyClub(30.4000, -97.8000, clubFeatures)
    expect(result).toBeNull()
  })

  it('handles empty club features', () => {
    const result = findNearbyClub(30.2672, -97.7431, [])
    expect(result).toBeNull()
  })

  it('skips club features with missing coordinates', () => {
    const invalidClubs = [
      { name: 'No Coords Club' },
      { lat: 30.2672, lng: -97.7431, name: 'Valid Club' }
    ]
    const result = findNearbyClub(30.2673, -97.7432, invalidClubs)
    expect(result.name).toBe('Valid Club')
  })
})

describe('findNearbyMultiFamily', () => {
  const multiFamilyFeatures = [
    { lat: 30.2672, lng: -97.7431, name: 'Sunset Apartments' },
    { lat: 30.3000, lng: -97.7000, name: 'Oak Ridge Condos' }
  ]

  it('finds apartment building within 100m', () => {
    // Court very close to Sunset Apartments
    const result = findNearbyMultiFamily(30.2673, -97.7432, multiFamilyFeatures)
    expect(result).not.toBeNull()
    expect(result.name).toBe('Sunset Apartments')
  })

  it('returns null for court far from apartments', () => {
    const result = findNearbyMultiFamily(30.4000, -97.8000, multiFamilyFeatures)
    expect(result).toBeNull()
  })

  it('handles empty multi-family features', () => {
    const result = findNearbyMultiFamily(30.2672, -97.7431, [])
    expect(result).toBeNull()
  })
})

// Integration-style tests to catch common errors
describe('Integration tests', () => {
  it('full classification pipeline works', () => {
    // Simulate a court from Overpass API
    const osmTags = {
      leisure: 'pitch',
      sport: 'tennis'
    }

    // Initial classification
    let { type, verified } = classifyCourt(osmTags)
    expect(type).toBe('public')
    expect(verified).toBe(false)

    // Simulate reverse geocode result indicating a country club
    const addressInfo = {
      address: '3808 W 35th St, Austin TX',
      poiName: 'Westwood Country Club'
    }

    // Reclassify with address
    const reclassified = reclassifyWithAddress(type, verified, addressInfo)
    expect(reclassified.type).toBe('club')
  })

  it('apartment court classification pipeline works', () => {
    const osmTags = {
      leisure: 'pitch',
      sport: 'tennis'
    }

    let { type, verified } = classifyCourt(osmTags)
    expect(type).toBe('public')

    // No club nearby
    const clubFeatures = []
    const nearbyClub = findNearbyClub(30.2672, -97.7431, clubFeatures)
    expect(nearbyClub).toBeNull()

    // But there's an apartment building nearby
    const multiFamilyFeatures = [
      { lat: 30.2672, lng: -97.7431, name: 'Parkside Apartments' }
    ]
    const nearbyApt = findNearbyMultiFamily(30.2673, -97.7432, multiFamilyFeatures)
    expect(nearbyApt).not.toBeNull()
    // Would be reclassified to multi-family
  })
})
