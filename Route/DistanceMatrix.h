#pragma once

#include <vector>
#include <utility>
#include <stdexcept>
#include "utils/json.hpp"

class DistanceMatrix {
private:
    int numLocations;
    std::vector<std::vector<double>> durations;
    nlohmann::json destinations;

public:
    // Constructor accepts the root JSON response object from your routing API
    explicit DistanceMatrix(const nlohmann::json& jsonPayload) {
        if (!jsonPayload.contains("durations") || !jsonPayload.contains("destinations")) {
            throw std::invalid_argument("JSON payload is missing 'durations' or 'destinations'");
        }

        destinations = jsonPayload["destinations"];
        auto rawDurations = jsonPayload["durations"];
        
        numLocations = rawDurations.size();
        durations.assign(numLocations, std::vector<double>(numLocations, 0.0));

        // Safely parse the 2D duration matrix
        for (int i = 0; i < numLocations; ++i) {
            for (int j = 0; j < numLocations; ++j) {
                if (!rawDurations[i][j].is_null()) {
                    durations[i][j] = rawDurations[i][j].get<double>();
                } else {
                    durations[i][j] = 0.0; // Fallback for missing/null paths
                }
            }
        }
    }

    // Returns the total number of locations
    int size() const {
        return numLocations;
    }

    // Get travel time between two specific points
    double getTime(int from, int to) const {
        if (from < 0 || from >= numLocations || to < 0 || to >= numLocations) {
            throw std::out_of_range("DistanceMatrix index out of bounds");
        }
        return durations[from][to];
    }

    // Extracts {longitude, latitude} matching your lambda snippet
    std::pair<double, double> getCoords(int index) const {
        if (index < 0 || index >= numLocations) {
            throw std::out_of_range("Location index out of bounds");
        }
        double lon = destinations[index]["location"][0].get<double>();
        double lat = destinations[index]["location"][1].get<double>();
        return {lon, lat};
    }

    // Direct access to pass straight into HeldKarp::solve()
    const std::vector<std::vector<double>>& getRawMatrix() const {
        return durations;
    }
};