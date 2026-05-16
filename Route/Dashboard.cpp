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
    svr.Get("/", [this](const httplib::Request&, httplib::Response& res) {
        res.set_content(loadFile("index.html"), "text/html");
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

    svr.Get("/api/route", [this](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        try {
            std::string type = req.get_param_value("type");
            RouteType route = (type == "brute") ? BRUTE_FORCE : NEAREST_NEIGHBOUR;
            const std::string bearerToken = req.get_header_value("Authorization");
            auto links = apiClient.getGoogleMapLinks(route, bearerToken);
            json j = { {"links", links} };
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