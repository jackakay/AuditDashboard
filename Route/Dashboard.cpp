#include "Dashboard.h"
#include <iostream>
#include <thread>
#include <chrono>

using namespace std;

Dashboard::Dashboard(ApiClient& apiClient) : apiClient(apiClient) {}

void Dashboard::start() {
    

    int choice;
    while (true) {
        displayMenu();
        cin >> choice;

        if (choice == 1) {
            handleViewTotalMoney(false);
        }
        else if (choice == 2) {
            handleViewTotalMoney(true);
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
        << "2. View total money pending\n"
        << "3. Get optimal route\n";
}

void Dashboard::handleViewTotalMoney(bool isPending) {
    float totalMoney = apiClient.getTotalMoneyEarnt(isPending);
    cout << "Total money earnt: " << totalMoney << "\n";
}

void Dashboard::handleGetRoute() const {
    cout << "Optimal route feature coming soon!\n";
}

