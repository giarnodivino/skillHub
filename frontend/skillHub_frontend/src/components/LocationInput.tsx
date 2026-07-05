import { useEffect, useId, useState } from "react";

type LocationSuggestion = {
  id: string;
  label: string;
  latitude: string;
  longitude: string;
};

type LocationInputProps = {
  value: string;
  latitude?: string | null;
  longitude?: string | null;
  onChange: (location: { label: string; latitude: string | null; longitude: string | null }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

type MapboxFeature = {
  id?: string;
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    full_address?: string;
    name?: string;
    place_formatted?: string;
  };
};

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

function getSuggestionLabel(feature: MapboxFeature) {
  const name = feature.properties?.name ?? "";
  const place = feature.properties?.place_formatted ?? "";
  return feature.properties?.full_address ?? [name, place].filter(Boolean).join(", ");
}

export default function LocationInput({
  value,
  latitude,
  longitude,
  onChange,
  placeholder = "Search for a location",
  required = false,
  className = "",
}: LocationInputProps) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (!mapboxToken || query.length < 3 || (latitude && longitude)) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const params = new URLSearchParams({
          q: query,
          access_token: mapboxToken,
          autocomplete: "true",
          limit: "5",
          country: "ph",
          types: "address,street,place,locality,neighborhood",
        });
        const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { features?: MapboxFeature[] };
        const nextSuggestions =
          data.features
            ?.map((feature) => {
              const coordinates = feature.geometry?.coordinates;
              const label = getSuggestionLabel(feature);

              if (!coordinates || !label) {
                return null;
              }

              return {
                id: feature.id ?? `${coordinates[0]}-${coordinates[1]}-${label}`,
                label,
                longitude: coordinates[0].toFixed(6),
                latitude: coordinates[1].toFixed(6),
              };
            })
            .filter((suggestion): suggestion is LocationSuggestion => Boolean(suggestion)) ?? [];

        setSuggestions(nextSuggestions);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [latitude, longitude, value]);

  const hasSelectedCoordinates = Boolean(latitude && longitude);

  return (
    <div className="relative">
      <input
        required={required}
        value={value}
        onChange={(event) => onChange({ label: event.target.value, latitude: null, longitude: null })}
        placeholder={placeholder}
        aria-describedby={`${listId}-status`}
        className={className}
      />

      {suggestions.length > 0 ? (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => {
                onChange({
                  label: suggestion.label,
                  latitude: suggestion.latitude,
                  longitude: suggestion.longitude,
                });
                setSuggestions([]);
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      ) : null}

      <p id={`${listId}-status`} className="mt-1 text-xs text-slate-500">
        {hasSelectedCoordinates
          ? "Exact location selected."
          : isSearching
            ? "Searching locations..."
            : mapboxToken
              ? "Choose a suggestion to enable radius matching."
              : "Add VITE_MAPBOX_ACCESS_TOKEN to enable real location suggestions."}
      </p>
    </div>
  );
}
