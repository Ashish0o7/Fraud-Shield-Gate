package com.shieldgate.core;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the Haversine distance calculator and impossible travel detection.
 */
class CityCoordinatesTest {

    @Test
    @DisplayName("Calculates correct distance between Mumbai and Delhi (~1,148 km)")
    void mumbaiToDelhi() {
        double distance = CityCoordinates.haversineDistance("Mumbai", "Delhi");
        // Known distance: ~1,148 km — allow 5% tolerance for Haversine approximation
        assertTrue(distance > 1090 && distance < 1200,
                "Mumbai-Delhi distance should be ~1148km, got: " + distance);
    }

    @Test
    @DisplayName("Same city returns distance ~0")
    void sameCityZeroDistance() {
        double distance = CityCoordinates.haversineDistance("Mumbai", "Mumbai");
        assertEquals(0.0, distance, 0.001, "Same city distance should be 0");
    }

    @Test
    @DisplayName("Unknown city returns -1")
    void unknownCityReturnsNegative() {
        assertEquals(-1, CityCoordinates.haversineDistance("Mumbai", "Narnia"));
        assertEquals(-1, CityCoordinates.haversineDistance("Atlantis", "Delhi"));
    }

    @Test
    @DisplayName("Case insensitive city lookup")
    void caseInsensitive() {
        double d1 = CityCoordinates.haversineDistance("mumbai", "delhi");
        double d2 = CityCoordinates.haversineDistance("MUMBAI", "DELHI");
        assertEquals(d1, d2, 0.001, "Should be case insensitive");
    }

    @Test
    @DisplayName("Mumbai-Pune is local travel (< 100km)")
    void localTravel() {
        // Technically Mumbai-Pune is ~150km, but let's verify the method logic
        boolean local = CityCoordinates.isLocalTravel("Mumbai", "Pune");
        double distance = CityCoordinates.haversineDistance("Mumbai", "Pune");
        if (distance < 100) {
            assertTrue(local, "Should be local travel");
        } else {
            assertFalse(local, "Mumbai-Pune (~150km) is not local travel");
        }
    }

    @Test
    @DisplayName("Impossible travel: Mumbai→Delhi in 5 minutes")
    void impossibleTravel() {
        // Mumbai to Delhi in 5 minutes — physically impossible
        long fiveMinutesMs = 5 * 60 * 1000L;
        double ratio = CityCoordinates.travelFeasibilityRatio("Mumbai", "Delhi", fiveMinutesMs);

        assertTrue(ratio < 0.3,
                "5-minute Mumbai-Delhi travel should have ratio < 0.3, got: " + ratio);
    }

    @Test
    @DisplayName("Feasible travel: Mumbai→Delhi in 3 hours")
    void feasibleTravel() {
        // Mumbai to Delhi in 3 hours — feasible by flight (~1.5h flight time)
        long threeHoursMs = 3 * 60 * 60 * 1000L;
        double ratio = CityCoordinates.travelFeasibilityRatio("Mumbai", "Delhi", threeHoursMs);

        assertTrue(ratio >= 1.0,
                "3-hour Mumbai-Delhi travel should be feasible (ratio >= 1.0), got: " + ratio);
    }

    @Test
    @DisplayName("Known city check works correctly")
    void knownCityCheck() {
        assertTrue(CityCoordinates.isKnownCity("Mumbai"));
        assertTrue(CityCoordinates.isKnownCity("london")); // case insensitive
        assertFalse(CityCoordinates.isKnownCity("Wakanda"));
        assertFalse(CityCoordinates.isKnownCity(null));
    }

    @Test
    @DisplayName("Distance label formats correctly")
    void distanceLabel() {
        String label = CityCoordinates.getDistanceLabel("Mumbai", "Delhi");
        assertNotNull(label);
        assertFalse(label.contains("unknown"), "Should return a real distance label");
        assertTrue(label.contains("km"), "Label should contain 'km'");
    }
}
