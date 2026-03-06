#include "ApiClient.h"
#include "Dashboard.h"
#include "Utils.h"
using namespace std;

int main() {
    string bearer = Utils::readBearerToken("bearer.txt");
    ApiClient apiClient("www.secure-servelegal.co.uk", bearer);
    Dashboard dashboard(apiClient);

    dashboard.start();
    return 0;
}