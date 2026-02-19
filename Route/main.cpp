#include "ApiClient.h"
#include "Dashboard.h"

int main() {
    ApiClient apiClient("www.secure-servelegal.co.uk");
    Dashboard dashboard(apiClient);

    dashboard.start();
    return 0;
}