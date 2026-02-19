#include "Dashboard.h"
#include <iostream>
#include <thread>
#include <chrono>

using namespace std;

Dashboard::Dashboard(ApiClient& apiClient) : apiClient(apiClient) {}

void Dashboard::start() {
    string bearer;
    cout << "Enter your bearer token: ";
    cin >> bearer;

    int choice;
    while (true) {
        displayMenu();
        cin >> choice;

        if (choice == 1) {
            handleViewTotalMoney(bearer);
        }
        else if (choice == 2) {
            handleGetRoute();
        }
        else {
            exit(0);
        }

        this_thread::sleep_for(chrono::milliseconds(100));
        cin.clear();
    }
}

void Dashboard::displayMenu() const {
    cout << "\nWelcome to the dashboard!\n"
        << "1. View total money earnt\n"
        << "2. Get optimal route\n";
}

void Dashboard::handleViewTotalMoney(const std::string& bearer) {
    float totalMoney = apiClient.getTotalMoneyEarnt(bearer);
    cout << "Total money earnt: " << totalMoney << "\n";
}

void Dashboard::handleGetRoute() const {
    cout << "Optimal route feature coming soon!\n";
}

