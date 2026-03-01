package com.shieldgate.core;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility class for city geolocation and geodesic distance calculations.
 * Used by the Impossible Travel rule to determine if a user could have
 * physically traveled between two cities in the given time window.
 *
 * Uses the Haversine formula for great-circle distance on Earth's surface.
 */
public class CityCoordinates {

    private static final double EARTH_RADIUS_KM = 6371.0;

    /** Assumed max speed: fastest commercial flight ~800 km/h */
    private static final double MAX_TRAVEL_SPEED_KMH = 800.0;

    /** Below this distance, consider it local travel (no penalty) */
    private static final double LOCAL_DISTANCE_KM = 100.0;

    private static final Map<String, double[]> CITY_MAP = new HashMap<>();

    static {
        // Major Indian cities: {latitude, longitude}
        CITY_MAP.put("MUMBAI", new double[] { 19.0760, 72.8777 });
        CITY_MAP.put("DELHI", new double[] { 28.6139, 77.2090 });
        CITY_MAP.put("BANGALORE", new double[] { 12.9716, 77.5946 });
        CITY_MAP.put("CHENNAI", new double[] { 13.0827, 80.2707 });
        CITY_MAP.put("KOLKATA", new double[] { 22.5726, 88.3639 });
        CITY_MAP.put("HYDERABAD", new double[] { 17.3850, 78.4867 });
        CITY_MAP.put("PUNE", new double[] { 18.5204, 73.8567 });
        CITY_MAP.put("AHMEDABAD", new double[] { 23.0225, 72.5714 });
        CITY_MAP.put("JAIPUR", new double[] { 26.9124, 75.7873 });
        CITY_MAP.put("LUCKNOW", new double[] { 26.8467, 80.9462 });
        // International cities for broader coverage
        CITY_MAP.put("LONDON", new double[] { 51.5074, -0.1278 });
        CITY_MAP.put("NEW YORK", new double[] { 40.7128, -74.0060 });
        CITY_MAP.put("SINGAPORE", new double[] { 1.3521, 103.8198 });
        CITY_MAP.put("DUBAI", new double[] { 25.2048, 55.2708 });
        CITY_MAP.put("TOKYO", new double[] { 35.6762, 139.6503 });
    }

    /**
     * Checks if a city is in our known coordinates database.
     */
    public static boolean isKnownCity(String city) {
        return city != null && CITY_MAP.containsKey(city.toUpperCase().trim());
    }

    /**
     * Calculates the Haversine (great-circle) distance between two cities in
     * kilometers.
     *
     * @return distance in km, or -1 if either city is unknown
     */
    public static double haversineDistance(String city1, String city2) {
        double[] c1 = CITY_MAP.get(city1.toUpperCase().trim());
        double[] c2 = CITY_MAP.get(city2.toUpperCase().trim());
        if (c1 == null || c2 == null)
            return -1;

        double lat1 = Math.toRadians(c1[0]);
        double lat2 = Math.toRadians(c2[0]);
        double dLat = Math.toRadians(c2[0] - c1[0]);
        double dLon = Math.toRadians(c2[1] - c1[1]);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2)
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }

    /**
     * Calculates minimum possible travel time between two cities in hours,
     * assuming fastest commercial air travel (800 km/h).
     *
     * @return hours required, or -1 if either city is unknown
     */
    public static double minimumTravelTimeHours(String city1, String city2) {
        double distance = haversineDistance(city1, city2);
        if (distance < 0)
            return -1;
        return distance / MAX_TRAVEL_SPEED_KMH;
    }

    /**
     * Determines if the two cities are close enough to be considered "local travel"
     * (within 100km — e.g., Mumbai to Pune commute).
     */
    public static boolean isLocalTravel(String city1, String city2) {
        double distance = haversineDistance(city1, city2);
        return distance >= 0 && distance < LOCAL_DISTANCE_KM;
    }

    /**
     * Computes the travel feasibility ratio: actual_time / minimum_required_time.
     * - ratio < 0.3 → physically impossible
     * - ratio 0.3–0.7 → highly unlikely
     * - ratio 0.7–1.0 → suspicious
     * - ratio >= 1.0 → feasible
     *
     * @param city1        origin city
     * @param city2        destination city
     * @param actualTimeMs actual time difference in milliseconds
     * @return ratio, or -1 if cities unknown
     */
    public static double travelFeasibilityRatio(String city1, String city2, long actualTimeMs) {
        double minHours = minimumTravelTimeHours(city1, city2);
        if (minHours <= 0)
            return -1;
        double actualHours = actualTimeMs / (1000.0 * 60.0 * 60.0);
        return actualHours / minHours;
    }

    /**
     * Gets the straight-line distance between two cities for display purposes.
     *
     * @return formatted distance string, e.g. "1,148 km"
     */
    public static String getDistanceLabel(String city1, String city2) {
        double distance = haversineDistance(city1, city2);
        if (distance < 0)
            return "unknown distance";
        return String.format("%,.0f km", distance);
    }
}
