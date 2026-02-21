#include "ApiClient.h"
#include "Dashboard.h"
using namespace std;

int main() {
    string bearer;
    cout << "Enter your bearer token: ";
    cin >> bearer;
    ApiClient apiClient("www.secure-servelegal.co.uk", bearer);
    Dashboard dashboard(apiClient);

    dashboard.start();
    return 0;
}