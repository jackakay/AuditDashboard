#pragma once

#include <vector>
#include <utility>
#include <limits>
#include <algorithm>
#include "../DistanceMatrix.h"
#include "../Audit.h"

class HeldKarp {
public:
    // Takes a 2D adjacency matrix of distances and returns {min_cost, optimal_route}
    HeldKarp() = delete;
    ~HeldKarp() = delete;
    static std::vector<Audit> solve(const DistanceMatrix& dist, const std::vector<Audit>& audits);
};