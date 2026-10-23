#include "BruteForce.h"

std::vector<Audit> BruteForce::solve(const DistanceMatrix& dist, const std::vector<Audit>& audits){
    // Index 0 is strictly reserved as the start and end
    int numLocations = dist.size();
    if (numLocations <= 1) return {};

    std::vector<int> middleStops(numLocations - 1);
    std::iota(middleStops.begin(), middleStops.end(), 1); // Fills with 1, 2, ..., n-1

    double minimumDuration = std::numeric_limits<double>::max();
    std::vector<int> bestPathIndices;
    const double INF = std::numeric_limits<double>::infinity();

    // Brute-force through all possible middle stop permutations
    do {
        double currentDuration = 0.0;
        bool validPath = true;

        // A. Cost from Start (0) to the first middle stop
        double firstLeg = dist.getTime(0, middleStops[0]);
        if (firstLeg == INF) continue;
        currentDuration += firstLeg;

        // B. Cost between all intermediate middle stops
        for (size_t i = 0; i < middleStops.size() - 1; ++i) {
            double leg = dist.getTime(middleStops[i], middleStops[i + 1]);
            if (leg == INF) {
                validPath = false;
                break;
            }
            currentDuration += leg;
        }
        if (!validPath) continue;

        // C. Cost from the last middle stop back to Start (0)
        double lastLeg = dist.getTime(middleStops.back(), 0);
        if (lastLeg == INF) continue;
        currentDuration += lastLeg;

        // Check if this permutation is the absolute fastest round trip
        if (currentDuration < minimumDuration) {
            minimumDuration = currentDuration;
            bestPathIndices = middleStops;
        }

    } while (std::next_permutation(middleStops.begin(), middleStops.end()));

    // If no valid loop could be completed
    if (minimumDuration == INF) return {};

    // 3. Reconstruct the final route coordinates using m's methods
    
    std::vector<Audit> bestRoute;
    // Add Start Location
   
    bestRoute.push_back(audits[0]);

    // Add winning middle stops in their optimal order
    for (int idx : bestPathIndices) {
        
        bestRoute.push_back(audits[idx]);
    }

    // Add End Location (same as Start)
    
    bestRoute.push_back(audits[0]);


    //We could instead return a vector of the index of the audits?
    return bestRoute;
}