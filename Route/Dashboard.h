#pragma once
#include "ApiClient.h"
#include <string>
#include <fstream>
#include <sstream>

class Dashboard {
public:
    explicit Dashboard(ApiClient& apiClient);
    void start(int port = 8080);

private:
    ApiClient& apiClient;

    httplib::Server svr;
    void registerRoutes();
    std::string loadFile(const std::string& path) const;
    std::string convertRouteToGoogleMapsLink(const std::vector<Audit>& route) const;
    std::string generateAuditRouteReport(const std::vector<Audit>& audits); 
};