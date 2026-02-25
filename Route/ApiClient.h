#pragma once
#include "httplib.h"
#include "json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;

enum RouteType {
    NEAREST_NEIGHBOUR,
    BRUTE_FORCE
};

class ApiClient {
public:
    explicit ApiClient(const std::string& host, const std::string& bearer);
    float getTotalMoneyEarnt(bool pending);
    std::string getName();
    std::vector<std::string> getGoogleMapLinks(const std::string& bearer, RouteType route);
    httplib::Headers headers;

private:
    httplib::Client cli;
    httplib::Headers buildHeaders(const std::string& bearer) const;
    
};