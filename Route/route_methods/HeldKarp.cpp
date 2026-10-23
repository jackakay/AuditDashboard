#include "HeldKarp.h"


// Takes a DistanceMatrix object, and outputs the fastest route.
std::vector<Audit> HeldKarp::solve(const DistanceMatrix& dist, const std::vector<Audit>& audits){ // guarantees optimality
    int n = dist.size();
    if (n <= 1) return {};
    
    const double INF = std::numeric_limits<double>::infinity();

    if (n == 2) {
        double t1 = dist.getTime(0, 1);
        double t2 = dist.getTime(1, 0);
        if (t1 == INF || t2 == INF) return {};
        return {audits[0], audits[1], audits[0]};
    }

    int num_states = 1 << n; // 2^n subsets

    // dp[mask][i] stores the minimum time to visit the subset 'mask' ending at city 'i'
    std::vector<std::vector<double>> memo(num_states, std::vector<double>(n, INF));
    
    // parent[mask][i] stores the previous city for path reconstruction
    std::vector<std::vector<int>> parent(num_states, std::vector<int>(n, -1));

    // Base case: start at city 0 (bit 0 is set, mask = 1)
    memo[1][0] = 0.0;

    // Iterate through all subset masks (only odd masks since starting city 0 is always included)
    for (int mask = 1; mask < num_states; mask += 2) {
        for (int u = 0; u < n; ++u) {
            if (!(mask & (1 << u))) continue;
            if (memo[mask][u] == INF) continue;

            // Try moving to a next unvisited city 'v'
            for (int v = 0; v < n; ++v) {
                if (!(mask & (1 << v))) {
                    double travelTime = dist.getTime(u, v);
                    if (travelTime == INF) continue;

                    int next_mask = mask | (1 << v);
                    double new_cost = memo[mask][u] + travelTime;

                    if (new_cost < memo[next_mask][v]) {
                        memo[next_mask][v] = new_cost;
                        parent[next_mask][v] = u;
                    }
                }
            }
        }
    }

    // Find the optimal last city before returning to start (0)
    int final_mask = num_states - 1;
    double minTotalTime = INF;
    int last_city = -1;

    for (int u = 1; u < n; ++u) {
        double returnTime = dist.getTime(u, 0);
        if (memo[final_mask][u] == INF || returnTime == INF) continue;

        double totalTime = memo[final_mask][u] + returnTime;
        if (totalTime < minTotalTime) {
            minTotalTime = totalTime;
            last_city = u;
        }
    }

    // If no valid loop could be completed
    if (minTotalTime == INF) return {};

    // Reconstruct the optimal sequence of indices
    std::vector<int> bestPathIndices;
    int curr_mask = final_mask;
    int curr_city = last_city;

    while (curr_city != 0) {
        bestPathIndices.push_back(curr_city);
        int prev_city = parent[curr_mask][curr_city];
        curr_mask ^= (1 << curr_city);
        curr_city = prev_city;
    }
    bestPathIndices.push_back(0); // Add start
    std::reverse(bestPathIndices.begin(), bestPathIndices.end());

    // Map the winning indices back to coordinates using dist
    std::vector<std::pair<double, double>> bestRouteCoords;
    std::vector<Audit> bestRoute;
    
    for (int idx : bestPathIndices) {
        bestRouteCoords.push_back(dist.getCoords(idx));
        bestRoute.push_back(audits[idx]);
    }
    // Complete the loop back to start
    bestRouteCoords.push_back(dist.getCoords(0));
    bestRoute.push_back(audits[0]);

    return bestRoute;
}
