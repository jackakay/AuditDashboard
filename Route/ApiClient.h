#pragma once

#include <string>
#include <vector>
#include <stdexcept>
#include <cstdio>

#include "utils/httplib.h"
#include "utils/json.hpp"
#include "DistanceMatrix.h"
#include "Audit.h"
#include "Utils.h"

#include "route_methods/HeldKarp.h"
#include "route_methods/NearestNeighbour.h"
#include "route_methods/BruteForce.h"


using json = nlohmann::json;

enum RouteType {
    NEAREST_NEIGHBOUR,
    BRUTE_FORCE,
    HELD_KARP
};

enum Address{
    HOME,
    TERM
};

struct CognitoTokens {
    std::string access_token;
    std::string id_token;
    std::string refresh_token;
};

class ApiClient {
public:
    explicit ApiClient(const std::string& host);
    float getTotalMoneyEarnt(bool pending, const std::string& bearerToken);
    std::string getName(const std::string& bearerToken);
    std::vector<Audit> getRoute(const RouteType route, const std::string& bearerToken, const std::string audits, const Address addressType);
    
    CognitoTokens authenticate(const std::string& username, const std::string& password) const;
    std::string login(const std::string& username, const std::string& password);

private:
    httplib::Client cli;
    httplib::Headers buildHeaders(const std::string& bearer) const;
    json convertCoordinatesToJson(const std::vector<Audit> audits) const;
    json getDistanceMatrix(const json& body) const;
    
    

    std::string convertRouteToGoogleMapsLink(const std::vector<Audit>& route) const;
    std::string runPythonAuth(const std::string& username, const std::string& password) const;
    bool isAuthenticated() const;
    Audit getStartingLocation(const std::string& bearerToken, Address addressType);
    DistanceMatrix getMatrix(const json& body) const;
    
};