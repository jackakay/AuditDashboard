#include "NearestNeighbour.h"

std::vector<Audit> NearestNeighbour::solve(const DistanceMatrix& dist, const std::vector<Audit>& audits) {
    int n = dist.size();
    if (n <= 1) return {};
    
    const double INF = std::numeric_limits<double>::infinity();

    std::vector<bool> visited(n, false);
    std::vector<Audit> route;
    int current = 0; // Start from the first audit
    route.push_back(audits[current]);
    visited[current] = true;

    for (int i = 1; i < n; ++i) {
        double min_time = INF;
        int next_audit = -1;

        for (int j = 0; j < n; ++j) {
            if (!visited[j]) {
                double travel_time = dist.getTime(current, j);
                if (travel_time < min_time) {
                    min_time = travel_time;
                    next_audit = j;
                }
            }
        }

        if (next_audit == -1 || min_time == INF) {
            // No unvisited audits left or no valid path
            return {};
        }

        route.push_back(audits[next_audit]);
        visited[next_audit] = true;
        current = next_audit;
    }

    // Return to the starting audit
    route.push_back(audits[0]);

    return route;
}