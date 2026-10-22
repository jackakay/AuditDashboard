#include "ApiClient.h"
#include "Dashboard.h"
#include "Utils.h"
using namespace std;

int main() {
    try {
        Utils::Utils::loadDotEnv(".env");   
        ApiClient apiClient("www.secure-servelegal.co.uk");
        Dashboard dashboard(apiClient);
        
        dashboard.start();
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
}