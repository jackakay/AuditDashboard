#pragma once
#include "ApiClient.h"
#include <string>

class Dashboard {
public:
    explicit Dashboard(ApiClient& apiClient);
    void start();

private:
    ApiClient& apiClient;
    void displayMenu() const;
    void handleViewTotalMoney(const std::string& bearer);
    void handleGetRoute() const;
};