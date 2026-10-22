#include "Dashboard.h"
#include <iostream>

Dashboard::Dashboard(ApiClient& client) : apiClient(client) {
    registerRoutes();
}

void Dashboard::start(int port) {
    std::cout << "Dashboard running at http://localhost:" << port << "\n";
    const char* port_env = std::getenv("PORT");
    int portFromEnv = port_env ? std::stoi(port_env) : port;
    svr.listen("0.0.0.0", portFromEnv);
}

void Dashboard::registerRoutes() {

    // Serve the frontend
    svr.set_mount_point("/static", "./static");

    svr.Get("/", [this](const httplib::Request&, httplib::Response& res) {
        res.set_content(loadFile("static/index.html"), "text/html");
    });

    //Must be called first
    svr.Post("/api/login", [this](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        try {
            auto body = json::parse(req.body);
            std::string username = body["username"];
            std::string password = body["password"];

            std::string bearerToken = apiClient.login(username, password);  // authenticate and store tokens

            res.set_content(json{{"success", true}, {"bearer", bearerToken}}.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 401;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });
    
    svr.Get("/api/earnings", [this](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        try {
            const std::string bearerToken = req.get_header_value("Authorization");
            bool pending = req.get_param_value("pending") == "true";
            float total = apiClient.getTotalMoneyEarnt(pending, bearerToken);
            json j = { {"total", total} };
            res.set_content(j.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    svr.Get("/api/name", [this](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        try {
            const std::string bearerToken = req.get_header_value("Authorization");
            json j = { {"name", apiClient.getName(bearerToken)} };
            res.set_content(j.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    svr.Post("/api/route", [this](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        try {
            std::string type = req.get_param_value("type");
            

            json data = json::parse(req.body);
            
            RouteType route;
            if(type == "brute") route = RouteType::BRUTE_FORCE;
            else if(type=="heldkarp") route = RouteType::HELD_KARP;
            else route = RouteType::NEAREST_NEIGHBOUR;
            const std::string bearerToken = req.get_header_value("Authorization");

            Address addressType = (req.get_param_value("address") == "home") ? HOME : TERM;
            std::vector<Audit> bestRoute = apiClient.getRoute(route, bearerToken, req.body,  addressType); //arrives in the order of optimality.
            std::vector<std::string> links;
            links.push_back(convertRouteToGoogleMapsLink(bestRoute));
            json j = { {"links", links}, {"report", generateAuditRouteReport(bestRoute)} };
            res.set_content(j.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 500;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });
}

std::string Dashboard::loadFile(const std::string& path) const {
    std::ifstream file(path);
    if (!file.is_open()) return "<h1>index.html not found</h1>";
    std::ostringstream ss;
    ss << file.rdbuf();
    return ss.str();
}



std::string Dashboard::convertRouteToGoogleMapsLink(const std::vector<Audit>& route) const {
    std::string link = "https://www.google.com/maps/dir/";
    for (const auto& a : route) {
        link += std::to_string(a.coords.second) + "," + std::to_string(a.coords.first) + "/";
    }
    return link;
}

std::string Dashboard::generateAuditRouteReport(const std::vector<Audit>& audits) {
    std::ostringstream ss;

    // Header block
    ss << "========================================\r\n";
    ss << "           SELECTED AUDIT ROUTE         \r\n";
    ss << "========================================\r\n\r\n";

    for (size_t i = 0; i < audits.size(); ++i) {
        const auto& audit = audits[i];

        ss << "Stop #" << (i + 1) << "\r\n";
        ss << "----------------------------------------\r\n";
        ss << "Site Name:     " << (audit.site_name.empty() ? "N/A" : audit.site_name) << "\r\n";
        ss << "Post Code:     " << (audit.site_post_code.empty() ? "N/A" : audit.site_post_code) << "\r\n";
        ss << "Client:        " << (audit.client_name.empty() ? "N/A" : audit.client_name) << "\r\n";
        ss << "Internal ID:   " << (audit.internal_id.empty() ? "N/A" : audit.internal_id) << "\r\n";
        ss << "Deadline:      " << (audit.deadline_date.empty() ? "N/A" : audit.deadline_date) << "\r\n";
        
        // Format the monetary value to 2 decimal places
        ss << std::fixed << std::setprecision(2);
        ss << "Pay (Inc. Hol): £" << audit.auditor_pay_per_audit << "\r\n\r\n";
    }

    return ss.str();
}