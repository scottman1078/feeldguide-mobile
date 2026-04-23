import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { MapPin } from 'lucide-react-native'
import { colors } from '../lib/colors'

// IMPORTANT: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY must be set in .env and in EAS secrets.

export interface PlaceResult {
  city: string
  state: string
  zip: string
  lat: number | null
  lng: number | null
  formattedAddress: string
}

interface Prediction {
  place_id: string
  description: string
}

interface PlacesAutocompleteProps {
  value: string
  onChange: (place: PlaceResult) => void
  placeholder?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePlaceResult(place: any): PlaceResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: any[] = place.address_components || []
  let city = ''
  let state = ''
  let zip = ''

  for (const c of components) {
    const types: string[] = c.types || []
    if (types.includes('locality')) {
      city = c.long_name
    } else if (types.includes('sublocality_level_1') && !city) {
      city = c.long_name
    }
    if (types.includes('administrative_area_level_1')) {
      state = c.short_name
    }
    if (types.includes('postal_code')) {
      zip = c.long_name
    }
  }

  const loc = place.geometry?.location
  const lat = typeof loc?.lat === 'number' ? loc.lat : null
  const lng = typeof loc?.lng === 'number' ? loc.lng : null

  return {
    city,
    state,
    zip,
    lat,
    lng,
    formattedAddress: place.formatted_address || `${city}, ${state}`,
  }
}

export function PlacesAutocomplete({ value, onChange, placeholder = 'Search city...' }: PlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(0)
  const [failed, setFailed] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!apiKey) {
        setFailed(1)
        return
      }
      if (!input.trim()) {
        setPredictions([])
        return
      }
      try {
        setLoading(1)
        const url =
          `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
          `?input=${encodeURIComponent(input)}` +
          `&types=(cities)&components=country:us&key=${apiKey}`
        const res = await fetch(url)
        const data = await res.json()
        if (data.status === 'OK' && Array.isArray(data.predictions)) {
          setPredictions(
            data.predictions.map((p: { place_id: string; description: string }) => ({
              place_id: p.place_id,
              description: p.description,
            }))
          )
        } else {
          setPredictions([])
        }
      } catch {
        setPredictions([])
      } finally {
        setLoading(0)
      }
    },
    [apiKey]
  )

  const handleTextChange = (text: string) => {
    setInputValue(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPredictions(text)
    }, 300)
  }

  const handleSelect = useCallback(
    async (prediction: Prediction) => {
      if (!apiKey) return
      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/details/json` +
          `?place_id=${prediction.place_id}` +
          `&fields=address_components,formatted_address,geometry` +
          `&key=${apiKey}`
        const res = await fetch(url)
        const data = await res.json()
        if (data.status === 'OK' && data.result) {
          const parsed = parsePlaceResult(data.result)
          setInputValue(parsed.formattedAddress)
          setPredictions([])
          onChange(parsed)
        }
      } catch {
        // swallow — predictions stay open for another try
      }
    },
    [apiKey, onChange]
  )

  if (failed) {
    return (
      <View>
        <Text style={{ fontSize: 12, color: colors.destructive }}>
          Location search unavailable. Check EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
        </Text>
      </View>
    )
  }

  return (
    <View>
      <View style={{ position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            left: 12,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <MapPin size={16} color={colors.textMuted} />
        </View>
        <TextInput
          value={inputValue}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="words"
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingLeft: 36,
            paddingRight: 12,
            paddingVertical: 12,
            fontSize: 15,
            color: colors.textPrimary,
          }}
        />
        {loading ? (
          <View
            style={{
              position: 'absolute',
              right: 12,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="small" color={colors.teal} />
          </View>
        ) : null}
      </View>

      {predictions.length > 0 && (
        <View
          style={{
            marginTop: 6,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {predictions.map((p, idx) => (
            <TouchableOpacity
              key={p.place_id}
              onPress={() => handleSelect(p)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <MapPin size={14} color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textPrimary, flex: 1 }}>{p.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}
