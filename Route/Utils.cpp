#include "Utils.h"


namespace Utils {
     std::string readBearerToken(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            std::cerr << "Failed to open bearer token file: " << filename << std::endl;
            return "";
        }
        std::string token;
        std::getline(file, token);
        return token;
    }
}
