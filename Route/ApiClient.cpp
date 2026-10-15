#include "ApiClient.h"
#include <iostream>

#if defined(_WIN32) || defined(_WIN64)
    // Windows already has _popen and _pclose, keep them or alias if needed
#else
    // Linux / macOS: Create aliases so Windows-style names work here too
    #define _popen popen
    #define _pclose pclose
#endif

const float HOLIDAY_PAY = 1.12f;
const std::string OPENROUTE_API = "";

ApiClient::ApiClient(const std::string& host)
    : cli(host)
{
    cli.set_follow_location(true);
    cli.set_read_timeout(10);
    cli.set_write_timeout(10);
}
std::string ApiClient::login(const std::string& username, const std::string& password) {
    CognitoTokens tokens = authenticate(username, password);
    return tokens.id_token;
}

httplib::Headers ApiClient::buildHeaders(const std::string& bearer) const {
    return {
        { "Accept", "application/json, text/plain, */*" },
        { "Accept-Language", "en-GB,en-US;q=0.9,en;q=0.8" },
        { "Authorization", "Bearer " + bearer },
        { "User-Agent", "Mozilla/5.0" },
        { "Referer", "https://www.secure-servelegal.co.uk/audits?status=assigned" }//is this wrong?
    };
}

float ApiClient::getTotalMoneyEarnt(bool pendingMoney, const std::string& bearerToken){
    if (bearerToken.empty()) throw std::runtime_error("Not authenticated");
    const std::string basePath = pendingMoney ? "/api/v3/audits?status=assigned" : "/api/v3/audits?limit=200&status=approved,approving_query,submitted,client_query";
    auto headers = buildHeaders(bearerToken);
    auto res = cli.Get(basePath.c_str(), headers);

    if (!res) {
        std::cerr << "Request failed (network/SSL error)\n";
        return 0.0f;
    }
    if (res->status != 200) {
        std::cerr << "HTTP error: " << res->status << "\n";
        std::cerr << res->body << "\n";
        return 0.0f;
    }

    json j = json::parse(res->body);
    
    int numPages = j["pages"].get<int>();
    float totalPay = 0.0f;

    for (int page = 1; page <= numPages; ++page) {
        std::string pagedPath = basePath + "&page=" + std::to_string(page);
        auto pageRes = cli.Get(pagedPath.c_str(), headers);

        if (!pageRes || pageRes->status != 200)
            continue;

        json pageJson = json::parse(pageRes->body);

        for (const auto& audit : pageJson["items"]) {
            if (!pendingMoney) totalPay += audit["total_pay"].get<float>();
            else totalPay += audit["auditor_pay_per_audit"].get<float>() * HOLIDAY_PAY;
        }
    }

    return totalPay;
}

std::string ApiClient::getName(const std::string& bearerToken) {
    if (bearerToken.empty()) throw std::runtime_error("Not authenticated");
    auto headers = buildHeaders(bearerToken);
    auto res = cli.Get("/api/v1/auditors/me", headers);
    
    if (!res || res->status != 200) {
        std::cerr << "Failed to get auditor info\n";
        return "";
    }
    
    json j = json::parse(res->body);
    return j["preferred_name"].get<std::string>();
}


std::vector<std::string> ApiClient::getGoogleMapLinks(const RouteType route = RouteType::NEAREST_NEIGHBOUR, const std::string& bearerToken = "", const Address addressType = Address::HOME) {
    if (bearerToken.empty()) throw std::runtime_error("Not authenticated");
    std::vector<std::string> links = { };
    int count{ 0 };
    //for all we can just calculate the distance matrix. using distancematrix.ai we can work it all out from there
    //to-do: need to figure out how big of an api request we can make, and figure out how to do it.

    // i will be using this api https://openrouteservice.org/dev/#/api-docs

    const std::string basePath = "/api/v3/audits?status=assigned";
    auto headers = buildHeaders(bearerToken);
    auto res = cli.Get(basePath.c_str(), headers);

    if (!res) {
        std::cerr << "Request failed (network/SSL error)\n";
        return {};
    }

    if (res->status != 200) {
        std::cerr << "HTTP error: " << res->status << "\n";
        std::cerr << res->body << "\n";
        return {};
    }

    json j = json::parse(res->body);
    std::vector<std::pair<double, double>> coordinatePairs;
    coordinatePairs.push_back(getStartingLocation(bearerToken, addressType)); // add the start location as the first element in the list of coordinates
    std::cout << "Audit locations succesfully found.\n";
    for (const auto& audit : j["items"]) {
        auto coords = audit["site_coordinates"];
        coordinatePairs.emplace_back(coords["lng"].get<double>(), coords["lat"].get<double>());
    } // now we have all pairs of coordinates left over

    //send distance matrix request to api, get back the distance matrix, and then we can work out the routes from there.

    json distanceMatrix = getDistanceMatrix(convertCoordinatesToJson(coordinatePairs));
    DistanceMatrix mat = DistanceMatrix(distanceMatrix);

    switch (route) {
        case RouteType::NEAREST_NEIGHBOUR:
            // ...
            break;
        case RouteType::BRUTE_FORCE: {
            // ...
            //we compute the distance between each element, find the total time for all nodes, and repeat
            // and keep finding the minimum between the current minimum, and the one we just worked out, until all permutations are complete.
            //only really works < 10.

            //We need to add a constant start/end point
            std::vector<std::pair<double, double>> bestRoute = getBestRouteBruteForce(mat);
            links.push_back(convertRouteToGoogleMapsLink(bestRoute));
            break;
        }
        case RouteType::HELD_KARP: {
            std::vector<std::pair<double, double>> bestRoute = HeldKarp::solve(mat);
            links.push_back(convertRouteToGoogleMapsLink(bestRoute));
            break;
        }
        default:
            break;

    }

    return links;
}

std::vector<std::pair<double, double>> ApiClient::getBestRouteBruteForce(DistanceMatrix m) const {
    // Index 0 is strictly reserved as the start and end
    int numLocations = m.size();
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
        double firstLeg = m.getTime(0, middleStops[0]);
        if (firstLeg == INF) continue;
        currentDuration += firstLeg;

        // B. Cost between all intermediate middle stops
        for (size_t i = 0; i < middleStops.size() - 1; ++i) {
            double leg = m.getTime(middleStops[i], middleStops[i + 1]);
            if (leg == INF) {
                validPath = false;
                break;
            }
            currentDuration += leg;
        }
        if (!validPath) continue;

        // C. Cost from the last middle stop back to Start (0)
        double lastLeg = m.getTime(middleStops.back(), 0);
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
    std::vector<std::pair<double, double>> bestRouteCoords;

    // Add Start Location
    bestRouteCoords.push_back(m.getCoords(0));

    // Add winning middle stops in their optimal order
    for (int idx : bestPathIndices) {
        bestRouteCoords.push_back(m.getCoords(idx));
    }

    // Add End Location (same as Start)
    bestRouteCoords.push_back(m.getCoords(0));

    return bestRouteCoords;
}

std::string ApiClient::convertRouteToGoogleMapsLink(const std::vector<std::pair<double, double>>& route) const {
    std::string link = "https://www.google.com/maps/dir/";
    for (const auto& [lng, lat] : route) {
        link += std::to_string(lat) + "," + std::to_string(lng) + "/";
    }
    return link;
}

json ApiClient::convertCoordinatesToJson(const std::vector<std::pair<double, double>>& coordinates) const {
    json body;
    body["locations"] = json::array();

    for (const auto& [lng, lat] : coordinates) {
        body["locations"].push_back({lng, lat}); 
    }
    return body;
}
json ApiClient::getDistanceMatrix(const json& body) const {
    
    httplib::Client cli("api.openrouteservice.org");
    cli.set_follow_location(true);

    auto headers = httplib::Headers {
        { "Accept", "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8" },
        { "Authorization", OPENROUTE_API}
    };
    
    auto res = cli.Post("/v2/matrix/driving-car", headers, body.dump(), "application/json");
    std::cout << body.dump() << std::endl;
    std::cout << res << std::endl;
    if (!res || res->status != 200) {
        std::cerr << "Failed to get distance matrix\n";
        return {};
    }
    return json::parse(res->body);
}

DistanceMatrix getMatrix(const json& body){
    return DistanceMatrix(body);
}

std::string ApiClient::runPythonAuth(const std::string& username, const std::string& password) const {
    std::string cmd = "python3 ./Auth.py " + username + " " + password;

    // Open pipe to python script
    FILE* pipe = _popen(cmd.c_str(), "r");
    if (!pipe) throw std::runtime_error("Failed to run auth script");

    // Read stdout
    std::string result;
    char buffer[256];
    while (fgets(buffer, sizeof(buffer), pipe)) {
        result += buffer;
    }

    int exitCode = _pclose(pipe);
    if (exitCode != 0) throw std::runtime_error("Auth script failed");

    return result;
}

CognitoTokens ApiClient::authenticate(const std::string& username, const std::string& password) const {
    std::string output = runPythonAuth(username, password);
    json j = json::parse(output);

    if (j.contains("error")) {
        throw std::runtime_error("Auth error: " + j["error"].get<std::string>());
    }
    std::cout << j["access_token"].get<std::string>() << "\n";
    return CognitoTokens{
        j["access_token"],
        j["id_token"],
        j["refresh_token"]
    };
}

std::pair<double, double> ApiClient::getStartingLocation(const std::string& bearerToken, Address addressType)  {
    if (bearerToken.empty()) throw std::runtime_error("Not authenticated");
    
    httplib::Headers headers = buildHeaders(bearerToken);
    auto res = cli.Get("/api/v1/auditors/me", headers);
    
    if (!res || res->status != 200) {
        std::cerr << "Failed to get auditor info\n";
        return {0.0, 0.0};
    }
    
    json j = json::parse(res->body);
    if(addressType == Address::TERM){
        double lat = j["term_coordinates"]["lat"].get<double>();
        double lng = j["term_coordinates"]["lng"].get<double>();
        std::cout << "Term coordinates: " << lat << ", " << lng << "\n";
        return {lng, lat};
    }
    double lat = j["home_coordinates"]["lat"].get<double>();
    double lng = j["home_coordinates"]["lng"].get<double>();
    std::cout << "Home coordinates: " << lat << ", " << lng << "\n";
    return {lng, lat};
}

