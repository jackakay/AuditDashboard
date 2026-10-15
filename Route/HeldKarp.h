#pragma once

#include <vector>
#include <utility>
#include <limits>
#include <algorithm>
#include "DistanceMatrix.h"

class HeldKarp {
public:
    // Takes a 2D adjacency matrix of distances and returns {min_cost, optimal_route}
    HeldKarp() = delete;
    ~HeldKarp() = delete;
    static std::vector<std::pair<double, double>> solve(DistanceMatrix dist);
};