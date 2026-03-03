#include "ApiClient.h"
#include <iostream>

const float HOLIDAY_PAY = 1.12;
const std::string OPENROUTE_API = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU2NTIwMzgxMGRiZTQ2NmU5MDg2MTY2OGUwM2I0OWE4IiwiaCI6Im11cm11cjY0In0=";

ApiClient::ApiClient(const std::string& host, const std::string& bearer)
    : cli(host)
{
    headers = buildHeaders(bearer);
    cli.set_follow_location(true);
    cli.set_read_timeout(10);
    cli.set_write_timeout(10);
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



float ApiClient::getTotalMoneyEarnt(bool pendingMoney = false) {

    const std::string basePath = pendingMoney ? "/api/v3/audits?status=assigned" : "/api/v3/audits?limit=200&status=approved,approving_query,submitted,client_query";
    auto headers = ApiClient::headers;
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

std::string ApiClient::getName() {
    auto res = cli.Get("/api/v1/auditors/me", headers);
    
    if (!res || res->status != 200) {
        std::cerr << "Failed to get auditor info\n";
        return "";
    }
    
    json j = json::parse(res->body);
    return j["preferred_name"].get<std::string>();
}


std::vector<std::string> ApiClient::getGoogleMapLinks(const std::string& bearer, RouteType route = RouteType::NEAREST_NEIGHBOUR) {
    std::vector<std::string> links = { };
    int count{ 0 };
    //for all we can just calculate the distance matrix. using distancematrix.ai we can work it all out from there
    //to-do: need to figure out how big of an api request we can make, and figure out how to do it.

    // i will be using this api https://openrouteservice.org/dev/#/api-docs

    const std::string basePath = "/api/v3/audits?status=assigned";
    auto headers = ApiClient::headers;
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

    for (const auto& audit : j["items"]) {
        auto coords = audit["site_coordinates"];
        coordinatePairs.emplace_back(coords["lng"].get<double>(), coords["lat"].get<double>());
    } // now we have all pairs of coordinates left over

    //send distance matrix request to api, get back the distance matrix, and then we can work out the routes from there.

    json distanceMatrix = getDistanceMatrix(convertCoordinatesToJson(coordinatePairs));




    switch (route) {
        case RouteType::NEAREST_NEIGHBOUR:
            // ...
            break;
        case RouteType::BRUTE_FORCE:
            // ...
            //we compute the distance between each element, find the total time for all nodes, and repeat
            // and keep finding the minimum between the current minimum, and the one we just worked out, until all permutations are complete.
            //only really works < 10.
            break;
    }

    return links;
}

json ApiClient::convertCoordinatesToJson(const std::vector<std::pair<double, double>>& coordinates) const {
    json body;
    body["locations"] = json::array();

    for (const auto& [lng, lat] : coordinates) {
        if (lat >= 52.0 && lat <= 53.0 && lng >= -2.0 && lng <= -1.0) {
            body["locations"].push_back({lng, lat});
        }
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

    

    if (!res || res->status != 200) {
        std::cerr << "Failed to get distance matrix\n";
        return {};
    }
    return json::parse(res->body);
}

