#pragma once
#include "httplib.h"
#include "json.hpp"
#include <string>
#include <vector>
#include <stdexcept>
#include <cstdio>


using json = nlohmann::json;

enum RouteType {
    NEAREST_NEIGHBOUR,
    BRUTE_FORCE
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
    std::vector<std::string> getGoogleMapLinks(const RouteType route, const std::string& bearerToken, const Address addressType);
    
    CognitoTokens authenticate(const std::string& username, const std::string& password) const;
    std::string login(const std::string& username, const std::string& password);

private:
    httplib::Client cli;
    httplib::Headers buildHeaders(const std::string& bearer) const;
    json convertCoordinatesToJson(const std::vector<std::pair<double, double>>& coordinates) const;
    json getDistanceMatrix(const json& body) const;
    std::vector<std::pair<double, double>> getBestRouteBruteForce(const json& distanceMatrix) const;
    std::string convertRouteToGoogleMapsLink(const std::vector<std::pair<double, double>>& route) const;
    std::string runPythonAuth(const std::string& username, const std::string& password) const;
    bool isAuthenticated() const;
    std::pair<double, double> getStartingLocation(const std::string& bearerToken, Address addressType);
};